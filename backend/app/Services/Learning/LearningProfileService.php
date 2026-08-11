<?php

namespace App\Services\Learning;

use App\Models\ActivityLog;
use App\Models\LessonChatLog;
use App\Models\PracticeAttempt;
use App\Models\Question;
use App\Models\QuizResult;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * Learner Profile & Adaptation — trait derivation service.
 *
 * Every trait value lives on a single numeric scale: [-1, 1].
 * Semantics per trait (positive end → negative end):
 *   - pacing:              fast / rapid → slow / deliberate
 *   - mastery_habit:       retry-until-mastery → one-and-done
 *   - difficulty_appetite: prefers challenge → prefers easy
 *   - help_seeking:        asks AI tutor readily → self-reliant
 *   - study_regularity:    studies consistently → sporadic
 *
 * Behavioral normalization:
 *   - scale mapping for each metric is defined below per trait.
 *   - with > 5 samples: (x − median) / IQR, clamped to [-1, 1].
 *   - with ≤ 5 samples: min/max normalization, clamped to [-1, 1].
 *   - null data, zero attempts, or missing required fields => "no data"
 *     (trait source is null) — never a fabricated 0-value.
 *
 * Per-trait source merge (evaluated PER TRAIT, not globally):
 *   - behavior data meets the threshold  => source "behavior"
 *   - else self-report answer exists     => source "self_report"
 *   - else                               => source null (no data)
 *
 * The student_profiles.learning_profile column stores ONLY the self-report
 * seed ({ self_report: {...}, schema_version, updated_at }). Behavioral
 * traits are always derived live at read time and merged on top, so a stale
 * stored value can never be served.
 */
class LearningProfileService
{
    public const SCHEMA_VERSION = 1;

    /** Self-report questions: option index => scale value in [-1, 1]. */
    private const SELF_REPORT_OPTIONS = [
        'pacing'              => [0.7, 0.1, -0.7, 0.0],
        'mastery_habit'       => [0.8, 0.3, -0.5, 0.0],
        'difficulty_appetite' => [0.7, 0.1, -0.7, 0.0],
        'help_seeking'        => [0.7, 0.2, -0.6, 0.0],
        'study_regularity'    => [0.9, 0.3, -0.4, -0.9],
    ];

    private const TRAITS = [
        'pacing', 'mastery_habit', 'difficulty_appetite', 'help_seeking', 'study_regularity',
    ];

    /** Minimum behavioral data per trait before it counts as "has data". */
    private const THRESHOLD_PACING_SAMPLES        = 10;
    private const THRESHOLD_MASTERY_QUIZZES        = 3;
    private const THRESHOLD_MASTERY_DISTINCT_LESSONS = 2;
    private const THRESHOLD_DIFFICULTY_ATTEMPTS    = 10;
    private const THRESHOLD_DIFFICULTY_LEVELS      = 2;
    private const THRESHOLD_HELP_CHATS              = 5;
    private const THRESHOLD_REGULARITY_DAYS         = 5;
    private const REGULARITY_WINDOW_DAYS            = 14;

    /**
     * Analyze a single student (student-facing + teacher single-student).
     *
     * @return array{traits:array<string,array{value:?float,source:?string,confidence:float}>,recommended_difficulty:?string,schema_version:int,updated_at:string}
     */
    public function analyze(User $student): array
    {
        $behavior   = $this->collectBehavior($student->id)[$student->id] ?? [];
        $selfReport = $this->loadSelfReport($student->id);

        return $this->buildProfile($behavior, $selfReport);
    }

    /**
     * Analyze many students in ONE pass (batch, for the teacher roster).
     * Signal tables are queried once with whereIn(student_ids) and grouped
     * in PHP — not N+1 per student.
     *
     * @return array<int, array> keyed by student_id
     */
    public function analyzeMany(Collection $students): array
    {
        $ids = $students->pluck('id')->filter()->map(fn ($id) => (int) $id)->values()->all();
        if (empty($ids)) {
            return [];
        }

        $behaviorMap   = $this->collectBehaviorBatch($ids);
        $selfReportMap = $this->loadSelfReportBatch($ids);

        $profiles = [];
        foreach ($students as $student) {
            $profiles[(int) $student->id] = $this->buildProfile(
                $behaviorMap[(int) $student->id] ?? [],
                $selfReportMap[(int) $student->id] ?? null
            );
        }

        return $profiles;
    }

