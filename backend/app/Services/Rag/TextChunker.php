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
        return array_map(
            fn($item) => $item['text'],
            $this->chunkWithPages([['page_number' => null, 'text' => $text]], $maxTokens, $overlap)
        );
    }

    /**
     * Split per-page text into overlapping chunks, tagging each chunk with the
     * page_number it originated from.
     *
     * Input:  [{page_number: int|null, text: string}, ...]
     * Output: [{page_number: int|null, text: string}, ...]
     *
     * If a chunk's word-boundary overlap spans two pages, it is tagged with the
     * page it *started* on (documented choice — the chunk primarily belongs to
     * the page where its content began).
     *
     * @param  array{page_number: int|null, text: string}[]  $pagedText
     * @param  int  $maxTokens
     * @param  int  $overlap
     * @return array{page_number: int|null, text: string}[]
     */
    public function chunkWithPages(array $pagedText, int $maxTokens = 500, int $overlap = 50): array
    {
        if (empty($pagedText)) {
            return [];
        }

        $maxChars     = $maxTokens * 4;
        $overlapChars = $overlap * 4;

        // Build word-indexed array where each word knows its page_number
        $wordEntries = [];     // [{word, page_number}]
        foreach ($pagedText as $page) {
            $pageNum = $page['page_number'];
            $words = preg_split('/\s+/', trim($page['text']), -1, PREG_SPLIT_NO_EMPTY);
            foreach ($words as $word) {
                $wordEntries[] = [
                    'word'        => $word,
                    'page_number' => $pageNum,
                ];
            }
        }

        if (empty($wordEntries)) {
            return [];
        }

        // If the entire text fits in one chunk, return it directly
        $totalChars = array_sum(array_map(fn($e) => mb_strlen($e['word']) + 1, $wordEntries));
        if ($totalChars <= $maxChars) {
            $allText = implode(' ', array_map(fn($e) => $e['word'], $wordEntries));
            return [['page_number' => $wordEntries[0]['page_number'], 'text' => $allText]];
        }

        $chunks       = [];
        $currentWords = [];   // word entries for the current chunk
        $currentLen   = 0;
        $pageOverride = null; // if set, overrides the page tag for this chunk

        foreach ($wordEntries as $entry) {
            $wordLen = mb_strlen($entry['word']) + 1;

            if ($currentLen + $wordLen > $maxChars && !empty($currentWords)) {
                $pageTag = $pageOverride ?? $currentWords[0]['page_number'];

                $chunks[] = [
                    'page_number' => $pageTag,
                    'text'        => implode(' ', array_map(fn($e) => $e['word'], $currentWords)),
                ];

                // Overlap: keep the last N characters worth of words from the sealed chunk
                $overlapWords = [];
                $overlapLen   = 0;
                foreach (array_reverse($currentWords) as $w) {
                    $wLen = mb_strlen($w['word']) + 1;
                    if ($overlapLen + $wLen > $overlapChars) {
                        break;
                    }
                    array_unshift($overlapWords, $w);
                    $overlapLen += $wLen;
                }

                $currentWords = $overlapWords;
                $currentLen   = $overlapLen;
                $pageOverride = null;
            }

            $currentWords[] = $entry;
            $currentLen    += $wordLen;
        }

        // Remaining words as the last chunk
        if (!empty($currentWords)) {
            $pageTag = $pageOverride ?? $currentWords[0]['page_number'];
            $chunks[] = [
                'page_number' => $pageTag,
                'text'        => implode(' ', array_map(fn($e) => $e['word'], $currentWords)),
            ];
        }

        return $chunks;
    }
}
