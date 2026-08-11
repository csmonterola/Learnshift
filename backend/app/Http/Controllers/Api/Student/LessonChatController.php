<?php

namespace App\Http\Controllers\Api\Student;

use App\Exceptions\EmbeddingException;
use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LessonChatLog;
use App\Models\MaterialImage;
use App\Services\Ai\AiProviderFactory;
use App\Services\Learning\LearningProfileService;
use App\Services\Rag\EmbeddingService;
use App\Services\Rag\LessonRetriever;
use App\Services\Rag\RagPromptBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LessonChatController extends Controller
{
    public function __construct(
        private readonly EmbeddingService $embeddingService,
        private readonly LessonRetriever $retriever,
        private readonly RagPromptBuilder $promptBuilder,
    ) {}

    public function ask(Request $request, Lesson $lesson): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'required|string|max:2000',
            'material_ids' => 'sometimes|array|max:50',
            'material_ids.*' => 'integer',
        ]);

        $student = $request->user();

        // Authorization: student must be enrolled in the class for this lesson
        $isEnrolled = $lesson->topic->schoolClass->students()
            ->where('users.id', $student->id)
            ->exists();

        if (! $isEnrolled) {
            return response()->json(
                ['error' => 'You are not enrolled in the class for this lesson.'],
                403
            );
        }

        $question = $validated['question'];
        $materialIds = $validated['material_ids'] ?? [];

        // Embed the question; return 502 if the embedding service fails
        try {
            $queryVector = $this->embeddingService->embed($question);
        } catch (EmbeddingException $e) {
            Log::error('LessonChat embedding failed', [
                'lesson_id' => $lesson->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(
                ['error' => 'AI service temporarily unavailable. Please try again.'],
                502
            );
        }

        // Retrieve relevant chunks, optionally filtered to specific material IDs
        $chunks = $this->retriever->retrieve($lesson->id, $queryVector, 5, $materialIds);
        $chunkCount = $chunks->count();

        // Extract image metadata from image-type chunks for the frontend.
        $imageData = $this->extractImageData($chunks);

        // Fetch ALL non-discarded images — needed for two reasons:
        // 1. Pass captions to the prompt builder's "Visual Resources Available" text listing
        // 2. Populate $imageData so the frontend's InlineImageRenderer can find images
        //    by page_number when the AI uses [Image: page N] markers in its response.
        //    Without this, images referenced by the AI but not in the top-5 chunks
        //    would fail to render inline.
        $allImages = MaterialImage::whereHas('learningMaterial', function ($q) use ($lesson, $materialIds) {
            $q->where('lesson_id', $lesson->id);
            if (!empty($materialIds)) {
                $q->whereIn('id', $materialIds);
            }
        })
            ->whereIn('extraction_status', ['extracted', 'captioning'])
            ->orderBy('page_number')
            ->orderBy('id')
            ->get();

        // Merge ALL images into the frontend response (deduplicating by ID) so that
        // [Image: page N] markers can resolve regardless of whether the image was in
        // the top-5 semantically matched chunks. The ImageGallery component was removed
        // from the frontend, so no dumping occurs — images only render inline.
        $seenIds = [];
        foreach ($imageData as $d) {
            $seenIds[$d['id']] = true;
        }
        foreach ($allImages as $img) {
            if (isset($seenIds[$img->id]) || !$img->url) {
                continue;
            }
            $imageData[] = [
                'id' => $img->id,
                'url' => $img->url,
                'caption' => $img->caption,
                'page_number' => $img->page_number,
            ];
        }

        // Three-tier source and confidence logic
        if ($chunkCount >= 2) {
            $source = 'lesson_materials';
            $confidenceScore = 90;
        } elseif ($chunkCount === 1) {
            $source = 'mixed';
            $confidenceScore = 80;
        } else {
            $source = 'general';
            $confidenceScore = 70;
        }

        // Fetch last 5 chat log entries for conversation history (ordered ASC for chronological order)
        $history = LessonChatLog::where('student_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->orderBy('created_at', 'asc')
            ->take(5)
            ->get();

        // Resolve the learner profile so the tutor adapts explanation depth,
        // pacing, help stance, and tone to this student's demonstrated traits.
        $profile = app(LearningProfileService::class)->analyze($student);

        // Build the Mistral messages array.
        // $allImages provides captions for the system prompt's "Visual Resources Available" section.
        // Only top-5 semantically relevant images get actual image_url data sent to the vision model.
        $messages = $this->promptBuilder->build($chunks, $history, $question, $source, $allImages, $profile);

        // Call AI provider
        try {
            $provider = AiProviderFactory::make('chat');
            $result = $provider->chat($messages, [
                'max_tokens' => 600,
                'temperature' => 0.7,
            ]);
            $responseText = $result['content'];
        } catch (\RuntimeException $e) {
            Log::error('LessonChat AI provider error', [
                'lesson_id' => $lesson->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(
                ['error' => 'AI service temporarily unavailable. Please try again.'],
                502
            );
        }

        // Persist the chat log; log silently on failure and continue
        $logId = null;
        try {
            $imageIds = array_column($imageData, 'id');
            $log = LessonChatLog::create([
                'student_id'        => $student->id,
                'lesson_id'         => $lesson->id,
                'question'          => $question,
                'response'          => $responseText,
                'material_image_ids'=> !empty($imageIds) ? $imageIds : null,
                'source'            => $source,
                'retrieved_chunk_count' => $chunkCount,
                'confidence_score'  => $confidenceScore,
            ]);
            $logId = $log->id;
        } catch (\Throwable $e) {
            Log::warning('LessonChat failed to persist chat log', [
                'lesson_id' => $lesson->id,
                'student_id' => $student->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'response' => $responseText,
            'source' => $source,
            'log_id' => $logId,
            'lesson_id' => $lesson->id,
            'images' => $imageData,
        ]);
    }

    /**
     * Extract image metadata from retrieved chunks for the frontend.
     *
     * @param  \Illuminate\Support\Collection  $chunks  Retrieved lesson embedding rows
     * @return array<int, array{id: int, url: string, caption: string, page_number: int|null}>
     */
    private function extractImageData(\Illuminate\Support\Collection $chunks): array
    {
        $imageChunks = $chunks->filter(
            fn ($chunk) => ($chunk->content_type ?? 'text') === 'image' && !empty($chunk->material_image_id)
        );

        if ($imageChunks->isEmpty()) {
            return [];
        }

        $imageIds = $imageChunks->pluck('material_image_id')->unique()->values()->toArray();
        $images = MaterialImage::whereIn('id', $imageIds)->get()->keyBy('id');

        $data = [];
        foreach ($imageChunks as $chunk) {
            $image = $images->get($chunk->material_image_id);
            if ($image && $image->url) {
                $data[] = [
                    'id' => $image->id,
                    'url' => $image->url,
                    'caption' => $chunk->chunk_text,
                    'page_number' => $chunk->page_number,
                ];
            }
        }

        return $data;
    }

    /**
     * POST /api/student/lessons/{lesson}/chat-images
     * Returns image metadata for a given set of image IDs.
     * Used by the frontend to hydrate images in chat history.
     */
    public function chatImages(Request $request, Lesson $lesson): JsonResponse
    {
        $validated = $request->validate([
            'image_ids'   => 'required|array',
            'image_ids.*' => 'integer|exists:material_images,id',
        ]);

        $images = MaterialImage::whereIn('id', $validated['image_ids'])
            ->whereIn('extraction_status', ['extracted', 'captioning'])
            ->get();

        $data = [];
        foreach ($images as $img) {
            if ($img->url) {
                $data[] = [
                    'id'          => $img->id,
                    'url'         => $img->url,
                    'caption'     => $img->caption,
                    'page_number' => $img->page_number,
                ];
            }
        }

        return response()->json(['images' => $data]);
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

        if (! $isEnrolled) {
            return response()->json(['error' => 'You are not enrolled in the class for this lesson.'], 403);
        }

        $logs = LessonChatLog::where('student_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->with('reviewer:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($logs);
    }

    /**
     * POST /api/student/lessons/{lesson}/chat-logs/{log}/pin
     * Saves a pin so the student can quickly return to this AI answer.
     */
    public function pinLog(Request $request, Lesson $lesson, LessonChatLog $log): JsonResponse
    {
        $student = $request->user();

        if (! $this->isOwnLog($student->id, $lesson->id, $log)) {
            return response()->json(['error' => 'This chat log does not belong to you.'], 403);
        }

        DB::table('pinned_lesson_chat_logs')->updateOrInsert(
            ['user_id' => $student->id, 'lesson_chat_log_id' => $log->id],
            ['created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['pinned' => true]);
    }

    /**
     * DELETE /api/student/lessons/{lesson}/chat-logs/{log}/unpin
     * Removes a previously saved pin.
     */
    public function unpinLog(Request $request, Lesson $lesson, LessonChatLog $log): JsonResponse
    {
        $student = $request->user();

        DB::table('pinned_lesson_chat_logs')
            ->where('user_id', $student->id)
            ->where('lesson_chat_log_id', $log->id)
            ->delete();

        return response()->json(['pinned' => false]);
    }

    /**
     * GET /api/student/lessons/{lesson}/pinned-chat-logs
     * Returns the authenticated student's pinned AI answers for this lesson.
     */
    public function getPinnedLogs(Request $request, Lesson $lesson): JsonResponse
    {
        $student = $request->user();

        $isEnrolled = $lesson->topic->schoolClass->students()
            ->where('users.id', $student->id)
            ->exists();

        if (! $isEnrolled) {
            return response()->json(['error' => 'You are not enrolled in the class for this lesson.'], 403);
        }

        $pins = DB::table('pinned_lesson_chat_logs as p')
            ->join('lesson_chat_logs as l', 'l.id', '=', 'p.lesson_chat_log_id')
            ->where('p.user_id', $student->id)
            ->where('l.lesson_id', $lesson->id)
            ->select(
                'l.*',
                'p.lesson_chat_log_id',
                'p.created_at as pinned_at'
            )
            ->orderBy('p.created_at', 'desc')
            ->get();

        return response()->json($pins);
    }

    private function isOwnLog(int $studentId, int $lessonId, LessonChatLog $log): bool
    {
        return $log->student_id === $studentId && $log->lesson_id === $lessonId;
    }
}
