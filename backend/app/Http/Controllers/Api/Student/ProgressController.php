<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\QuizResult;
use App\Models\StudentLessonProgress;
use App\Models\StudentTopicProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProgressController extends Controller
{
    /**
     * GET /api/student/progress
     *
     * Returns comprehensive progress data for the student dashboard and progress page.
     */
    public function index(Request $request): JsonResponse
    {
        $student = $request->user();
        $studentId = $student->id;
        $profile = $student->studentProfile;

        // ── Enrolled classes with detailed mastery ───────────────
        $enrolledClasses = $student->enrolledClasses()
            ->with('teacher:id,name')
            ->get();

        $classProgress = $enrolledClasses->map(function ($class) use ($studentId) {
            $topicIds = DB::table('topics')->where('class_id', $class->id)->pluck('id');
            $lessonIds = DB::table('lessons')->whereIn('topic_id', $topicIds)->pluck('id');

            // Topic progress
            $topics = DB::table('topics')->where('class_id', $class->id)->orderBy('order_index')->get();
            $topicProgress = [];
            $totalTopicMastery = 0;

            foreach ($topics as $topic) {
                $topicLessons = DB::table('lessons')->where('topic_id', $topic->id)->pluck('id');
                $lessonProg = StudentLessonProgress::where('student_id', $studentId)
                    ->whereIn('lesson_id', $topicLessons)
                    ->get();

                $topicLessonCount = $topicLessons->count();
                $topicCompleted = $lessonProg->where('status', 'completed')->count();
                $topicMastered = $lessonProg->where('mastery_percentage', 100)->count();
                // Divide by TOTAL lessons in topic, not just attempted ones
                $topicAvg = $topicLessonCount > 0 ? (int) round($lessonProg->sum('mastery_percentage') / $topicLessonCount) : 0;
                $totalTopicMastery += $topicAvg;

                $topicProgress[] = [
                    'id'                 => $topic->id,
                    'title'              => $topic->title,
                    'lesson_count'       => $topicLessonCount,
                    'completed_lessons'  => $topicCompleted,
                    'mastered_lessons'   => $topicMastered,
                    'mastery_percentage' => $topicAvg,
                ];
            }

            $totalLessons = $lessonIds->count();

            // Class mastery = sum of all lesson mastery / total lessons (unattempted = 0%)
            $classMastery = $totalLessons > 0 ? (int) round(
                StudentLessonProgress::where('student_id', $studentId)
                    ->whereIn('lesson_id', $lessonIds)
                    ->sum('mastery_percentage') / $totalLessons
            ) : 0;

            $completedLessons = StudentLessonProgress::where('student_id', $studentId)
                ->whereIn('lesson_id', $lessonIds)
                ->where('status', 'completed')
                ->count();
            $masteredLessons = StudentLessonProgress::where('student_id', $studentId)
                ->whereIn('lesson_id', $lessonIds)
                ->where('mastery_percentage', 100)
                ->count();

            return [
                'id'                 => $class->id,
                'name'               => $class->name,
                'subject'            => $class->subject,
                'grade_level'        => $class->grade_level,
                'teacher_name'       => $class->teacher?->name,
                'mastery_percentage' => $classMastery,
                'total_topics'       => count($topicProgress),
                'total_lessons'      => $totalLessons,
                'completed_lessons'  => $completedLessons,
                'mastered_lessons'   => $masteredLessons,
                'topics'             => $topicProgress,
            ];
        });

        // ── Subject mastery ──────────────────────────────────────
        $subjectMastery = $student->subjectMastery()
            ->with('subject:id,name,code')
            ->get()
            ->map(fn($sm) => [
                'subject_id'    => $sm->subject_id,
                'subject_name'  => $sm->subject?->name ?? 'Unknown',
                'mastery_score' => $sm->mastery_score,
                'target_score'  => $sm->target_score,
            ]);

        // ── Quiz history ─────────────────────────────────────────
        $recentQuizzes = QuizResult::where('student_id', $studentId)
            ->with('lesson:id,title')
            ->latest('submitted_at')
            ->take(20)
            ->get();

        // ── Summary stats ────────────────────────────────────────
        $totalLessonsCompleted = StudentLessonProgress::where('student_id', $studentId)
            ->where('status', 'completed')
            ->count();

        $totalMastered = StudentLessonProgress::where('student_id', $studentId)
            ->where('mastery_percentage', 100)
            ->count();

        $totalTopicsCompleted = StudentTopicProgress::where('student_id', $studentId)
            ->where('status', 'completed')
            ->count();

        $allTopicIds = DB::table('topics')
            ->whereIn('class_id', $enrolledClasses->pluck('id'))
            ->pluck('id');
        $totalTopics = $allTopicIds->count();

        // Overall mastery = sum of all lesson mastery / total lessons
        $allLessonIds = DB::table('lessons')->whereIn('topic_id', $allTopicIds)->pluck('id');
        $overallMastery = 0;
        if ($allLessonIds->count() > 0) {
            $overallMastery = (int) round(
                StudentLessonProgress::where('student_id', $studentId)
                    ->whereIn('lesson_id', $allLessonIds)
                    ->sum('mastery_percentage') / $allLessonIds->count()
            );
        }

        return response()->json([
            'xp'                      => $profile?->total_xp ?? 0,
            'streak'                  => $profile?->streak_days ?? 0,
            'overall_mastery'         => $overallMastery,
            'total_lessons_completed' => $totalLessonsCompleted,
            'total_mastered'          => $totalMastered,
            'total_topics_completed'  => $totalTopicsCompleted,
            'total_topics'            => $totalTopics,
            'class_progress'          => $classProgress,
            'subject_mastery'         => $subjectMastery,
            'recent_quizzes'          => $recentQuizzes,
        ]);
    }
}