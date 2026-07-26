<?php

namespace App\Services\Rag;

use App\Models\MaterialImage;
use Illuminate\Support\Collection;

class RagPromptBuilder
{
    private const MAX_IMAGES = 5;

    /**
     * Build the Mistral messages array for a lesson chat request.
     *
     * The system prompt includes:
     * 1. Standard lesson context from retrieved chunks
     * 2. A "Visual Resources Available" section listing ALL image captions with
     *    page numbers, so the AI knows what visual content exists even if the
     *    image embedding didn't match the question semantically.
     * 3. Instructions to reference images using [Image: page N] markers.
     *
     * The user message only includes actual image_url data for the top-5
     * semantically relevant images (to conserve tokens and cost).
     *
     * @param  Collection  $chunks    Retrieved lesson embedding rows
     * @param  Collection  $history   Recent LessonChatLog records
     * @param  string      $question  The student's current question
     * @param  string      $source    One of: 'lesson_materials' | 'mixed' | 'general'
     * @param  Collection|null $allImages All extracted images for this material
     * @return array       Full messages array: [system, ...history pairs, user]
     */
    public function build(
        Collection $chunks,
        Collection $history,
        string     $question,
        string     $source = 'general',
        ?Collection $allImages = null,
    ): array {
        $systemContent = $this->buildSystemPrompt($chunks, $source, $allImages);

        $messages = [['role' => 'system', 'content' => $systemContent]];

        // Add up to last 5 history pairs, ordered by created_at ascending
        foreach ($history->sortBy('created_at')->take(5) as $log) {
            $messages[] = ['role' => 'user',      'content' => $log->question];
            $messages[] = ['role' => 'assistant', 'content' => $log->response];
        }

        // Build the final user message — interleaves context text + relevant images.
        // Only images from semantically relevant top-5 chunks are included.
        // The system prompt already lists all available visual resources as text.
        $userContent = $this->buildUserContent($chunks, $question);

        $messages[] = ['role' => 'user', 'content' => $userContent];

        return $messages;
    }

    /**
     * Build the system prompt with context, visual resources, and image usage instructions.
     */
    private function buildSystemPrompt(Collection $chunks, string $source, ?Collection $allImages = null): string
    {
        $base = "You are a helpful lesson assistant for a Filipino student on the LearnShift platform. "
              . "Be concise, friendly, and educational.";

        if ($source === 'general' || $chunks->isEmpty()) {
            return $base . "\n\n"
                 . "No indexed lesson materials are available for this lesson. "
                 . "Answer the student's question using your general knowledge.";
        }

        // ── Lesson context from retrieved chunks ──
        $contextParts = [];

        foreach ($chunks as $chunk) {
            $text = $chunk->chunk_text;
            if (($chunk->content_type ?? 'text') === 'image') {
                $page = $chunk->page_number;
                $pageLabel = $page ? "page {$page}" : "unknown page";
                $text = "[Image, {$pageLabel}]: {$text}";
            }
            $contextParts[] = $text;
        }

        $context = implode("\n\n---\n\n", $contextParts);

        // ── Visual Resources Available section ──
        // Lists available extracted images so the AI can reference them.
        // null  → no images exist in this material (skip entirely).
        // empty → images exist but none have been captioned yet (inform the AI).
        // non-empty → captioned images are ready for reference.
        $visualResources = '';
        if ($allImages === null) {
            // No images at all — don't mention visual resources.
        } elseif ($allImages->isEmpty()) {
            $visualResources = "\n\n=== VISUAL RESOURCES ===\n"
                . "This material contains images, but their descriptions are still being generated. "
                . "Do not reference specific images in your response."
                . "\n\n================================";
        } else {
            $imageLines = [];
            foreach ($allImages as $img) {
                $pageLabel = $img->page_number ? "page {$img->page_number}" : "unknown page";
                $imageLines[] = "- [Image: {$img->id}] ({$pageLabel}) {$img->caption}";
            }
            $visualResources = "\n\n=== VISUAL RESOURCES AVAILABLE ===\n"
                . "The following images are embedded in the lesson materials. "
                . "Each image has a unique ID in square brackets. "
                . "When the student asks about a topic that corresponds to one of these images, "
                . "or when a visual would help explain the answer, reference the image using "
                . "the exact marker `[Image: ID]` (replace ID with the number in brackets) "
                . "in your response. The system will automatically display that exact image "
                . "at that point in the conversation.\n\n"
                . implode("\n", $imageLines)
                . "\n\n================================";
        }

        $instruction = $source === 'lesson_materials'
            ? "Answer the student's question using ONLY the lesson materials provided below. Do not use information outside these materials."
            : "Answer the student's question using the lesson materials below as your primary source. Where the materials are insufficient, supplement your answer with your general knowledge.";

        $prompt = $base . "\n\n" . $instruction . "\n\n=== LESSON MATERIALS ===\n\n";

        if ($context !== '') {
            $prompt .= $context . "\n\n";
        }

        $prompt .= "========================";

        // Append visual resources listing to the system prompt
        if ($visualResources !== '') {
            $prompt .= $visualResources;
        }

        return $prompt;
    }

