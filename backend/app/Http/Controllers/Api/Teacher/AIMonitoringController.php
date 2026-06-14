<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ChatbotLog;
use Illuminate\Http\Request;

class AIMonitoringController extends Controller
{
    public function index(Request $request)
    {
        $teacher    = $request->user();
        $classIds   = $teacher->taughtClasses()->pluck('id');
        $studentIds = \App\Models\User::whereHas('enrolledClasses', fn($q) => $q->whereIn('classes.id', $classIds))
            ->pluck('id');

        $logs = ChatbotLog::whereIn('student_id', $studentIds)
            ->with(['student', 'subject'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->latest()
            ->paginate(20);

        return response()->json($logs);
    }

    public function updateStatus(Request $request, ChatbotLog $log)
    {
        $request->validate([
            'status'       => 'required|in:ok,flagged,reviewed,verified',
            'teacher_note' => 'nullable|string',
        ]);

        $log->update([
            'status'       => $request->status,
            'teacher_note' => $request->teacher_note,
            'reviewed_by'  => $request->user()->id,
            'reviewed_at'  => now(),
        ]);

        return response()->json($log->load(['student', 'subject']));
    }

    public function anonymousQuestions(Request $request)
    {
        $questions = \App\Models\AnonymousQuestion::where('teacher_id', $request->user()->id)
            ->with('subject')
            ->latest()
            ->get();

        return response()->json($questions);
    }

    public function answerQuestion(Request $request, \App\Models\AnonymousQuestion $question)
    {
        $request->validate(['answer' => 'required|string']);

        $question->update([
            'answer'      => $request->answer,
            'is_answered' => true,
            'answered_at' => now(),
        ]);

        return response()->json($question);
    }
}
