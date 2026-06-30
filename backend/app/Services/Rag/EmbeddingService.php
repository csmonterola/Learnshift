<?php

namespace App\Services\Rag;

use App\Exceptions\EmbeddingException;
use Illuminate\Support\Facades\Http;

class EmbeddingService
{
    private const API_URL = 'https://api.mistral.ai/v1/embeddings';
    private const MODEL   = 'mistral-embed';

    /**
     * Embed a single text string and return its float vector.
     *
     * @param  string  $text
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
        $response = Http::timeout(30)
            ->withToken(config('services.mistral.api_key'))
            ->withoutVerifying()
            ->post(self::API_URL, [
                'model' => config('services.mistral.embedding_model', 'mistral-embed'),
                'input' => $texts,
            ]);

        if ($response->failed()) {
            throw new EmbeddingException(
                'Mistral embedding API error: HTTP ' . $response->status()
            );
        }

        $data = $response->json('data');

        if (!is_array($data)) {
            throw new EmbeddingException(
                'Mistral embedding API returned unexpected response format'
            );
        }

        // Sort by index to ensure input order is preserved regardless of API response ordering
        usort($data, fn ($a, $b) => $a['index'] <=> $b['index']);

        return array_map(fn ($item) => $item['embedding'], $data);
    }
}
