<?php

namespace App\Services\Rag;

use Illuminate\Support\Collection;

class RagPromptBuilder
{
    /**
     * Build the Mistral messages array for a lesson chat request.
     *
     * @param  Collection  $chunks   Retrieved lesson embedding chunks (each has chunk_text)
     * @param  Collection  $history  Recent LessonChatLog records (question, response, created_at)
     * @param  string      $question The student's current question
     * @param  string      $source   One of: 'lesson_materials' | 'mixed' | 'general'
     * @return array       Full messages array: [system, ...history pairs, user]
     */
    public function build(
        Collection $chunks,
        Collection $history,
        string     $question,
        string     $source = 'general'
    ): array {
        $systemContent = $this->buildSystemPrompt($chunks, $source);

        $messages = [['role' => 'system', 'content' => $systemContent]];

        // Add up to last 5 history pairs, ordered by created_at ascending
        foreach ($history->sortBy('created_at')->take(5) as $log) {
            $messages[] = ['role' => 'user',      'content' => $log->question];
            $messages[] = ['role' => 'assistant', 'content' => $log->response];
        }

        // Current question as the final user message
        $messages[] = ['role' => 'user', 'content' => $question];

        return $messages;
    }

    private function buildSystemPrompt(Collection $chunks, string $source): string
    {
        $base = "You are a helpful lesson assistant for a Filipino student on the LearnShift platform. "
              . "Be concise, friendly, and educational.";

        if ($source === 'general' || $chunks->isEmpty()) {
            return $base . "\n\n"
                 . "No indexed lesson materials are available for this lesson. "
                 . "Answer the student's question using your general knowledge.";
        }

        $context = $chunks->map(fn ($chunk) => $chunk->chunk_text)->implode("\n\n---\n\n");

        if ($source === 'lesson_materials') {
            return $base . "\n\n"
                 . "Answer the student's question using ONLY the lesson materials provided below. "
                 . "Do not use information outside these materials.\n\n"
                 . "=== LESSON MATERIALS ===\n\n" . $context . "\n\n========================";
        }

        // source === 'mixed': use lesson context first, supplement with general knowledge
        return $base . "\n\n"
             . "Answer the student's question using the lesson materials below as your primary source. "
             . "Where the materials are insufficient, supplement your answer with your general knowledge.\n\n"
             . "=== LESSON MATERIALS ===\n\n" . $context . "\n\n========================";
    }
}
