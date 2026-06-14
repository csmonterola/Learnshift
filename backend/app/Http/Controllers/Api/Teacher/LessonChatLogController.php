<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LessonChatLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LessonChatLogController extends Controller
{
    public function index(Request $request, Lesson $lesson): JsonResponse
    {
        // Authorization: verify this teacher owns the class that contains the lesson
        if ($lesson->topic->schoolClass->teacher_id !== $request->user()->id) {
            return response()->json(
                ['error' => 'You are not authorized to view chat logs for this lesson.'],
                403
            );
        }

        $logs = LessonChatLog::where('lesson_id', $lesson->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20, [
                'id',
                'student_id',
                'question',
                'response',
                'source',
                'retrieved_chunk_count',
                'confidence_score',
                'created_at',
            ]);

        return response()->json($logs);
    }
}
