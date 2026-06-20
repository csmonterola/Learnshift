<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\PracticeAttempt;
use App\Models\QuizResult;
use App\Models\StudentLessonProgress;
use App\Models\StudentTopicProgress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $student = $request->user();
        $studentId = $student->id;

        // ── Profile data ─────────────────────────────────────────
        $profile = $student->studentProfile;

        // ── Enrolled classes with mastery data ───────────────────
        $enrolledClasses = $student->enrolledClasses()
            ->with('teacher:id,name')
            ->get()
            ->map(function ($class) use ($studentId) {
                // Get all topics for this class
                $topicIds = $class->topics()->pluck('topics.id');
                $totalTopics = $topicIds->count();

                // Get all lessons for these topics
                $lessonIds = DB::table('lessons')
                    ->whereIn('topic_id', $topicIds)
                    ->pluck('id');
                $totalLessons = $lessonIds->count();

                // Get lesson progress for this student
                $lessonProgress = StudentLessonProgress::where('student_id', $studentId)
                    ->whereIn('lesson_id', $lessonIds)
                    ->get();

                $completedLessons = $lessonProgress->where('status', 'completed')->count();
                $masteredLessons = $lessonProgress->where('mastery_percentage', 100)->count();

                // Calculate average mastery — divide by TOTAL lessons, not just attempted ones
                $avgMastery = $totalLessons > 0
                    ? (int) round($lessonProgress->sum('mastery_percentage') / $totalLessons)
                    : 0;

                // Get quiz results count
                $quizAttempts = QuizResult::where('student_id', $studentId)
                    ->whereIn('lesson_id', $lessonIds)
                    ->count();

                return [
                    'id'                 => $class->id,
                    'name'               => $class->name,
                    'subject'            => $class->subject,
                    'grade_level'        => $class->grade_level,
                    'section'            => $class->section,
                    'teacher_name'       => $class->teacher?->name,
                    'total_topics'       => $totalTopics,
                    'total_lessons'      => $totalLessons,
                    'completed_lessons'  => $completedLessons,
                    'mastered_lessons'   => $masteredLessons,
                    'mastery_percentage' => $avgMastery,
                    'quiz_attempts'      => $quizAttempts,
                ];
            });

        // ── Aggregate stats ──────────────────────────────────────
        $totalLessonsCompleted = StudentLessonProgress::where('student_id', $studentId)
            ->where('status', 'completed')
            ->count();

        $totalTopicsCompleted = StudentTopicProgress::where('student_id', $studentId)
            ->where('status', 'completed')
            ->count();

        $totalTopics = DB::table('topics')
            ->whereIn('class_id', $enrolledClasses->pluck('id'))
            ->count();

        $totalQuizAttempts = QuizResult::where('student_id', $studentId)->count();

        // Activities this week (quiz submissions + practice attempts)
        $weekStart = now()->startOfWeek();
        $activitiesThisWeek = QuizResult::where('student_id', $studentId)
            ->where('submitted_at', '>=', $weekStart)
            ->count()
            + PracticeAttempt::where('student_id', $studentId)
            ->where('created_at', '>=', $weekStart)
            ->count();

        // ── Subject mastery from student_subject_mastery table ───
        $subjectMastery = $student->subjectMastery()
            ->with('subject:id,name,code')
            ->get()
            ->map(fn($sm) => [
                'subject_id'     => $sm->subject_id,
                'subject_name'   => $sm->subject?->name ?? 'Unknown',
                'mastery_score'  => $sm->mastery_score,
                'target_score'   => $sm->target_score,
            ]);

        // ── Recent activity ──────────────────────────────────────
        $recentQuizzes = QuizResult::where('student_id', $studentId)
            ->with('lesson:id,title')
            ->latest('submitted_at')
            ->take(5)
            ->get()
            ->map(fn($qr) => [
                'type'          => 'quiz',
                'lesson_title'  => $qr->lesson?->title ?? 'Unknown Lesson',
                'score'         => $qr->score,
                'submitted_at'  => $qr->submitted_at,
            ]);

        return response()->json([
            'profile'               => $profile,
            'enrolled_classes'      => $enrolledClasses,
            'total_classes'         => $enrolledClasses->count(),
            'total_lessons_completed' => $totalLessonsCompleted,
            'total_topics_completed'  => $totalTopicsCompleted,
            'total_topics'           => $totalTopics,
            'total_quiz_attempts'    => $totalQuizAttempts,
            'activities_this_week'   => $activitiesThisWeek,
            'subject_mastery'        => $subjectMastery,
            'recent_quizzes'         => $recentQuizzes,
        ]);
    }
}