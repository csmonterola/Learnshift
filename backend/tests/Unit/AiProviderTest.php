<?php

namespace Tests\Unit;

use App\Exceptions\EmbeddingException;
use App\Services\Ai\AiProviderFactory;
use App\Services\Ai\MistralProvider;
use App\Services\Ai\OllamaCloudProvider;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiProviderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Config::set('services.mistral.api_key', 'test-key');
        Config::set('services.mistral.model', 'mistral-small-latest');
        Config::set('services.mistral.embedding_model', 'mistral-embed');
        Config::set('services.ai_provider', 'mistral');
    }

    // ── MistralProvider::chat() ─────────────────────────────────────

    public function test_mistral_chat_returns_content_on_success(): void
    {
        Http::fake([
            'api.mistral.ai/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'Hello!']],
                ],
            ]),
        ]);

        $provider = new MistralProvider;
        $result = $provider->chat([
            ['role' => 'user', 'content' => 'Hi'],
        ]);

        $this->assertSame('Hello!', $result['content']);
        $this->assertArrayHasKey('raw', $result);
        $this->assertSame('Hello!', $result['raw']['choices'][0]['message']['content']);
    }

    public function test_mistral_chat_passes_model_and_params(): void
    {
        Http::fake(function ($request) {
            $body = json_decode($request->body(), true);
            $this->assertSame('mistral-small-latest', $body['model']);
            $this->assertSame(2000, $body['max_tokens']);
            $this->assertSame(0.7, $body['temperature']);
            $this->assertSame('Hi', $body['messages'][0]['content']);

            return Http::response([
                'choices' => [['message' => ['content' => 'ok']]],
            ]);
        });

        $provider = new MistralProvider;
        $provider->chat(
            [['role' => 'user', 'content' => 'Hi']],
            ['max_tokens' => 2000, 'temperature' => 0.7]
        );
    }

    public function test_mistral_chat_throws_on_http_failure(): void
    {
        Http::fake([
            'api.mistral.ai/*' => Http::response('', 500),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('AI service temporarily unavailable');

        $provider = new MistralProvider;
        $provider->chat([['role' => 'user', 'content' => 'Hi']]);
    }

    public function test_mistral_chat_throws_on_empty_response(): void
    {
        Http::fake([
            'api.mistral.ai/*' => Http::response([
                'choices' => [['message' => []]],
            ]),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('AI service returned an empty response');

        $provider = new MistralProvider;
        $provider->chat([['role' => 'user', 'content' => 'Hi']]);
    }

    // ── MistralProvider::embed() ─────────────────────────────────────

    public function test_mistral_embed_returns_vectors_in_order(): void
    {
        Http::fake([
            'api.mistral.ai/*' => Http::response([
                'data' => [
                    ['object' => 'embedding', 'index' => 1, 'embedding' => [0.2, 0.3]],
                    ['object' => 'embedding', 'index' => 0, 'embedding' => [0.1, 0.2]],
                ],
            ]),
        ]);

        $provider = new MistralProvider;
        $result = $provider->embed(['first', 'second']);

        $this->assertCount(2, $result);
        $this->assertSame([0.1, 0.2], $result[0]);
        $this->assertSame([0.2, 0.3], $result[1]);
    }

    public function test_mistral_embed_throws_on_http_failure(): void
    {
        Http::fake([
            'api.mistral.ai/*' => Http::response('', 401),
        ]);

        $this->expectException(EmbeddingException::class);
        $this->expectExceptionMessage('Mistral embedding API error: HTTP 401');

        $provider = new MistralProvider;
        $provider->embed(['test']);
    }

    public function test_mistral_embed_throws_on_bad_response_shape(): void
    {
        Http::fake([
            'api.mistral.ai/*' => Http::response(['data' => null]),
        ]);

        $this->expectException(EmbeddingException::class);
        $this->expectExceptionMessage('Mistral embedding API returned unexpected response format');

        $provider = new MistralProvider;
        $provider->embed(['test']);
    }

    public function test_mistral_embed_uses_pool_for_large_batch(): void
    {
        $requestCount = 0;

        Http::fake(function ($request) use (&$requestCount) {
            $requestCount++;
            $body = json_decode($request->body(), true);
            $inputCount = count($body['input']);

            $data = [];
            for ($i = 0; $i < $inputCount; $i++) {
                $data[] = ['object' => 'embedding', 'index' => $i, 'embedding' => [0.1]];
            }

            return Http::response(['data' => $data]);
        });

        // Use a small batch size so 3 texts trigger 2 batches
        Config::set('services.mistral.embedding_batch_size', 2);
        Config::set('services.mistral.embedding_concurrency', 5);

        $provider = new MistralProvider;
        $result = $provider->embed(['a', 'b', 'c']);

        $this->assertCount(3, $result);
        $this->assertSame(2, $requestCount, 'Pool should send 2 concurrent requests for 3 texts with batch size 2');
    }

    public function test_mistral_embed_pool_throws_on_failed_batch(): void
    {
        $callCount = 0;

        Http::fake(function () use (&$callCount) {
            $callCount++;
            // First batch fails
            if ($callCount === 1) {
                return Http::response('', 500);
            }
            return Http::response([
                'data' => [
                    ['object' => 'embedding', 'index' => 0, 'embedding' => [0.2]],
                ],
            ]);
        });

        Config::set('services.mistral.embedding_batch_size', 2);
        Config::set('services.mistral.embedding_concurrency', 5);

        $this->expectException(EmbeddingException::class);
        $this->expectExceptionMessage('Mistral embedding API error: HTTP 500');

        $provider = new MistralProvider;
        $provider->embed(['a', 'b', 'c']);
    }

    public function test_mistral_embed_pool_returns_vectors_in_correct_order(): void
    {
        $callCount = 0;

        Http::fake(function () use (&$callCount) {
            $callCount++;

            return Http::response([
                'data' => [
                    ['object' => 'embedding', 'index' => 0, 'embedding' => [0.0 + $callCount]],
                ],
            ]);
        });

        Config::set('services.mistral.embedding_batch_size', 1);
        Config::set('services.mistral.embedding_concurrency', 5);

        $provider = new MistralProvider;
        $result = $provider->embed(['x', 'y']);

        $this->assertCount(2, $result);
        $this->assertEquals([1.0], $result[0], 'First text should get first batch response');
        $this->assertEquals([2.0], $result[1], 'Second text should get second batch response');
    }

    // ── OllamaCloudProvider::chat() ──────────────────────────────────

    public function test_ollama_cloud_chat_returns_content(): void
    {
        Config::set('services.ollama_cloud.api_key', 'ollama-key');
        Config::set('services.ollama_cloud.base_url', 'https://ollama.com/v1');

        Http::fake([
            'ollama.com/v1/chat/completions' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'Ollama response']],
                ],
            ]),
        ]);

        $provider = new OllamaCloudProvider;
        $result = $provider->chat([['role' => 'user', 'content' => 'Hi']]);

        $this->assertSame('Ollama response', $result['content']);
    }

    public function test_ollama_cloud_chat_sends_stream_false(): void
    {
        Config::set('services.ollama_cloud.api_key', 'ollama-key');

        Http::fake(function ($request) {
            $body = json_decode($request->body(), true);
            $this->assertFalse($body['stream'], 'stream must be false to get parseable JSON response');

            return Http::response([
                'choices' => [['message' => ['content' => 'ok']]],
            ]);
        });

        $provider = new OllamaCloudProvider;
        $provider->chat([['role' => 'user', 'content' => 'Hi']]);
    }

    public function test_ollama_cloud_chat_throws_on_failure(): void
    {
        Config::set('services.ollama_cloud.api_key', 'ollama-key');
        Config::set('services.ollama_cloud.base_url', 'https://ollama.com/v1');

        Http::fake([
            'ollama.com/*' => Http::response('', 500),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('AI service temporarily unavailable');

        $provider = new OllamaCloudProvider;
        $provider->chat([['role' => 'user', 'content' => 'Hi']]);
    }

    // ── OllamaCloudProvider::embed() ─────────────────────────────────

    public function test_ollama_cloud_embed_throws_not_supported(): void
    {
        $provider = new OllamaCloudProvider;

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Ollama Cloud does not support embeddings');

        $provider->embed(['test']);
    }

    // ── AiProviderFactory ────────────────────────────────────────────

    public function test_factory_returns_mistral_when_chat_configured_mistral(): void
    {
        Config::set('services.ai_provider_chat', 'mistral');
        $provider = AiProviderFactory::make('chat');
        $this->assertInstanceOf(MistralProvider::class, $provider);
    }

    public function test_factory_returns_ollama_cloud_when_chat_configured_ollama(): void
    {
        Config::set('services.ai_provider_chat', 'ollama_cloud');
        $provider = AiProviderFactory::make('chat');
        $this->assertInstanceOf(OllamaCloudProvider::class, $provider);
    }

    public function test_factory_returns_mistral_for_embedding_always(): void
    {
        Config::set('services.ai_provider_chat', 'ollama_cloud');
        $provider = AiProviderFactory::make('embedding');
        $this->assertInstanceOf(MistralProvider::class, $provider);
    }

    public function test_factory_throws_on_unknown_chat_provider(): void
    {
        Config::set('services.ai_provider_chat', 'nonexistent');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Unknown AI provider');

        AiProviderFactory::make('chat');
    }
}
