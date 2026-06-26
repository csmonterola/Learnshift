<?php

namespace App\Services\Mastery;

use App\Models\QuizResult;
use App\Models\StudentLessonProgress;
use App\Models\StudentTopicProgress;
use App\Models\Topic;
use Illuminate\Support\Facades\DB;

class MasteryCalculator
{
    public const THRESHOLD_PASS    = 70;
    public const MASTERY_NONE      = 0;
    public const MASTERY_ATTEMPTED = 50;
    public const MASTERY_COMPLETE  = 100;

    /**
     * Calculate mastery percentage from a best quiz score.
     *
     * | Condition                      | Mastery |
     * |--------------------------------|---------|
     * | Quiz not attempted (null)      | 0%      |
     * | Quiz attempted but score < 70% | 50%     |
     * | Quiz score >= 70%              | 100%    |
     */
    public function calculateLessonMastery(?int $bestScore): int
    {
        if ($bestScore === null) {
            return self::MASTERY_NONE;
        }
        $threshold = (int) config('quiz.pass_threshold', self::THRESHOLD_PASS);
        return $bestScore >= $threshold ? self::MASTERY_COMPLETE : self::MASTERY_ATTEMPTED;
    }

    /**
     * Calculate mastery percentage for a single lesson.
     *
     * | Condition                      | Mastery |
     * |--------------------------------|---------|
     * | Quiz not attempted             | 0%      |
     * | Quiz attempted but score < 70% | 50%     |
     * | Quiz score >= 70%              | 100%    |
     */
    public function getLessonMastery(string $studentId, int $lessonId): int
    {
        $progress = StudentLessonProgress::where('student_id', $studentId)
            ->where('lesson_id', $lessonId)
            ->first();

        return $progress?->mastery_percentage ?? 0;
    }

    /**
     * Calculate topic mastery as the average of all lesson mastery percentages.
     *
     * @return array{mastery_percentage: int, lesson_count: int, completed_count: int, lessons: array}
     */
    public function getTopicMastery(string $studentId, int $topicId): array
    {
        $topic = Topic::with('lessons')->find($topicId);

        if (!$topic || $topic->lessons->isEmpty()) {
            return [
                'mastery_percentage' => 0,
                'lesson_count'       => 0,
                'completed_count'    => 0,
                'lessons'            => [],
            ];
        }

        $lessonIds = $topic->lessons->pluck('id');

        $progressMap = StudentLessonProgress::where('student_id', $studentId)
            ->whereIn('lesson_id', $lessonIds)
            ->get()
            ->keyBy('lesson_id');

        $lessons = [];
        $totalMastery = 0;

        foreach ($topic->lessons as $lesson) {
            $progress = $progressMap->get($lesson->id);
            $mastery  = $progress?->mastery_percentage ?? 0;
            $totalMastery += $mastery;

            $lessons[] = [
                'lesson_id'            => $lesson->id,
                'title'                => $lesson->title,
                'mastery_percentage'   => $mastery,
                'best_quiz_score'      => $progress?->best_quiz_score,
                'status'               => $progress?->status ?? 'not_started',
            ];
        }

        $lessonCount    = count($topic->lessons);
        $avgMastery     = $lessonCount > 0 ? (int) round($totalMastery / $lessonCount) : 0;
        $completedCount = collect($lessons)->where('mastery_percentage', 100)->count();

        // Update the student_topic_progress record
        StudentTopicProgress::updateOrCreate(
            ['student_id' => $studentId, 'topic_id' => $topicId],
            [
                'mastery_score' => $avgMastery,
                'status'        => $completedCount === $lessonCount && $lessonCount > 0 ? 'completed' : 'active',
            ]
        );

        return [
            'mastery_percentage' => $avgMastery,
            'lesson_count'       => $lessonCount,
            'completed_count'    => $completedCount,
            'lessons'            => $lessons,
        ];
    }

    /**
     * Recalculate and update mastery for ALL topics in a class.
     * Called when lessons or topics are added/removed/modified.
     */
    public function recalculateClassMastery(string $studentId, int $classId): void
    {
        $topics = Topic::where('class_id', $classId)->with('lessons')->get();

        foreach ($topics as $topic) {
            $this->getTopicMastery($studentId, $topic->id);
        }
    }

    /**
     * Get a comprehensive progress summary for a student across all their classes.
     */
    public function getStudentProgressSummary(string $studentId): array
    {
        // Get all enrolled classes
        $classes = DB::table('class_student')
            ->join('classes', 'classes.id', '=', 'class_student.class_id')
            ->leftJoin('subjects', 'subjects.id', '=', 'classes.subject_id')
            ->where('class_student.student_id', $studentId)
            ->where('classes.is_active', true)
            ->select('classes.id', 'classes.name', 'subjects.name as subject')
            ->get();

        $result = [];

        foreach ($classes as $class) {
            $topics = Topic::where('class_id', $class->id)->with('lessons')->get();
            $totalLessons = 0;
            $completedLessons = 0;
            $totalMastery = 0;
            $topicCount = $topics->count();

            foreach ($topics as $topic) {
                $lessonIds = $topic->lessons->pluck('id');
                $totalLessons += $lessonIds->count();

                if ($lessonIds->isEmpty()) continue;

                $masterySum = StudentLessonProgress::where('student_id', $studentId)
                    ->whereIn('lesson_id', $lessonIds)
                    ->sum('mastery_percentage');

                $avgTopicMastery = $lessonIds->count() > 0
                    ? $masterySum / $lessonIds->count()
                    : 0;

                $totalMastery += $avgTopicMastery;

                $completedInTopic = StudentLessonProgress::where('student_id', $studentId)
                    ->whereIn('lesson_id', $lessonIds)
                    ->where('mastery_percentage', 100)
                    ->count();

                $completedLessons += $completedInTopic;
            }

            $avgMastery = $topicCount > 0 ? (int) round($totalMastery / $topicCount) : 0;

            $result[] = [
                'class_id'           => $class->id,
                'class_name'         => $class->name,
                'subject'            => $class->subject,
                'total_topics'       => $topicCount,
                'total_lessons'      => $totalLessons,
                'completed_lessons'  => $completedLessons,
                'mastery_percentage' => $avgMastery,
            ];
        }

        return $result;
    }
}