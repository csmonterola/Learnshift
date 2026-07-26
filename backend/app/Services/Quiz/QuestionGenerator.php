<?php

namespace App\Services\Quiz;

use App\Models\Lesson;
use App\Services\Ai\AiProviderFactory;
use App\Services\Rag\EmbeddingService;
use App\Services\Rag\LessonRetriever;
use Illuminate\Support\Facades\Log;

class QuestionGenerator
{
    public function __construct(
        private readonly EmbeddingService $embeddingService,
        private readonly LessonRetriever $retriever,
        private readonly QuizPromptBuilder $promptBuilder,
    ) {}

    /**
     * Generate multiple-choice questions for a lesson.
     *
     * Uses the RAG pipeline to retrieve relevant lesson chunks, then asks
     * Mistral AI to generate questions based on that content.
     *
     * @param  Lesson  $lesson  The lesson to generate questions for
     * @param  string  $mode  'practice' or 'quiz'
     * @param  int  $count  Number of questions (default 5)
     * @return array ['questions' => [...], 'source' => string]
     *
     * @throws \RuntimeException On AI service failure
     */
    public function generate(Lesson $lesson, string $mode = 'practice', int $count = 5): array
    {
        // Step 1: Embed the lesson title + content as the query vector
        $queryText = $lesson->title;
        if ($lesson->content) {
            $queryText .= ' '.substr($lesson->content, 0, 500);
        }

        try {
            $queryVector = $this->embeddingService->embed($queryText);
        } catch (\Throwable $e) {
            Log::warning('QuestionGenerator embedding failed, proceeding without RAG context', [
                'lesson_id' => $lesson->id,
                'error' => $e->getMessage(),
            ]);
            $queryVector = null;
        }

        // Step 2: Retrieve relevant chunks (if embedding succeeded)
        $chunks = collect();
        $source = 'general';

        if ($queryVector) {
            $chunks = $this->retriever->retrieve($lesson->id, $queryVector, 8);
            if ($chunks->count() >= 2) {
                $source = 'lesson_materials';
            } elseif ($chunks->count() === 1) {
                $source = 'mixed';
            }
        }

        // Step 3: Build the prompt
        $messages = $this->promptBuilder->build($chunks, $lesson->title, $mode, $count);

        // Step 4: Call AI provider
        try {
            $provider = AiProviderFactory::make('chat');
            $result = $provider->chat($messages, [
                'max_tokens' => 2000,
                'temperature' => 0.7,
            ]);
            $responseText = $result['content'];
        } catch (\RuntimeException $e) {
            Log::error('QuestionGenerator AI provider error', [
                'lesson_id' => $lesson->id,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('AI service temporarily unavailable. Please try again.');
        }

        // Step 5: Parse the JSON response
        $questions = $this->parseResponse($responseText, $lesson->id);

        return [
            'questions' => $questions,
            'source' => $source,
        ];
    }

    /**
     * Parse the AI response into a structured question array.
     * Handles common formatting issues (markdown fences, extra text, etc.)
     */
    private function parseResponse(string $responseText, int $lessonId): array
    {
        // Strip markdown code fences if present
        $cleaned = trim($responseText);
        $cleaned = preg_replace('/^```(?:json)?\s*/i', '', $cleaned);
        $cleaned = preg_replace('/\s*```$/i', '', $cleaned);
        $cleaned = trim($cleaned);

        // Try to extract JSON array if there's surrounding text
        if (!str_starts_with($cleaned, '[')) {
            // Check for bare object {...} and wrap it in an array
            if (str_starts_with($cleaned, '{')) {
                $start = strpos($cleaned, '{');
                $end = strrpos($cleaned, '}');
                if ($start !== false && $end !== false && $end > $start) {
                    $cleaned = '[' . substr($cleaned, $start, $end - $start + 1) . ']';
                    Log::info('QuestionGenerator parseResponse wrapped bare object in array', [
                        'lesson_id' => $lessonId,
                    ]);
                }
            } else {
                $start = strpos($cleaned, '[');
                $end = strrpos($cleaned, ']');
                if ($start !== false && $end !== false && $end > $start) {
                    $cleaned = substr($cleaned, $start, $end - $start + 1);
                }
            }
        }

        // Strip trailing commas before decoding (common AI output issue)
        $before = $cleaned;
        $cleaned = preg_replace('/,\s*([\]}])/', '$1', $cleaned);
        if ($cleaned !== $before) {
            Log::info('QuestionGenerator parseResponse stripped trailing commas', [
                'lesson_id' => $lessonId,
            ]);
        }

        $decoded = json_decode($cleaned, true);

        if (! is_array($decoded) || empty($decoded)) {
            Log::error('QuestionGenerator failed to parse AI response', [
                'lesson_id' => $lessonId,
                'response' => substr($responseText, 0, 500),
            ]);
            throw new \RuntimeException('Failed to generate questions. Please try again.');
        }

        // Validate and normalize each question
        $questions = [];
        foreach ($decoded as $i => $q) {
            if (! isset($q['question'], $q['options'], $q['correct_index'])) {
                continue; // Skip malformed questions
            }

            $options = $q['options'];
            // Clean option labels: strip "A) ", "A. ", etc.
            $options = array_map(fn ($opt) => preg_replace('/^[A-D][\.\)]\s*/i', '', trim($opt)), $options);

            // Ensure exactly 4 options
            while (count($options) < 4) {
                $options[] = 'None of the above';
            }
            $options = array_slice($options, 0, 4);

            $questions[] = [
                'index' => $i,
                'question' => trim($q['question']),
                'options' => $options,
                'correct_index' => (int) $q['correct_index'],
                'explanation' => trim($q['explanation'] ?? ''),
                'difficulty' => $q['difficulty'] ?? 'medium',
                'image_url' => $q['image_url'] ?? null,
                'option_image_urls' => $q['option_image_urls'] ?? null,
            ];
        }

        if (empty($questions)) {
            throw new \RuntimeException('Failed to generate valid questions. Please try again.');
        }

        return $questions;
    }
}
