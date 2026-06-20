<?php

namespace App\Services\Quiz;

use Illuminate\Support\Collection;

class QuizPromptBuilder
{
    /**
     * Build the Mistral messages array for question generation.
     *
     * @param  Collection  $chunks    Retrieved lesson embedding chunks
     * @param  string      $lessonTitle  Title of the lesson
     * @param  string      $mode      'practice' or 'quiz'
     * @param  int         $count     Number of questions to generate (default 5)
     * @return array       Full messages array for Mistral chat completions
     */
    public function build(
        Collection $chunks,
        string     $lessonTitle,
        string     $mode = 'practice',
        int        $count = 5,
    ): array {
        $context = $chunks->map(fn ($chunk) => $chunk->chunk_text)->implode("\n\n---\n\n");

        $systemPrompt = $this->buildSystemPrompt($mode, $count);
        $userPrompt   = $this->buildUserPrompt($lessonTitle, $context, $mode, $count);

        return [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => $userPrompt],
        ];
    }

    private function buildSystemPrompt(string $mode, int $count): string
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
              . "7. You MUST respond with ONLY a valid JSON array — no markdown, no code fences, no extra text.\n";

        if ($mode === 'practice') {
            $base .= "\nMODE: PRACTICE\n"
                   . "Focus on reinforcing understanding. Questions should help students learn and self-assess.\n"
                   . "Mix easy, medium, and hard questions.\n";
        } else {
            $base .= "\nMODE: QUIZ (ASSESSMENT)\n"
                   . "Focus on evaluating mastery. Questions should test core concepts and application.\n"
                   . "Weight towards medium and hard difficulty.\n";
        }

        $base .= "\nRESPONSE FORMAT (JSON array only):\n"
               . '[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct_index":0,"explanation":"...","difficulty":"easy|medium|hard"}]';

        return $base;
    }

    private function buildUserPrompt(string $lessonTitle, string $context, string $mode, int $count): string
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
}