    // ── Profile assembly ──────────────────────────────────────────

    /**
     * @param array<string,mixed> $behavior
     * @param array<string,float>|null $selfReport
     */
    private function buildProfile(array $behavior, ?array $selfReport): array
    {
        $traits = [];
        foreach (self::TRAITS as $trait) {
            $traits[$trait] = $this->deriveTrait($trait, $behavior, $selfReport);
        }

        $appetite = $traits['difficulty_appetite']['value'] ?? null;
        $recommended = $appetite === null
            ? null
            : ($appetite <= -0.33 ? 'Easy' : ($appetite >= 0.33 ? 'Hard' : 'Medium'));

        return [
            'traits'                 => $traits,
            'recommended_difficulty' => $recommended,
            'schema_version'         => self::SCHEMA_VERSION,
            'updated_at'             => now()->toISOString(),
        ];
    }

    /**
     * Derive a single trait. Behavior wins when its threshold is met;
     * otherwise fall back to the self-report seed; otherwise null.
     *
     * @param array<string,mixed> $behavior
     * @param array<string,float>|null $selfReport
     * @return array{value:?float,source:?string,confidence:float}
     */
    private function deriveTrait(string $trait, array $behavior, ?array $selfReport): array
    {
        $behaviorResult = $this->behavioralValue($trait, $behavior);

        if ($behaviorResult !== null) {
            [$value, $confidence] = $behaviorResult;
            return ['value' => $value, 'source' => 'behavior', 'confidence' => round($confidence, 3)];
        }

        $answer = $selfReport[$trait] ?? null;
        if (is_numeric($answer)) {
            return ['value' => (float) $answer, 'source' => 'self_report', 'confidence' => 0.3];
        }

        return ['value' => null, 'source' => null, 'confidence' => 0.0];
    }

    /**
     * Compute the behavioral value + confidence for a trait, or null when the
     * trait has insufficient behavioral data.
     *
     * @param array<string,mixed> $behavior
     * @return array{0:float,1:float}|null [value, confidence]
     */
    private function behavioralValue(string $trait, array $behavior): ?array
    {
        switch ($trait) {
            case 'pacing':
                return $this->behaviorPacing($behavior);
            case 'mastery_habit':
                return $this->behaviorMasteryHabit($behavior);
            case 'difficulty_appetite':
                return $this->behaviorDifficultyAppetite($behavior);
            case 'help_seeking':
                return $this->behaviorHelpSeeking($behavior);
            case 'study_regularity':
                return $this->behaviorStudyRegularity($behavior);
        }

        return null;
    }

    // ── Per-trait behavioral rules ────────────────────────────────

    /**
     * Pacing: mean seconds-per-question across attempts.
     * value = normalize(secondsPerQuestion) then inverted, so faster = +1.
     *
     * @param array<string,mixed> $behavior
     * @return array{0:float,1:float}|null
     */
    private function behaviorPacing(array $behavior): ?array
    {
        $samples = $behavior['pacing_seconds_per_question'] ?? [];
        if (count($samples) < self::THRESHOLD_PACING_SAMPLES) {
            return null;
        }

        $mean = array_sum($samples) / count($samples);
        $normalized = $this->normalizeInverse($samples, $mean);

        $confidence = min(1.0, count($samples) / self::THRESHOLD_PACING_SAMPLES);

        return [$normalized, $confidence];
    }