    /**
     * Build the user message content array with context text and relevant images
     * interleaved at their natural position.
     *
     * Only images from the semantically relevant top-5 chunks are included as
     * actual image_url data. The system prompt already lists all available images.
     *
     * @return array<int, array{type: string, mixed}>
     */
    private function buildUserContent(Collection $chunks, string $question): array
    {
        // Separate text and image chunks
        $textChunks = $chunks->filter(fn ($c) => ($c->content_type ?? 'text') !== 'image');
        $imageChunks = $chunks->filter(
            fn ($c) => ($c->content_type ?? 'text') === 'image' && !empty($c->material_image_id)
        );

        // If no images in the top-5, return plain text question only.
        // The system prompt already lists all available visual resources.
        if ($imageChunks->isEmpty()) {
            return [['type' => 'text', 'text' => $question]];
        }

        // Load image metadata
        $imageIds = $imageChunks->pluck('material_image_id')->unique()->values()->toArray();
        $images = MaterialImage::whereIn('id', $imageIds)->get()->keyBy('id');

        // Build an ordered sequence of all retrieved items (text + image) by page/chunk
        $allItems = collect();

        foreach ($textChunks as $chunk) {
            $allItems->push([
                'type'       => 'text',
                'page'       => $chunk->page_number ?? 0,
                'chunk_idx'  => $chunk->chunk_index ?? 0,
                'text'       => $chunk->chunk_text,
            ]);
        }

        foreach ($imageChunks as $chunk) {
            $image = $images->get($chunk->material_image_id);
            if (!$image || !$image->url) {
                continue;
            }
            $allItems->push([
                'type'       => 'image',
                'page'       => $chunk->page_number ?? 0,
                'chunk_idx'  => $chunk->chunk_index ?? 0,
                'caption'    => $chunk->chunk_text,
                'url'        => $image->url,
            ]);
        }

        // Sort by page_number then chunk_index to reconstruct document flow
        $allItems = $allItems->sort(function ($a, $b) {
            return [$a['page'], $a['chunk_idx']] <=> [$b['page'], $b['chunk_idx']];
        })->values();

        // Build the content parts array, starting with the question
        $parts = [['type' => 'text', 'text' => $question]];
        $imageCount = 0;

        // Accumulate consecutive text items, separating by "---"
        $textBuffer = '';

        foreach ($allItems as $item) {
            if ($item['type'] === 'text') {
                if ($textBuffer !== '') {
                    $textBuffer .= "\n\n---\n\n";
                }
                $textBuffer .= $item['text'];
            } elseif ($item['type'] === 'image' && $imageCount < self::MAX_IMAGES) {
                // Flush any buffered text before the image
                if ($textBuffer !== '') {
                    $parts[] = ['type' => 'text', 'text' => $textBuffer];
                    $textBuffer = '';
                }

                $pageLabel = $item['page'] ? "page {$item['page']}" : "unknown page";
                $parts[] = [
                    'type' => 'text',
                    'text' => "[Image, {$pageLabel}]: {$item['caption']}",
                ];
                $parts[] = [
                    'type' => 'image_url',
                    'image_url' => ['url' => $item['url']],
                ];
                $imageCount++;
            }
        }

        // Flush any remaining text
        if ($textBuffer !== '') {
            $parts[] = ['type' => 'text', 'text' => $textBuffer];
        }

        return $parts;
    }
}