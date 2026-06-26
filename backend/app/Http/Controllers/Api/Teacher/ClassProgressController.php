<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\QuizResult;
use App\Models\SchoolClass;
use App\Models\StudentLessonProgress;
use App\Models\StudentTopicProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClassProgressController extends Controller
{
    /**
     * GET /api/teacher/classes/{classId}/progress
     *
     * Returns per-student progress data for a specific class.
     * Includes mastery, quiz performance, lesson completion, and topic breakdown.
     */
    public function index(Request $request, int $classId): JsonResponse
    {
        $teacher = $request->user();

        // Verify teacher owns this class
        $class = SchoolClass::where('id', $classId)
            ->where('teacher_id', $teacher->id)
            ->firstOrFail();

        // Get enrolled students
        $students = $class->students()->with('studentProfile')->get();
        $studentIds = $students->pluck('id');

        // Get all topics and lessons for this class
        $topics = DB::table('topics')->where('class_id', $classId)->orderBy('order_index')->get();
        $topicIds = $topics->pluck('id');
        $lessonIds = DB::table('lessons')->whereIn('topic_id', $topicIds)->pluck('id');

        // ── Per-student progress ─────────────────────────────────
        $studentProgress = $students->map(function ($student) use ($lessonIds, $topicIds) {
            $studentId = $student->id;

            // Lesson progress
            $lessonProgress = StudentLessonProgress::where('student_id', $studentId)
                ->whereIn('lesson_id', $lessonIds)
                ->get();

            $totalLessons = $lessonIds->count();
            $completedLessons = $lessonProgress->where('status', 'completed')->count();
            $masteredLessons = $lessonProgress->where('mastery_percentage', 100)->count();
            // Divide by total lessons (unattempted = 0%), not just attempted ones
            $avgMastery = $totalLessons > 0 ? (int) round($lessonProgress->sum('mastery_percentage') / $totalLessons) : 0;

            // Quiz results
            $quizResults = QuizResult::where('student_id', $studentId)
                ->whereIn('lesson_id', $lessonIds)
                ->get();

            $quizAttempts = $quizResults->count();
            $bestScore = $quizResults->max('score');
            $avgScore = $quizAttempts > 0 ? (int) round($quizResults->avg('score')) : 0;

            // Topic progress
            $topicProgress = StudentTopicProgress::where('student_id', $studentId)
                ->whereIn('topic_id', $topicIds)
                ->get();

            $topicsCompleted = $topicProgress->where('status', 'completed')->count();

            // Last activity
            $lastActivity = $lessonProgress->sortByDesc('updated_at')->first()?->updated_at
                ?? $quizResults->sortByDesc('submitted_at')->first()?->submitted_at;

            // Status
            $masteryLabel = $avgMastery >= 100 ? 'mastered' : ($avgMastery >= 70 ? 'proficient' : ($avgMastery > 0 ? 'developing' : 'not_started'));

            return [
                'id'                  => $studentId,
                'name'                => $student->name,
                'avatar'              => $student->avatar,
                'mastery_percentage'  => $avgMastery,
                'total_lessons'       => $totalLessons,
                'completed_lessons'   => $completedLessons,
                'mastered_lessons'    => $masteredLessons,
                'total_topics'        => $topicIds->count(),
                'completed_topics'    => $topicsCompleted,
                'quiz_attempts'       => $quizAttempts,
                'best_quiz_score'     => $bestScore,
                'avg_quiz_score'      => $avgScore,
                'last_activity'       => $lastActivity,
                'status'              => $masteryLabel,
            ];
        });

        // ── Topic-level summary (per-student averages) ──────────
        $topicSummary = $topics->map(function ($topic) use ($studentIds) {
            $topicLessons = DB::table('lessons')->where('topic_id', $topic->id)->pluck('id');
            $lessonCount = $topicLessons->count();
            $progress = StudentLessonProgress::whereIn('student_id', $studentIds)
                ->whereIn('lesson_id', $topicLessons)
                ->get();

            $total = $studentIds->count();

            // Calculate per-student average mastery (divide by total lessons, unattempted = 0%)
            $studentMasteries = $studentIds->map(function ($sid) use ($progress, $lessonCount) {
                $studentRecords = $progress->where('student_id', $sid);
                if ($studentRecords->isEmpty()) return 0; // Not started = 0%
                return (int) round($studentRecords->sum('mastery_percentage') / $lessonCount);
            });

            $avgMastery = $total > 0 ? (int) round($studentMasteries->avg()) : 0;
            $mastered = $studentMasteries->filter(fn($m) => $m === 100)->count();
            $developing = $studentMasteries->filter(fn($m) => $m > 0 && $m < 70)->count();
            $notStarted = $studentMasteries->filter(fn($m) => $m === 0)->count();

            return [
                'id'              => $topic->id,
                'title'           => $topic->title,
                'lesson_count'    => $lessonCount,
                'avg_mastery'     => $avgMastery,
                'mastered_count'  => $mastered,
                'developing_count' => $developing,
                'not_started_count' => $notStarted,
                'total_students'  => $total,
            ];
        });

        // ── Class summary stats ──────────────────────────────────
        $classAvgMastery = $studentProgress->count() > 0
            ? (int) round($studentProgress->avg('mastery_percentage'))
            : 0;

        $masteredCount = $studentProgress->where('status', 'mastered')->count();
        $developingCount = $studentProgress->where('status', 'developing')->count();
        $notStartedCount = $studentProgress->where('status', 'not_started')->count();

        return response()->json([
            'class' => [
                'id'            => $class->id,
                'name'          => $class->name,
                'subject'       => $class->subject,
                'grade_level'   => $class->grade_level,
                'section'       => $class->section,
            ],
            'summary' => [
                'total_students'    => $studentIds->count(),
                'avg_mastery'       => $classAvgMastery,
                'mastered_count'    => $masteredCount,
                'developing_count'  => $developingCount,
                'not_started_count' => $notStartedCount,
                'total_lessons'     => $lessonIds->count(),
                'total_topics'      => $topicIds->count(),
            ],
            'students'       => $studentProgress,
            'topic_summary'  => $topicSummary,
        ]);
    }

    /**
     * GET /api/teacher/classes/{classId}/progress/topics/{topicId}
     *
     * Returns per-lesson progress for a specific topic.
     */
    public function topicDetail(Request $request, int $classId, int $topicId): JsonResponse
    {
        $teacher = $request->user();

        SchoolClass::where('id', $classId)
            ->where('teacher_id', $teacher->id)
            ->firstOrFail();

        $students = DB::table('class_student')
            ->where('class_id', $classId)
            ->pluck('student_id');

        $lessons = DB::table('lessons')
            ->where('topic_id', $topicId)
            ->orderBy('order')
            ->get();

        $lessonData = $lessons->map(function ($lesson) use ($students) {
            $progress = StudentLessonProgress::where('lesson_id', $lesson->id)
                ->whereIn('student_id', $students)
                ->get();

            $quizResults = QuizResult::where('lesson_id', $lesson->id)
                ->whereIn('student_id', $students)
                ->get();

            $attempted = $progress->count();
            $mastered = $progress->where('mastery_percentage', 100)->count();
            $avgMastery = $attempted > 0 ? (int) round($progress->avg('mastery_percentage')) : 0;
            $avgQuizScore = $quizResults->count() > 0 ? (int) round($quizResults->avg('score')) : 0;

            return [
                'id'              => $lesson->id,
                'title'           => $lesson->title,
                'total_students'  => $students->count(),
                'attempted'       => $attempted,
                'mastered'        => $mastered,
                'avg_mastery'     => $avgMastery,
                'quiz_attempts'   => $quizResults->count(),
                'avg_quiz_score'  => $avgQuizScore,
            ];
        });

        return response()->json([
            'lessons' => $lessonData,
        ]);
    }
}