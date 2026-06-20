<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ChatbotLog;
use App\Models\QuizResult;
use App\Models\StudentLessonProgress;
use App\Models\StudentTopicProgress;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $teacher = $request->user();

        // ── Classes and students ─────────────────────────────────
        $classes = $teacher->taughtClasses()->with('students')->get();
        $studentIds = $classes->flatMap(fn($c) => $c->students->pluck('id'))->unique()->values();
        $totalStudents = $studentIds->count();

        // ── Topic mastery across all classes ─────────────────────
        $topicMastery = StudentTopicProgress::whereIn('student_id', $studentIds)
            ->with('topic.quarter.subject')
            ->get()
            ->groupBy('topic.title')
            ->map(fn($group) => round($group->avg('mastery_score'), 1));

        // ── Lesson-level mastery stats ───────────────────────────
        // Get all topics owned by this teacher's classes
        $classIds = $classes->pluck('id');
        $topicIds = DB::table('topics')->whereIn('class_id', $classIds)->pluck('id');
        $lessonIds = DB::table('lessons')->whereIn('topic_id', $topicIds)->pluck('id');

        $totalLessonsTracked = $lessonIds->count();

        // Average mastery across all lessons
        $avgMastery = 0;
        if ($lessonIds->count() > 0) {
            $avgMastery = (int) round(
                StudentLessonProgress::whereIn('lesson_id', $lessonIds)
                    ->avg('mastery_percentage')
            );
        }

        // Students struggling (mastery < 70% on any lesson they attempted)
        $strugglingStudentIds = StudentLessonProgress::whereIn('lesson_id', $lessonIds)
            ->where('mastery_percentage', '<', 70)
            ->where('mastery_percentage', '>', 0)
            ->distinct()
            ->pluck('student_id');

        $strugglingCount = $strugglingStudentIds->count();

        // Students at risk (no quiz attempts at all for lessons in this class)
        $studentsWithAttempts = QuizResult::whereIn('lesson_id', $lessonIds)
            ->distinct()
            ->pluck('student_id');

        $atRiskIds = $studentIds->diff($studentsWithAttempts);
        $atRiskCount = $atRiskIds->count();

        // ── At-risk students (detailed) ──────────────────────────
        $atRisk = User::whereIn('id', $studentIds)
            ->with(['studentProfile'])
            ->get()
            ->map(function ($s) use ($lessonIds) {
                $lessonProgress = StudentLessonProgress::where('student_id', $s->id)
                    ->whereIn('lesson_id', $lessonIds)
                    ->get();

                $totalAttempts = $lessonProgress->count();
                $masteredCount = $lessonProgress->where('mastery_percentage', 100)->count();
                $avgScore = $totalAttempts > 0 ? round($lessonProgress->avg('mastery_percentage')) : 0;

                return [
                    'id'                => $s->id,
                    'name'              => $s->name,
                    'total_xp'          => $s->studentProfile?->total_xp ?? 0,
                    'lessons_attempted' => $totalAttempts,
                    'lessons_mastered'  => $masteredCount,
                    'avg_mastery'       => $avgScore,
                    'status'            => $avgScore >= 70 ? 'proficient' : ($avgScore > 0 ? 'developing' : 'not_started'),
                ];
            })
            ->filter(fn($s) => $s['avg_mastery'] < 70)
            ->values();

        // ── Per-lesson breakdown for the mastery table ───────────
        $lessonsData = DB::table('lessons')
            ->whereIn('lessons.id', $lessonIds)
            ->join('topics', 'topics.id', '=', 'lessons.topic_id')
            ->select('lessons.id', 'lessons.title', 'topics.title as topic_title')
            ->get()
            ->map(function ($lesson) use ($studentIds) {
                $progress = StudentLessonProgress::where('lesson_id', $lesson->id)
                    ->whereIn('student_id', $studentIds)
                    ->get();

                $total = $studentIds->count();
                $attempted = $progress->count();
                $mastered = $progress->where('mastery_percentage', 100)->count();
                $struggling = $progress->where('mastery_percentage', '<', 70)
                    ->where('mastery_percentage', '>', 0)->count();
                $avgMastery = $attempted > 0 ? (int) round($progress->avg('mastery_percentage')) : 0;

                $status = $avgMastery >= 80 ? 'Proficient' : ($avgMastery >= 50 ? 'Developing' : 'Needs Support');

                return [
                    'id'              => $lesson->id,
                    'name'            => $lesson->title,
                    'topic'           => $lesson->topic_title,
                    'total_students'  => $total,
                    'attempted'       => $attempted,
                    'mastered'        => $mastered,
                    'struggling'      => $struggling,
                    'mastery'         => $avgMastery,
                    'status'          => $status,
                ];
            });

        // ── Flagged chatbot logs ─────────────────────────────────
        $recentFlags = ChatbotLog::whereIn('student_id', $studentIds)
            ->where('status', 'flagged')
            ->with(['student', 'subject'])
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'total_students'    => $totalStudents,
            'total_classes'     => $classes->count(),
            'total_lessons'     => $totalLessonsTracked,
            'avg_mastery'       => $avgMastery,
            'struggling_count'  => $strugglingCount,
            'at_risk_count'     => $atRiskCount,
            'at_risk'           => $atRisk->take(10),
            'topic_mastery'     => $topicMastery,
            'lessons'           => $lessonsData,
            'flagged_logs'      => $recentFlags,
            'classes'           => $classes,
        ]);
    }
}