    /**
     * Mastery habit: does the student retake quizzes until mastery?
     *   retakeRate  = lessons with >= 2 attempts / distinct lessons quizzed
     *   improvement = mean((last - first) / 100) over retaken lessons
     *   value = clamp(0.5 * (2*retakeRate - 1) + 0.5 * improvement)
     *
     * @param array<string,mixed> $behavior
     * @return array{0:float,1:float}|null
     */
    private function behaviorMasteryHabit(array $behavior): ?array
    {
        $attempts = $behavior['quiz_attempts'] ?? [];
        $count = count($attempts);
        $distinctLessons = count($behavior['quiz_distinct_lessons'] ?? []);

        if ($count < self::THRESHOLD_MASTERY_QUIZZES || $distinctLessons < self::THRESHOLD_MASTERY_DISTINCT_LESSONS) {
            return null;
        }

        // Group attempts by lesson, ordered by attempt_number.
        $byLesson = [];
        foreach ($attempts as $a) {
            $byLesson[$a['lesson_id']][] = (float) $a['score'];
        }

        $retaken = 0;
        $improvements = [];
        foreach ($byLesson as $scores) {
            $scores = array_values($scores);
            if (count($scores) >= 2) {
                $retaken++;
                $improvements[] = (end($scores) - $scores[0]) / 100;
            }
        }

        $retakeRate = $byLesson === [] ? 0 : $retaken / count($byLesson);
        $avgImprovement = $improvements === [] ? 0 : array_sum($improvements) / count($improvements);

        $value = $this->clamp(0.5 * (2 * $retakeRate - 1) + 0.5 * $avgImprovement);

        $confidence = min(1.0, $count / self::THRESHOLD_MASTERY_QUIZZES);

        return [$value, $confidence];
    }

    /**
     * Difficulty appetite: accuracy on hard vs easy practice questions.
     * value = clamp(acc_hard - acc_easy). Requires enough attempts spanning
     * >= 2 difficulty levels.
     *
     * @param array<string,mixed> $behavior
     * @return array{0:float,1:float}|null
     */
    private function behaviorDifficultyAppetite(array $behavior): ?array
    {
        $attempts = $behavior['practice_attempts'] ?? [];
        $levelsPresent = $behavior['difficulty_levels_present'] ?? [];

        if (count($attempts) < self::THRESHOLD_DIFFICULTY_ATTEMPTS
            || count($levelsPresent) < self::THRESHOLD_DIFFICULTY_LEVELS) {
            return null;
        }

        $acc = [];
        foreach ($attempts as $a) {
            $d = $a['difficulty'] ?? null;
            if (!$d) {
                continue;
            }
            $acc[$d]['correct'] = ($acc[$d]['correct'] ?? 0) + ($a['correct'] ? 1 : 0);
            $acc[$d]['total']   = ($acc[$d]['total'] ?? 0) + 1;
        }

        $rate = function (string $level) use ($acc): ?float {
            $cell = $acc[$level] ?? null;
            if (!$cell || $cell['total'] === 0) {
                return null;
            }
            return $cell['correct'] / $cell['total'];
        };

        $easy = $rate('easy');
        $hard = $rate('hard');

        // Require both extremes to make a defensible comparison; otherwise
        // fall back to medium vs easy (hard absent in this curriculum).
        if ($hard !== null && $easy !== null) {
            $value = $this->clamp($hard - $easy);
        } else {
            $medium = $rate('medium');
            $baseline = $easy ?? $medium ?? null;
            $upper    = $hard ?? $medium ?? null;
            if ($baseline === null || $upper === null || $baseline === $upper) {
                return null;
            }
            $value = $this->clamp($upper - $baseline);
        }

        $confidence = min(1.0, count($attempts) / self::THRESHOLD_DIFFICULTY_ATTEMPTS);

        return [$value, $confidence];
    }

    /**
     * Help seeking: volume of AI-tutor sessions.
     * value = clamp((chatCount - 5) / 10)  — 0 chats → -1 (self-reliant),
     * 5 → 0, 15+ → +1 (readily asks the AI tutor).
     *
     * @param array<string,mixed> $behavior
     * @return array{0:float,1:float}|null
     */
    private function behaviorHelpSeeking(array $behavior): ?array
    {
        $chatCount = (int) ($behavior['chat_count'] ?? 0);
        if ($chatCount < self::THRESHOLD_HELP_CHATS) {
            return null;
        }

        $value = $this->clamp(($chatCount - self::THRESHOLD_HELP_CHATS) / 10);

        return [$value, min(1.0, $chatCount / self::THRESHOLD_HELP_CHATS)];
    }

