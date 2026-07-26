<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Ollama Cloud provider — uses the OpenAI-compatible API at
 * https://ollama.com/v1/chat/completions.
 *
 * @see https://docs.ollama.com/cloud  Ollama Cloud docs
 * @see https://docs.ollama.com/api/openai-compatibility  OpenAI compatibility
 *
 * ── Chat ─────────────────────────────────────────────────────────────
 * POST https://ollama.com/v1/chat/completions with Authorization: Bearer <api-key>
 * and the standard OpenAI request shape {model, messages, max_tokens, temperature}.
 * Model default: 'gpt-oss:20b' (one of the smallest confirmed cloud-hosted models).
 *
 * ── Embeddings ───────────────────────────────────────────────────────
 * Not supported. Ollama Cloud's OpenAI-compatible endpoint does not expose
 * /v1/embeddings. embed() throws a Runtime exception directing users to
 * use Mistral for embedding calls.
 */
class OllamaCloudProvider implements AiProviderInterface
{
    private const CHAT_PATH = '/chat/completions';

    /**
     * Base URL for the OpenAI-compatible API. Defaults to the cloud endpoint.
     * For local Ollama testing, set to http://localhost:11434/v1.
     */
    private function baseUrl(): string
    {
        return rtrim(config('services.ollama_cloud.base_url', 'https://ollama.com/v1'), '/');
    }

    private function apiKey(): string
    {
        return config('services.ollama_cloud.api_key', '');
    }

    public function chat(array $messages, array $options = []): array
    {
        $apiKey = $this->apiKey();
        $model = $options['model'] ?? config('services.ollama_cloud.chat_model', 'gpt-oss:20b');

        $messages = $this->convertImageUrlsToBase64($messages);

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'max_tokens' => $options['max_tokens'] ?? 600,
            'temperature' => $options['temperature'] ?? 0.7,
            'stream' => false,
        ];

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type' => 'application/json',
            ])->timeout(30)
                ->withoutVerifying()
                ->post($this->baseUrl().self::CHAT_PATH, $payload);

            if ($response->failed()) {
                $status = $response->status();
                $body = $response->body();

                Log::error('OllamaCloud chat API error', [
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

    /**
     * Convert http/https image URLs in messages to base64 data URIs.
     *
     * Ollama's local API does not support remote image URLs — it requires
     * base64-encoded image data. This method downloads the image and replaces
     * the URL with a data URI before the request is sent.
     */
    private function convertImageUrlsToBase64(array $messages): array
    {
        foreach ($messages as $msgIdx => &$message) {
            $content = $message['content'] ?? [];

            if (is_string($content)) {
                continue;
            }

            foreach ($content as $partIdx => &$part) {
                if (($part['type'] ?? '') !== 'image_url') {
                    continue;
                }

                $url = $part['image_url']['url'] ?? '';
                if (!str_starts_with($url, 'http')) {
                    continue;
                }

                try {
                    $response = Http::timeout(15)
                        ->withoutVerifying()
                        ->get($url);

                    if ($response->successful()) {
                        $body = $response->body();
                        $finfo = finfo_open(FILEINFO_MIME_TYPE);
                        $mime = finfo_buffer($finfo, $body);
                        finfo_close($finfo);
                        $b64 = base64_encode($body);
                        $messages[$msgIdx]['content'][$partIdx]['image_url']['url'] = "data:{$mime};base64,{$b64}";
                    }
                } catch (\Throwable $e) {
                    Log::warning('OllamaCloudProvider: failed to fetch image for base64 conversion', [
                        'url' => $url,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
            unset($part);
        }
        unset($message);

        return $messages;
    }

    /**
     * Generate a text caption for an image using a multimodal (vision) request.
     *
     * Sends a single-turn user message containing the image URL and a
     * descriptive prompt. The OpenAI-compatible endpoint accepts the same
     * array-content format as Mistral.
     *
     * @param  string  $imageUrl  Publicly accessible URL of the image.
     * @return string  Caption text (1–3 sentences).
     *
     * @throws \RuntimeException On API failure or connection error.
     */
    public function caption(string $imageUrl): string
    {
        $visionModel = config('services.ollama_cloud.vision_model', 'qwen2.5-vl:7b');

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
        $visionModel = config('services.ollama_cloud.vision_model', 'qwen2.5-vl:7b');
        $knownVisionPrefixes = [
            'qwen2.5-vl', 'qwen2-vl', 'llama3.2-vision', 'llama3.2-v',
            'llava', 'minicpm-v', 'bakllava', 'cogvlm', 'gemma4',
        ];
        foreach ($knownVisionPrefixes as $prefix) {
            if (str_starts_with($visionModel, $prefix)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @throws \RuntimeException  Always — this provider does not support embeddings.
     */
    public function embed(array $texts): array
    {
        throw new \RuntimeException(
            'Ollama Cloud does not support embeddings via its API. ' .
            'Use provider "mistral" for embedding calls. ' .
            'Set AI_PROVIDER=mistral in your .env, or configure ' .
            'a separate embedding provider when supported.'
        );
    }
}
