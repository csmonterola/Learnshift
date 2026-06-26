<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
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
        if (!$link || ($link->pivot->link_status ?? 'pending') !== 'confirmed') {
            return response()->json(['error' => 'Access denied.'], 403);
        }

        $request->validate([
            'question' => 'required|string|max:2000',
        ]);

        $question = $request->input('question');
        $lesson = Lesson::with(['learningMaterials'])->findOrFail($lessonId);

        // Verify lesson belongs to topic/class
        $topic = \App\Models\Topic::where('id', $topicId)->where('class_id', $classId)->firstOrFail();
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

        $apiKey = config('services.mistral.api_key');
        $model  = config('services.mistral.model', 'mistral-small-latest');

        $messages = [
            [
                'role' => 'system',
                'content' => "You are a helpful educational assistant on the LearnShift platform. "
                    . "You are helping a parent understand their child's lesson materials.\n\n"
                    . ($context ? "{$context}\n\nAnswer the parent's question about this lesson using the materials above and your knowledge." 
                    : "No specific lesson materials are available. Answer using your general knowledge.")
                    . "\n\nBe clear, educational, and supportive. Use Markdown formatting where helpful (tables, bold, lists)."
            ],
            ['role' => 'user', 'content' => $question],
        ];

        try {
            $mistralResponse = Http::withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
            ])->timeout(30)
              ->withoutVerifying()
              ->post('https://api.mistral.ai/v1/chat/completions', [
                'model'       => $model,
                'messages'    => $messages,
                'max_tokens'  => 600,
                'temperature' => 0.7,
            ]);

            if ($mistralResponse->failed()) {
                Log::error('ParentLessonChat Mistral API error', [
                    'status'    => $mistralResponse->status(),
                    'lesson_id' => $lesson->id,
                ]);
                return response()->json(
                    ['error' => 'AI service temporarily unavailable. Please try again.'],
                    502
                );
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('ParentLessonChat Mistral connection timeout', [
                'lesson_id' => $lesson->id,
                'error'     => $e->getMessage(),
            ]);
            return response()->json(
                ['error' => 'AI service temporarily unavailable. Please try again.'],
                502
            );
        }

        $responseText = $mistralResponse->json('choices.0.message.content')
            ?? 'Sorry, I could not generate a response. Please try again.';

        return response()->json([
            'response'  => $responseText,
            'lesson_id' => $lesson->id,
        ]);
    }
}