<?php

namespace App\Services\Quiz;

use App\Models\MaterialImage;
use Illuminate\Support\Collection;

class QuizPromptBuilder
{
    /**
     * Build the Mistral messages array for question generation.
     *
     * Retrieved chunks may include both text rows (content_type='text') and
     * image rows (content_type='image' with material_image_id set).
     * Image rows are injected into the final user message as content-array parts
     * so Mistral can see the image directly (multimodal).
     *
     * @param  Collection  $chunks    Retrieved lesson embedding rows
     * @param  string      $lessonTitle  Title of the lesson
     * @param  string      $mode      'practice' or 'quiz'
     * @param  int         $count     Number of questions to generate (default 5)
     * @return array       Full messages array for Mistral chat completions
     */
    public function build(
        Collection    $chunks,
        string        $lessonTitle,
        string        $mode = 'practice',
        int           $count = 5,
        ?string       $difficulty = null,
    ): array {
        $systemPrompt = $this->buildSystemPrompt($mode, $count, $difficulty);
        $imageParts = $this->buildImageContentParts($chunks);

        if (empty($imageParts)) {
            // No images — plain text user message
            $textChunks = $chunks->filter(
                fn ($chunk) => ($chunk->content_type ?? 'text') === 'text'
            );
            $context = $textChunks->map(fn ($chunk) => $chunk->chunk_text)->implode("\n\n---\n\n");
            $userPrompt = $this->buildTextUserPrompt($lessonTitle, $context, $mode, $count);

            return [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user',   'content' => $userPrompt],
            ];
        }

        // Images present — use array-form content for the user message
        $userContentParts = array_merge(
            [['type' => 'text', 'text' => $this->buildImageUserPrompt($lessonTitle, $mode, $count)]],
            $imageParts
        );

        return [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => $userContentParts],
        ];
    }

    private function buildSystemPrompt(string $mode, int $count, ?string $difficulty = null): string
    {
        $base = "You are an expert educational assessment creator for the LearnShift platform, "
              . "designed for Filipino students. "
              . "You generate high-quality multiple-choice questions based on lesson content.\n\n"
              . "RULES:\n"
              . "1. Generate exactly {$count} questions.\n"
              . "2. Each question must have exactly 4 options (A, B, C, D).\n"
              . "3. Exactly ONE option must be correct.\n"
              . "4. Questions should be clear, concise, and grade-appropriate.\n"
              . "5. Include a brief explanation for the correct answer.\n"
              . "6. Vary difficulty levels across questions.\n"
              . "7. You MUST respond with ONLY a valid JSON array — no markdown, no code fences, no extra text.\n"
              . "8. Each question object may include two optional fields:\n"
              . '   "image_url": string|null — a URL to an image relevant to the question stem (only if provided in the lesson materials).' . "\n"
              . '   "option_image_urls": array of string|null — one per option, if an image is relevant to a specific choice.' . "\n"
              . "   ONLY populate these with a URL that was actually provided in the given lesson materials. "
              . "Never invent or guess a URL. Most questions should leave both null — "
              . "only use them when an image is genuinely relevant (e.g. 'label this diagram', 'which reaction is shown').\n";

        if ($mode === 'practice') {
            $base .= "\nMODE: PRACTICE\n"
                   . "Focus on reinforcing understanding. Questions should help students learn and self-assess.\n"
                   . "Mix easy, medium, and hard questions.\n";
        } else {
            $base .= "\nMODE: QUIZ (ASSESSMENT)\n"
                   . "Focus on evaluating mastery. Questions should test core concepts and application.\n"
                   . "Weight towards medium and hard difficulty.\n";
        }

        if ($difficulty && in_array(strtolower($difficulty), ['easy', 'medium', 'hard'], true)) {
            $base .= "\nDIFFICULTY TARGET: {$difficulty}\n"
                   . "Generate ALL questions at the {$difficulty} difficulty level.\n";
        }

        $base .= "\nRESPONSE FORMAT (JSON array only):\n"
               . '[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct_index":0,"explanation":"...","difficulty":"easy|medium|hard","image_url":null,"option_image_urls":[null,null,null,null]}]';

        return $base;
    }

    private function buildTextUserPrompt(string $lessonTitle, string $context, string $mode, int $count): string
    {
        $prompt = "Lesson: {$lessonTitle}\n\n";

        if (!empty($context)) {
            $prompt .= "=== LESSON MATERIALS ===\n\n{$context}\n\n========================\n\n";
            $prompt .= "Based on the lesson materials above, generate {$count} multiple-choice questions.\n";
        } else {
            $prompt .= "No indexed lesson materials are available for this lesson.\n"
                     . "Generate {$count} general multiple-choice questions related to the topic \"{$lessonTitle}\".\n";
        }

        $prompt .= "\nReturn ONLY the JSON array. No additional text.";

        return $prompt;
    }

    private function buildImageUserPrompt(string $lessonTitle, string $mode, int $count): string
    {
        $prompt = "Lesson: {$lessonTitle}\n\n";
        $prompt .= "Images from the lesson materials are provided below. "
                 . "They include descriptive captions. "
                 . "Refer to these images to generate {$count} multiple-choice questions.\n";
        $prompt .= "Where relevant, use the image_url and option_image_urls fields "
                 . "to link questions/options to specific images.\n\n";
        $prompt .= "Return ONLY the JSON array. No additional text.";

        return $prompt;
    }

    /**
     * Build content-array parts for image chunks.
     *
     * @return array<int, array{type: string, mixed}>
     */
    private function buildImageContentParts(Collection $chunks): array
    {
        $imageChunks = $chunks->filter(
            fn ($chunk) => ($chunk->content_type ?? 'text') === 'image' && !empty($chunk->material_image_id)
        );

        if ($imageChunks->isEmpty()) {
            return [];
        }

        $parts = [];

        foreach ($imageChunks as $chunk) {
            $caption = $chunk->chunk_text;
            $page = $chunk->page_number;

            $image = MaterialImage::find($chunk->material_image_id);
            $url = $image?->url;

            if (!$url) {
                continue;
            }

            $pageLabel = $page ? "page {$page}" : "unknown page";
            $parts[] = [
                'type' => 'text',
                'text' => "[Image, {$pageLabel}]: {$caption}",
            ];
            $parts[] = [
                'type' => 'image_url',
                'image_url' => [
                    'url' => $url,
                ],
            ];
        }

        return $parts;
    }
}