    /**
     * Study regularity: distinct active days in the trailing 14-day window.
     * value = clamp((days - 3.5) / 3.5)  — 0-1 days → -1 (sporadic),
     * 7+ days → +1 (consistent).
     *
     * @param array<string,mixed> $behavior
     * @return array{0:float,1:float}|null
     */
    private function behaviorStudyRegularity(array $behavior): ?array
    {
        $days = (int) ($behavior['active_days_14'] ?? 0);
        if ($days < self::THRESHOLD_REGULARITY_DAYS) {
            return null;
        }

        $value = $this->clamp(($days - 3.5) / 3.5);

        return [$value, min(1.0, $days / self::THRESHOLD_REGULARITY_DAYS)];
    }

    // ── Normalization helpers ─────────────────────────────────────

    /** (x − median)/IQR clamped to [-1,1]; min/max for <= 5 samples. */
    private function normalizeInverse(array $samples, float $value): float
    {
        $n = count($samples);
        if ($n === 1) {
            return 0.0;
        }

        if ($n <= 5) {
            $min = min($samples);
            $max = max($samples);
            if ($max === $min) {
                return 0.0;
            }
            // Invert so the smaller value (faster) maps toward +1.
            return $this->clamp(-1 + 2 * (($max - $value) / ($max - $min)));
        }

        sort($samples);
        $median = $samples[intdiv($n - 1, 2)];
        $lower = $samples[intdiv($n - 1, 4)];
        $upper = $samples[intdiv(3 * ($n - 1), 4)];
        $iqr = $upper - $lower;

        if ($iqr === 0.0) {
            return 0.0;
        }

        // Invert: high seconds-per-question (slow) → negative.
        return $this->clamp(-(($value - $median) / $iqr));
    }

    private function clamp(float $value): float
    {
        return max(-1.0, min(1.0, $value));
    }

    /**
     * Normalized answer comparison. Both sides must be scalar and non-null;
     * case and surrounding whitespace are ignored. Arrays (multi-select) and
     * nulls never match.
     */
    private function answersMatch(mixed $answer, mixed $correct): bool
    {
        if ($answer === null || $correct === null) {
            return false;
        }
        if (!is_scalar($answer) || !is_scalar($correct)) {
            return false;
        }
        return strtolower(trim((string) $answer)) === strtolower(trim((string) $correct));
    }

    // ── Behavior data collection (single student) ─────────────────

    /** @return array<string,mixed> */
    private function collectBehavior(int $studentId): array
    {
        $ids = [$studentId];

        $attempts = PracticeAttempt::where('student_id', $studentId)
            ->get(['id', 'student_id', 'time_spent_seconds', 'total_questions', 'answers', 'question_meta']);

        $quiz = QuizResult::where('student_id', $studentId)
            ->orderBy('attempt_number')
            ->get(['student_id', 'lesson_id', 'attempt_number', 'score']);

        $chatRows = LessonChatLog::where('student_id', $studentId)
            ->select('student_id')
            ->get();

        $activityRows = ActivityLog::where('user_id', $studentId)
            ->whereBetween('created_at', [now()->subDays(self::REGULARITY_WINDOW_DAYS), now()])
            ->select('user_id', 'created_at')
            ->get();

        return $this->shapeBehavior($attempts, $quiz, $chatRows, $activityRows, $ids);
    }

    // ── Behavior data collection (batch) ──────────────────────────

