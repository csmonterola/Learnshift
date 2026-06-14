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
     * @return array       Full messages array: [system, ...history pairs, user]
     */
    public function build(Collection $chunks, Collection $history, string $question): array
    {
        $systemContent = $this->buildSystemPrompt($chunks);

        $messages = [
            ['role' => 'system', 'content' => $systemContent],
        ];

        // Add up to last 5 history pairs, ordered by created_at ascending
        foreach ($history->sortBy('created_at')->take(5) as $log) {
            $messages[] = ['role' => 'user',      'content' => $log->question];
            $messages[] = ['role' => 'assistant', 'content' => $log->response];
        }

        // Current question as the final user message
        $messages[] = ['role' => 'user', 'content' => $question];

        return $messages;
    }

    private function buildSystemPrompt(Collection $chunks): string
    {
        if ($chunks->isEmpty()) {
            return "You are a helpful lesson assistant.\n\n"
                 . "No indexed lesson materials are available for this lesson. "
                 . "Answering from general knowledge.";
        }

        $context = $chunks->map(fn ($chunk) => $chunk->chunk_text)->implode("\n\n---\n\n");

        return "You are a helpful lesson assistant. "
             . "Answer the student's question using ONLY the lesson materials provided below. "
             . "If the answer cannot be found in the materials, say so clearly.\n\n"
             . "=== LESSON MATERIALS ===\n\n"
             . $context
             . "\n\n========================";
    }
}
