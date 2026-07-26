<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\Topic;
use App\Models\User;
use App\Services\Ai\AiProviderFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LessonChatController extends Controller
{
    /**
     * POST /api/parent/children/{child}/classes/{classId}/topics/{topicId}/lessons/{lessonId}/chat
     *
     * Allows parents to ask AI questions about lesson materials.
     */
    public function ask(Request $request, User $child, $classId, $topicId, $lessonId): JsonResponse
    {
        // Verify parent owns this child
        $parent = $request->user();
        $link = $parent->children()->where('student_id', $child->id)->first();
        if (! $link || ($link->pivot->link_status ?? 'pending') !== 'confirmed') {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $request->validate([
            'question' => 'required|string|max:2000',
        ]);

        $question = $request->input('question');
        $lesson = Lesson::with(['learningMaterials'])->findOrFail($lessonId);

        // Verify lesson belongs to topic/class
        $topic = Topic::where('id', $topicId)->where('class_id', $classId)->firstOrFail();
        if ($lesson->topic_id !== $topic->id) {
            return response()->json(['error' => 'Lesson not found in this topic.'], 404);
        }

        // Build lesson context from materials
        $materials = $lesson->learningMaterials;
        $context = '';
        if ($materials->isNotEmpty()) {
            $context = "Here are the materials for the lesson \"{$lesson->title}\":\n\n";
            foreach ($materials as $mat) {
                $context .= "- {$mat->title} ({$mat->file_type})\n";
                if ($mat->description) {
                    $context .= "  Description: {$mat->description}\n";
                }
            }
        }

        $messages = [
            [
                'role' => 'system',
                'content' => 'You are a helpful educational assistant on the LearnShift platform. '
                    ."You are helping a parent understand their child's lesson materials.\n\n"
                    .($context ? "{$context}\n\nAnswer the parent's question about this lesson using the materials above and your knowledge."
                    : 'No specific lesson materials are available. Answer using your general knowledge.')
                    ."\n\nBe clear, educational, and supportive. Use Markdown formatting where helpful (tables, bold, lists).",
            ],
            ['role' => 'user', 'content' => $question],
        ];

        try {
            $provider = AiProviderFactory::make('chat');
            $result = $provider->chat($messages, [
                'max_tokens' => 600,
                'temperature' => 0.7,
            ]);
            $responseText = $result['content'];
        } catch (\RuntimeException $e) {
            Log::error('ParentLessonChat AI provider error', [
                'lesson_id' => $lesson->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(
                ['error' => 'AI service temporarily unavailable. Please try again.'],
                502
            );
        }

        return response()->json([
            'response' => $responseText,
            'lesson_id' => $lesson->id,
        ]);
    }
}
