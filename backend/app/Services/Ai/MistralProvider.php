<?php

namespace App\Services\Ai;

use App\Exceptions\EmbeddingException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MistralProvider implements AiProviderInterface
{
    private const CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';

    private const EMBED_URL = 'https://api.mistral.ai/v1/embeddings';

    public function chat(array $messages, array $options = []): array
    {
        $apiKey = config('services.mistral.api_key');
        $model = $options['model'] ?? config('services.mistral.model', 'mistral-small-latest');

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'max_tokens' => $options['max_tokens'] ?? 600,
            'temperature' => $options['temperature'] ?? 0.7,
        ];

        $maxAttempts = 3;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => "Bearer {$apiKey}",
                    'Content-Type' => 'application/json',
                ])->timeout(30)
                    ->withoutVerifying()
                    ->post(self::CHAT_URL, $payload);

                if ($response->failed()) {
                    $status = $response->status();
                    $body = $response->body();

                    // Retry on 429 (rate limit) and 5xx (server errors)
                    if ($attempt < $maxAttempts && ($status === 429 || $status >= 500)) {
                        Log::warning('Mistral chat API transient error, retrying', [
                            'attempt' => $attempt,
                            'status' => $status,
                        ]);
                        sleep($attempt * 2);
                        continue;
                    }

                    Log::error('Mistral chat API error', [
                        'status' => $status,
                        'body' => $body,
                    ]);
                    throw new \RuntimeException(
                        'AI service temporarily unavailable. Please try again.'
                    );
                }
            } catch (ConnectionException $e) {
                throw new \RuntimeException(
                    'AI service temporarily unavailable. Please try again.'
                );
            }

            $content = $response->json('choices.0.message.content')
                ?? throw new \RuntimeException('AI service returned an empty response.');

            return [
                'content' => $content,
                'raw' => $response->json(),
            ];
        }

        throw new \RuntimeException('AI service temporarily unavailable. Please try again.');
    }

    public function embed(array $texts): array
    {
        $batchSize = config('services.mistral.embedding_batch_size', 20);
        $concurrency = config('services.mistral.embedding_concurrency', 3);
        $batches = array_chunk($texts, $batchSize);

        if (count($batches) <= 1) {
            return $this->sendEmbeddingRequest($texts);
        }

        $vectors = [];

        // Split batches into concurrent windows to cap concurrency
        foreach (array_chunk($batches, $concurrency) as $window) {
            try {
                $responses = Http::pool(fn (Pool $pool) => array_map(
                    fn (array $batch) => $pool
                        ->timeout(30)
                        ->withToken(config('services.mistral.api_key'))
                        ->withoutVerifying()
                        ->post(self::EMBED_URL, [
                            'model' => config('services.mistral.embedding_model', 'mistral-embed'),
                            'input' => $batch,
                        ]),
                    $window
                ));

                $batchVectors = $this->collectPoolResponses($responses);
                array_push($vectors, ...$batchVectors);
            } catch (ConnectionException|EmbeddingException $e) {
                Log::warning('Mistral embed pool failed, falling back to sequential', [
                    'error' => $e->getMessage(),
                ]);
                foreach ($window as $batch) {
                    $batchVectors = $this->sendEmbeddingRequest($batch);
                    array_push($vectors, ...$batchVectors);
                }
            }
        }

        return $vectors;
    }

    private function sendEmbeddingRequest(array $texts): array
    {
        $maxAttempts = 2;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            $response = Http::timeout(30)
                ->withToken(config('services.mistral.api_key'))
                ->withoutVerifying()
                ->post(self::EMBED_URL, [
                    'model' => config('services.mistral.embedding_model', 'mistral-embed'),
                    'input' => $texts,
                ]);

            if ($response->failed()) {
                if ($attempt < $maxAttempts && ($response->status() === 429 || $response->status() >= 500)) {
                    Log::warning('Mistral embed transient error, retrying', [
                        'attempt' => $attempt,
                        'status' => $response->status(),
                    ]);
                    sleep(2);
                    continue;
                }

                throw new EmbeddingException(
                    'Mistral embedding API error: HTTP '.$response->status()
                );
            }

            return self::parseEmbeddingResponse($response->json());
        }

        throw new EmbeddingException('Mistral embedding API error after retries');
    }

    private static function parseEmbeddingResponse(?array $data): array
    {
        if (! is_array($data) || ! isset($data['data'])) {
            throw new EmbeddingException(
                'Mistral embedding API returned unexpected response format'
            );
        }

        $items = $data['data'];
        usort($items, fn ($a, $b) => $a['index'] <=> $b['index']);

        return array_map(fn ($item) => $item['embedding'], $items);
    }

    /**
     * Generate a text caption for an image using a multimodal (vision) request.
     *
     * Uses a vision-capable model (pixtral). Sends a single-turn user message
     * containing the image URL and a descriptive prompt.
     *
     * @param  string  $imageUrl  Publicly accessible URL of the image.
     * @return string  Caption text (1–3 sentences).
     *
     * @throws \RuntimeException On API failure or connection error.
     */
    public function caption(string $imageUrl): string
    {
        $visionModel = config('services.mistral.vision_model', 'pixtral-12b-2409');

        $messages = [
            [
                'role' => 'user',
                'content' => [
                    [
                        'type' => 'text',
                        'text' => 'Describe this image factually in 1-3 sentences for use as a searchable caption in an educational context. Mention any labeled text, diagram type, chart data, or key visual elements. Do not speculate beyond what is visible.',
                    ],
                    [
                        'type' => 'image_url',
                        'image_url' => [
                            'url' => $imageUrl,
                        ],
                    ],
                ],
            ],
        ];

        $result = $this->chat($messages, [
            'model' => $visionModel,
            'max_tokens' => 150,
            'temperature' => 0.3,
        ]);

        return $result['content'];
    }

    public function supportsVision(): bool
    {
        return true;
    }

    private function collectPoolResponses(array $responses): array
    {
        $vectors = [];

        foreach ($responses as $response) {
            if ($response->failed()) {
                throw new EmbeddingException(
                    'Mistral embedding API error: HTTP '.$response->status()
                );
            }

            array_push($vectors, ...self::parseEmbeddingResponse($response->json()));
        }

        return $vectors;
    }
}
