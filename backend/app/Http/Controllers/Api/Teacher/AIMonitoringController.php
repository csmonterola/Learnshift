<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\LessonChatLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AIMonitoringController extends Controller
{
    /**
     * GET /api/teacher/ai-logs
     * Returns all lesson chat logs for the teacher's classes.
     */
    public function index(Request $request)
    {
        $teacher = $request->user();
        $classIds = $teacher->taughtClasses()->pluck('id');

        // Get all lesson IDs for the teacher's classes
        $lessonIds = DB::table('lessons')
            ->join('topics', 'lessons.topic_id', '=', 'topics.id')
            ->whereIn('topics.class_id', $classIds)
            ->pluck('lessons.id');

        $logs = LessonChatLog::whereIn('lesson_id', $lessonIds)
            ->with([
                'student:id,name,avatar',
                'lesson:id,title,topic_id',
                'lesson.topic:id,title,class_id',
                'lesson.topic.schoolClass:id,name,subject',
                'reviewer:id,name',
            ])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('question', 'like', "%{$search}%")
                      ->orWhereHas('student', fn($q) => $q->where('name', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate(20);

        return response()->json($logs);
    }

    /**
     * PATCH /api/teacher/ai-logs/{log}/status
     * Update the review status, teacher note, or corrected response.
     */
    public function updateStatus(Request $request, LessonChatLog $log)
    {
        $request->validate([
            'status'                    => 'required|in:ok,flagged,reviewed,verified',
            'teacher_note'              => 'nullable|string|max:2000',
            'teacher_corrected_response' => 'nullable|string|max:10000',
        ]);

        $log->update([
            'status'                     => $request->status,
            'teacher_note'               => $request->teacher_note,
            'teacher_corrected_response' => $request->teacher_corrected_response,
            'reviewed_by'                => $request->user()->id,
            'reviewed_at'                => now(),
        ]);

        return response()->json(
            $log->load([
                'student:id,name,avatar',
                'lesson:id,title,topic_id',
                'lesson.topic:id,title,class_id',
                'lesson.topic.schoolClass:id,name,subject',
                'reviewer:id,name',
            ])
        );
    }

    /**
     * GET /api/teacher/ai-logs/stats
     * Returns KPI counts for the dashboard.
     */
    public function stats(Request $request)
    {
        $teacher = $request->user();
        $classIds = $teacher->taughtClasses()->pluck('id');

        $lessonIds = DB::table('lessons')
            ->join('topics', 'lessons.topic_id', '=', 'topics.id')
            ->whereIn('topics.class_id', $classIds)
            ->pluck('lessons.id');

        $total = LessonChatLog::whereIn('lesson_id', $lessonIds)->count();
        $verified = LessonChatLog::whereIn('lesson_id', $lessonIds)->where('status', 'verified')->count();
        $flagged = LessonChatLog::whereIn('lesson_id', $lessonIds)->where('status', 'flagged')->count();
        $needsReview = LessonChatLog::whereIn('lesson_id', $lessonIds)->whereIn('status', ['ok', 'reviewed'])->count();

        return response()->json([
            'total_interactions' => $total,
            'verified'           => $verified,
            'flagged'            => $flagged,
            'needs_review'       => $needsReview,
        ]);
    }
}