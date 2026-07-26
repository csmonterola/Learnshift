<?php

namespace App\Services\Rag;

use App\Exceptions\EmbeddingException;
use App\Services\Ai\AiProviderFactory;

class EmbeddingService
{
    /**
     * Embed a single text string and return its float vector.
     *
     * @return float[]
     *
     * @throws EmbeddingException
     */
    public function embed(string $text): array
    {
        $vectors = $this->embedBatch([$text]);

        return $vectors[0];
    }

    /**
     * Embed multiple texts in a single API call and return an array of vectors
     * in the same order as the input.
     *
     * @param  string[]  $texts
     * @return float[][]
     *
     * @throws EmbeddingException
     */
    public function embedBatch(array $texts): array
    {
        try {
            $provider = AiProviderFactory::make('embedding');

            return $provider->embed($texts);
        } catch (\RuntimeException $e) {
            throw new EmbeddingException(
                'Embedding failed: '.$e->getMessage(),
                0,
                $e
            );
        }
    }
}