    /**
     * @param array<int> $ids
     * @return array<int, array<string,mixed>> keyed by student_id
     */
    private function collectBehaviorBatch(array $ids): array
    {
        $attempts = PracticeAttempt::whereIn('student_id', $ids)
            ->get(['id', 'student_id', 'time_spent_seconds', 'total_questions', 'answers', 'question_meta']);

        $quiz = QuizResult::whereIn('student_id', $ids)
            ->orderBy('attempt_number')
            ->get(['student_id', 'lesson_id', 'attempt_number', 'score']);

        $chatRows = LessonChatLog::whereIn('student_id', $ids)
            ->select('student_id')
            ->get();

        $activityRows = ActivityLog::whereIn('user_id', $ids)
            ->whereBetween('created_at', [now()->subDays(self::REGULARITY_WINDOW_DAYS), now()])
            ->select('user_id', 'created_at')
            ->get();

        return $this->shapeBehavior($attempts, $quiz, $chatRows, $activityRows, $ids);
    }

    /**
     * Shape raw rows into the per-student behavior structure used by the
     * per-trait rules. Batched activity/chat rows are grouped here.
     *
     * @param \Illuminate\Support\Collection $attempts
     * @param \Illuminate\Support\Collection $quiz
     * @param \Illuminate\Support\Collection $chatRows
     * @param \Illuminate\Support\Collection $activityRows
     * @param array<int> $ids
     * @return array<int, array<string,mixed>> keyed by student_id
     */
    private function shapeBehavior($attempts, $quiz, $chatRows, $activityRows, array $ids): array
    {
        $out = [];
        foreach ($ids as $id) {
            $out[$id] = [
                'pacing_seconds_per_question' => [],
                'quiz_attempts'               => [],
                'quiz_distinct_lessons'       => [],
                'practice_attempts'           => [],
                'difficulty_levels_present'   => [],
                'chat_count'                  => 0,
                'active_days_14'              => 0,
            ];
        }

        // Pacing + difficulty appetite.
        $questionIds = [];
        foreach ($attempts as $a) {
            $answers = is_array($a->answers) ? $a->answers : [];
            foreach (array_keys($answers) as $qid) {
                $questionIds[(int) $qid] = true;
            }
        }

        $questions = $questionIds === []
            ? collect()
            : Question::whereIn('id', array_keys($questionIds))
                ->get(['id', 'difficulty', 'correct_answer']);

        $questionsBy = [];
        foreach ($questions as $q) {
            $questionsBy[(int) $q->id] = $q;
        }

        foreach ($attempts as $a) {
            $sid = (int) $a->student_id;
            if ($a->total_questions > 0 && is_numeric($a->time_spent_seconds)) {
                $out[$sid]['pacing_seconds_per_question'][] =
                    (float) $a->time_spent_seconds / (float) $a->total_questions;
            }

            $meta = is_array($a->question_meta) ? $a->question_meta : [];
            if ($meta !== []) {
                // AI-generated attempts: difficulty/correctness are snapshotted
                // in question_meta, so no DB question lookup is needed.
                foreach ($meta as $m) {
                    $difficulty = (string) ($m['difficulty'] ?? 'medium');
                    $out[$sid]['difficulty_levels_present'][$difficulty] = true;
                    $out[$sid]['practice_attempts'][] = [
                        'difficulty' => $difficulty,
                        'correct'    => (bool) ($m['correct'] ?? false),
                    ];
                }
                continue;
            }

            $answers = is_array($a->answers) ? $a->answers : [];
            foreach ($answers as $qid => $answer) {
                $q = $questionsBy[(int) $qid] ?? null;
                if (!$q) {
                    continue;
                }
                $difficulty = $q->difficulty;
                $out[$sid]['difficulty_levels_present'][$difficulty] = true;
                $out[$sid]['practice_attempts'][] = [
                    'difficulty' => $difficulty,
                    'correct'    => $this->answersMatch($answer, $q->correct_answer),
                ];
            }
        }

        foreach ($out as &$b) {
            $b['difficulty_levels_present'] = array_keys($b['difficulty_levels_present']);
        }
        unset($b);

        // Mastery habit.
        foreach ($quiz as $r) {
            $sid = (int) $r->student_id;
            $out[$sid]['quiz_attempts'][] = [
                'lesson_id'    => (int) $r->lesson_id,
                'attempt_number' => (int) $r->attempt_number,
                'score'        => (float) $r->score,
            ];
            $out[$sid]['quiz_distinct_lessons'][(int) $r->lesson_id] = true;
        }

        foreach ($out as &$b) {
            $b['quiz_distinct_lessons'] = array_keys($b['quiz_distinct_lessons']);
        }
        unset($b);

        // Chat count.
        foreach ($chatRows as $row) {
            $out[(int) $row->student_id]['chat_count']++;
        }

        // Active days in the trailing window.
        foreach ($activityRows as $row) {
            $day = $row->created_at instanceof \DateTimeInterface
                ? $row->created_at->format('Y-m-d')
                : substr((string) $row->created_at, 0, 10);
            $out[(int) $row->user_id]['active_days'][] = $day;
        }
        foreach ($out as &$b) {
            $b['active_days_14'] = count(array_unique($b['active_days'] ?? []));
            unset($b['active_days']);
        }
        unset($b);

        return $out;
    }

