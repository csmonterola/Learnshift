<?php

namespace App\Http\Controllers\Api\Student;

use App\Exceptions\EmbeddingException;
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
        $validated = $request->validate([
            'question'     => 'required|string|max:2000',
            'material_ids' => 'sometimes|array|max:50',
            'material_ids.*' => 'integer',
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

        $question    = $validated['question'];
        $materialIds = $validated['material_ids'] ?? [];

        // Embed the question; return 502 if the embedding service fails
        try {
            $queryVector = $this->embeddingService->embed($question);
        } catch (EmbeddingException $e) {
            Log::error('LessonChat embedding failed', [
                'lesson_id' => $lesson->id,
                'error'     => $e->getMessage(),
            ]);
            return response()->json(
                ['error' => 'AI service temporarily unavailable. Please try again.'],
                502
            );
        }

        // Retrieve relevant chunks, optionally filtered to specific material IDs
        $chunks     = $this->retriever->retrieve($lesson->id, $queryVector, 5, $materialIds);
        $chunkCount = $chunks->count();

        // Three-tier source and confidence logic
        if ($chunkCount >= 2) {
            $source          = 'lesson_materials';
            $confidenceScore = 90;
        } elseif ($chunkCount === 1) {
            $source          = 'mixed';
            $confidenceScore = 80;
        } else {
            $source          = 'general';
            $confidenceScore = 70;
        }

        // Fetch last 5 chat log entries for conversation history (ordered ASC for chronological order)
        $history = LessonChatLog::where('student_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->orderBy('created_at', 'asc')
            ->take(5)
            ->get();

        // Build the Mistral messages array
        $messages = $this->promptBuilder->build($chunks, $history, $question, $source);

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

        // Persist the chat log; log silently on failure and continue
        $logId = null;
        try {
            $log   = LessonChatLog::create([
                'student_id'            => $student->id,
                'lesson_id'             => $lesson->id,
                'question'              => $question,
                'response'              => $responseText,
                'source'                => $source,
                'retrieved_chunk_count' => $chunkCount,
                'confidence_score'      => $confidenceScore,
            ]);
            $logId = $log->id;
        } catch (\Throwable $e) {
            Log::warning('LessonChat failed to persist chat log', [
                'lesson_id'  => $lesson->id,
                'student_id' => $student->id,
                'error'      => $e->getMessage(),
            ]);
        }

        return response()->json([
            'response'  => $responseText,
            'source'    => $source,
            'log_id'    => $logId,
            'lesson_id' => $lesson->id,
        ]);
    }

    /**
     * GET /api/student/lessons/{lesson}/chat-logs
     * Returns the authenticated student's own chat history for this lesson.
     */
    public function logs(Request $request, Lesson $lesson): JsonResponse
    {
        $student = $request->user();

        $isEnrolled = $lesson->topic->schoolClass->students()
            ->where('users.id', $student->id)
            ->exists();

        if (!$isEnrolled) {
            return response()->json(['error' => 'You are not enrolled in the class for this lesson.'], 403);
        }

        $logs = LessonChatLog::where('student_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->with('reviewer:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($logs);
    }
}
