<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Services\EnrollmentGuard;
use App\Services\Mastery\MasteryCalculator;
use App\Models\ActivityLog;
use App\Models\Lesson;
use App\Models\QuizResult;
use App\Models\StudentLessonProgress;
use App\Models\User;
use App\Services\Quiz\QuestionGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class QuizController extends Controller
{
    public function __construct(
        private readonly QuestionGenerator $questionGenerator,
        private readonly EnrollmentGuard $enrollmentGuard,
        private readonly MasteryCalculator $masteryCalculator,
    ) {}

    /**
     * POST /api/student/lessons/{lesson}/quiz/generate
     *
     * Generate quiz questions for a lesson using AI.
     * Returns fresh questions each time (no caching — ensures unique attempts).
     */
    public function generate(Request $request, Lesson $lesson): JsonResponse
    {
        $student = $request->user();

        $denied = $this->enrollmentGuard->denyIfNotEnrolled($student, $lesson);
        if ($denied) return $denied;

        $maxAttempts = (int) config('quiz.max_attempts', 3);

        // Check attempt limit
        $attemptCount = QuizResult::where('student_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->count();

        if ($attemptCount >= $maxAttempts) {
            return response()->json(['error' => 'You have used all quiz attempts for this lesson.'], 403);
        }

        try {
            $result = $this->questionGenerator->generate($lesson, 'quiz', 5);

            return response()->json([
                'questions'     => $result['questions'],
                'source'        => $result['source'],
                'attempt_number' => $attemptCount + 1,
                'max_attempts'   => $maxAttempts,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }

    /**
     * POST /api/student/lessons/{lesson}/quiz/submit
     *
     * Submit quiz answers. Saves the result and updates mastery.
     *
     * Body: { answers: [0, 2, 1, 3, 0], questions: [...] }
     * - answers: array of selected option indices, keyed by question index
     * - questions: the generated questions array (needed to calculate score server-side)
     */
    public function submit(Request $request, Lesson $lesson): JsonResponse
    {
        $validated = $request->validate([
            'answers'            => 'required|array|min:1',
            'answers.*'          => 'integer|between:0,3',
            'questions'          => 'required|array|min:1',
            'questions.*.question'      => 'required|string',
            'questions.*.options'       => 'required|array|size:4',
            'questions.*.correct_index' => 'required|integer|between:0,3',
        ]);

        $student   = $request->user();
        $answers   = $validated['answers'];
        $questions = $validated['questions'];

        $denied = $this->enrollmentGuard->denyIfNotEnrolled($student, $lesson);
        if ($denied) return $denied;

        $maxAttempts = (int) config('quiz.max_attempts', 3);

        // Check attempt limit
        $attemptCount = QuizResult::where('student_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->count();

        if ($attemptCount >= $maxAttempts) {
            return response()->json(['error' => 'You have used all quiz attempts for this lesson.'], 403);
        }

        // Calculate score
        $correct = 0;
        foreach ($questions as $i => $q) {
            if (isset($answers[$i]) && $answers[$i] === $q['correct_index']) {
                $correct++;
            }
        }

        $total = count($questions);
        $score = $total > 0 ? (int) round(($correct / $total) * 100) : 0;

        // Save quiz result
        $quizResult = QuizResult::create([
            'student_id'       => $student->id,
            'lesson_id'        => $lesson->id,
            'attempt_number'   => $attemptCount + 1,
            'score'            => $score,
            'total_questions'  => $total,
            'correct_answers'  => $correct,
            'answers'          => $answers,
            'submitted_at'     => now(),
        ]);

        // Update lesson progress and mastery
        $this->updateLessonMastery($student->id, $lesson->id, $score);

        // Log quiz completion
        ActivityLog::create([
            'user_id'     => $student->id,
            'action'      => 'quiz_completed',
            'description' => "Student {$student->name} completed quiz for '{$lesson->title}' — Score: {$score}%",
        ]);

        // Get best score across all attempts
        $bestScore = QuizResult::where('student_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->max('score');

        $newAttemptCount = $attemptCount + 1;

        return response()->json([
            'quiz_result'     => $quizResult,
            'score'           => $score,
            'correct'         => $correct,
            'total'           => $total,
            'best_score'      => $bestScore,
            'attempt_number'  => $newAttemptCount,
            'attempts_left'   => $maxAttempts - $newAttemptCount,
            'mastery'         => $this->calculateMastery($bestScore),
        ]);
    }

    /**
     * GET /api/student/lessons/{lesson}/quiz/history
     *
     * Get quiz attempt history for a lesson.
     */
    public function history(Request $request, Lesson $lesson): JsonResponse
    {
        $student = $request->user();

        $denied = $this->enrollmentGuard->denyIfNotEnrolled($student, $lesson);
        if ($denied) return $denied;

        $attempts = QuizResult::where('student_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->orderBy('attempt_number')
            ->get();

        $bestScore = $attempts->max('score');

        // Get mastery from lesson progress
        $progress = StudentLessonProgress::where('student_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->first();

        return response()->json([
            'attempts'       => $attempts,
            'attempt_count'  => $attempts->count(),
            'max_attempts'   => $maxAttempts,
            'attempts_left'  => $maxAttempts - $attempts->count(),
            'best_score'     => $bestScore,
            'mastery'        => $progress?->mastery_percentage ?? 0,
        ]);
    }

    /**
     * Update lesson mastery based on the best quiz score.
     */
    private function updateLessonMastery(string $studentId, int $lessonId, int $latestScore): void
    {
        // Get best score across ALL attempts (including this one)
        $bestScore = QuizResult::where('student_id', $studentId)
            ->where('lesson_id', $lessonId)
            ->max('score');

        $mastery = $this->calculateMastery($bestScore);

        $progress = StudentLessonProgress::updateOrCreate(
            ['student_id' => $studentId, 'lesson_id' => $lessonId],
            [
                'status'             => $mastery === 100 ? 'completed' : 'in_progress',
                'mastery_percentage' => $mastery,
                'best_quiz_score'    => $bestScore,
                'completed_at'       => $mastery === 100 ? now() : null,
            ]
        );

        // Log topic mastery if just reached 100%
        if ($mastery === 100 && $progress->wasRecentlyCreated) {
            $lesson = Lesson::find($lessonId);
            $student = User::find($studentId);
            if ($lesson && $student) {
                ActivityLog::create([
                    'user_id'     => $studentId,
                    'action'      => 'topic_mastered',
                    'description' => "Student {$student->name} mastered topic '{$lesson->title}'",
                ]);
            }
        }
    }

    /**
     * Calculate mastery percentage from a quiz score.
     *
     * | Condition                      | Mastery |
     * |--------------------------------|---------|
     * | Quiz not attempted             | 0%      |
     * | Quiz attempted but score < 70% | 50%     |
     * | Quiz score >= 70%              | 100%    |
     */
    private function calculateMastery(?int $bestScore): int
    {
        return $this->masteryCalculator->calculateLessonMastery($bestScore);
    }
}