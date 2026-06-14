<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LessonChatLog;
use App\Services\Rag\EmbeddingService;
use App\Services\Rag\LessonRetriever;
use App\Services\Rag\RagPromptBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LessonChatController extends Controller
{
    public function __construct(
        private readonly EmbeddingService $embeddingService,
        private readonly LessonRetriever  $retriever,
        private readonly RagPromptBuilder $promptBuilder,
    ) {}

    public function ask(Request $request, Lesson $lesson): JsonResponse
    {
        $request->validate([
            'question' => 'required|string|max:2000',
        ]);

        $student = $request->user();

        // Authorization: student must be enrolled in the class for this lesson
        $isEnrolled = $lesson->topic->schoolClass->students()
            ->where('users.id', $student->id)
            ->exists();

        if (!$isEnrolled) {
            return response()->json(
                ['error' => 'You are not enrolled in the class for this lesson.'],
                403
            );
        }

        $question = $request->input('question');

        // Embed the question and retrieve relevant chunks
        $queryVector = $this->embeddingService->embed($question);
        $chunks      = $this->retriever->retrieve($lesson->id, $queryVector);

        // Determine source and confidence based on retrieval result
        $source          = $chunks->isNotEmpty() ? 'lesson_materials' : 'general';
        $confidenceScore = $source === 'lesson_materials' ? 90 : 70;

        // Fetch last 5 chat log entries for conversation history (ordered ASC for chronological order)
        $history = LessonChatLog::where('student_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->orderBy('created_at', 'asc')
            ->take(5)
            ->get();

        // Build the Mistral messages array
        $messages = $this->promptBuilder->build($chunks, $history, $question);

        // Call Mistral AI chat completions
        $apiKey = config('services.mistral.api_key');
        $model  = config('services.mistral.model', 'mistral-small-latest');

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
                Log::error('LessonChat Mistral API error', [
                    'status'    => $mistralResponse->status(),
                    'lesson_id' => $lesson->id,
                ]);
                return response()->json(
                    ['error' => 'AI service temporarily unavailable. Please try again.'],
                    502
                );
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('LessonChat Mistral connection timeout', [
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

        // Persist the chat log
        $log = LessonChatLog::create([
            'student_id'            => $student->id,
            'lesson_id'             => $lesson->id,
            'question'              => $question,
            'response'              => $responseText,
            'source'                => $source,
            'retrieved_chunk_count' => $chunks->count(),
            'confidence_score'      => $confidenceScore,
        ]);

        return response()->json([
            'response'  => $responseText,
            'source'    => $source,
            'log_id'    => $log->id,
            'lesson_id' => $lesson->id,
        ]);
    }
}