    // ── Self-report seed storage ──────────────────────────────────

    /** @return array<string,float>|null stored seed answers */
    private function loadSelfReport(int $studentId): ?array
    {
        $profile = StudentProfile::where('student_id', $studentId)->first();
        if (!$profile || !is_array($profile->learning_profile)) {
            return null;
        }
        return $profile->learning_profile['self_report'] ?? null;
    }

    /** @param array<int> $ids @return array<int, array<string,float>|null> */
    private function loadSelfReportBatch(array $ids): array
    {
        $rows = StudentProfile::whereIn('student_id', $ids)->get(['student_id', 'learning_profile']);
        $out = [];
        foreach ($rows as $row) {
            $seed = is_array($row->learning_profile) ? ($row->learning_profile['self_report'] ?? null) : null;
            $out[(int) $row->student_id] = is_array($seed) ? $seed : null;
        }
        return $out;
    }

    /**
     * Persist the self-report seed answers.
     *
     * @param array<string,int> $optionIndexes trait => option index (0-3)
     * @return array<string,float> the normalized seed values saved
     */
    public function saveSelfReport(int $studentId, array $optionIndexes): array
    {
        $seed = [];
        foreach (self::TRAITS as $trait) {
            $idx = (int) ($optionIndexes[$trait] ?? 0);
            $idx = max(0, min(count(self::SELF_REPORT_OPTIONS[$trait]) - 1, $idx));
            $seed[$trait] = self::SELF_REPORT_OPTIONS[$trait][$idx];
        }

        StudentProfile::updateOrCreate(
            ['student_id' => $studentId],
            [
                'learning_profile' => [
                    'self_report'    => $seed,
                    'schema_version' => self::SCHEMA_VERSION,
                    'updated_at'     => now()->toISOString(),
                ],
            ]
        );

        return $seed;
    }

    /** @return array<string,int> number of answer options per trait */
    public function selfReportOptionCounts(): array
    {
        $counts = [];
        foreach (self::SELF_REPORT_OPTIONS as $trait => $values) {
            $counts[$trait] = count($values);
        }
        return $counts;
    }

    /** Trait labels shown to the UI (keys are stable contract identifiers). */
    public function traitMeta(): array
    {
        return [
            'pacing'              => ['label' => 'Pacing',              'positive' => 'Fast-paced',     'negative' => 'Deliberate'],
            'mastery_habit'       => ['label' => 'Mastery Habit',       'positive' => 'Retry-until-mastery', 'negative' => 'One-and-done'],
            'difficulty_appetite' => ['label' => 'Difficulty Appetite', 'positive' => 'Prefers challenge',   'negative' => 'Prefers easy'],
            'help_seeking'        => ['label' => 'Help-Seeking',        'positive' => 'Uses AI tutor',       'negative' => 'Self-reliant'],
            'study_regularity'    => ['label' => 'Study Regularity',    'positive' => 'Consistent',          'negative' => 'Sporadic'],
        ];
    }
}
