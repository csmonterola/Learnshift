<?php

namespace App\Services\Rag;

class TextChunker
{
    /**
     * Split text into overlapping chunks.
     *
     * Token approximation: 1 token ≈ 4 characters.
     *
     * @param  string  $text
     * @param  int     $maxTokens  Maximum tokens per chunk (default 500)
     * @param  int     $overlap    Overlap in tokens between consecutive chunks (default 50)
     * @return array<string>
     */
    public function chunk(string $text, int $maxTokens = 500, int $overlap = 50): array
    {
        $text = trim($text);

        if ($text === '') {
            return [];
        }

        $maxChars     = $maxTokens * 4;
        $overlapChars = $overlap * 4;

        // If the whole text fits in one chunk, return it directly
        if (mb_strlen($text) <= $maxChars) {
            return [$text];
        }

        // Split on whitespace to get words
        $words = preg_split('/\s+/', $text, -1, PREG_SPLIT_NO_EMPTY);

        $chunks       = [];
        $currentWords = [];
        $currentLen   = 0;

        foreach ($words as $word) {
            $wordLen = mb_strlen($word) + 1; // +1 for the space separator

            if ($currentLen + $wordLen > $maxChars && !empty($currentWords)) {
                // Seal the current chunk
                $chunks[] = implode(' ', $currentWords);

                // Carry over the overlap: keep the last N characters worth of words
                $overlapWords = [];
                $overlapLen   = 0;
                foreach (array_reverse($currentWords) as $w) {
                    $wLen = mb_strlen($w) + 1;
                    if ($overlapLen + $wLen > $overlapChars) {
                        break;
                    }
                    array_unshift($overlapWords, $w);
                    $overlapLen += $wLen;
                }

                $currentWords = $overlapWords;
                $currentLen   = $overlapLen;
            }

            $currentWords[] = $word;
            $currentLen    += $wordLen;
        }

        // Add any remaining words as the last chunk
        if (!empty($currentWords)) {
            $chunks[] = implode(' ', $currentWords);
        }

        return $chunks;
    }
}
