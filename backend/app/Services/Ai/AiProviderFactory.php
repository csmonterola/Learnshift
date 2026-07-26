<?php

namespace App\Services\Ai;

/**
 * Factory for creating AI provider instances.
 *
 * Providers are split per-purpose:
 *   - 'chat'      → returns the provider configured via AI_PROVIDER_CHAT
 *   - 'embedding' → returns the provider configured via AI_PROVIDER_EMBEDDING
 *
 * This allows using different backends — e.g. Ollama Cloud for chat/vision
 * and Mistral for embeddings (since Ollama Cloud does not support embeddings).
 *
 * Usage:
 *   $chat = AiProviderFactory::make('chat');
 *   $result = $chat->chat($messages);
 *
 *   $embedder = AiProviderFactory::make('embedding');
 *   $vectors = $embedder->embed($texts);
 */
class AiProviderFactory
{
    /**
     * Resolve the AI provider for the given purpose.
     *
     * @param  string  $for  'chat' or 'embedding'
     *
     * @throws \RuntimeException If the configured provider is unknown
     */
    public static function make(string $for = 'chat'): AiProviderInterface
    {
        if ($for === 'embedding') {
            // Embeddings always go through Mistral; Ollama Cloud doesn't support them.
            return app(MistralProvider::class);
        }

        $providerName = config('services.ai_provider_chat', 'ollama_cloud');

        return match ($providerName) {
            'mistral'      => app(MistralProvider::class),
            'ollama_cloud' => app(OllamaCloudProvider::class),
            default => throw new \RuntimeException(
                "Unknown AI provider '{$providerName}'. ".
                "Supported: 'mistral', 'ollama_cloud'."
            ),
        };
    }

    /**
     * Resolve a vision-capable provider for image operations.
     *
     * Tries the configured chat provider first. If it does not support vision,
     * falls back to Mistral (which always does). Throws if neither is viable.
     */
    public static function vision(): AiProviderInterface
    {
        $chatProvider = self::make('chat');

        if ($chatProvider->supportsVision()) {
            return $chatProvider;
        }

        // Fall back to Mistral, which is guaranteed vision-capable.
        $mistral = app(MistralProvider::class);

        if ($mistral->supportsVision()) {
            return $mistral;
        }

        throw new \RuntimeException(
            'No vision-capable AI provider is available. ' .
            'Configure a provider with vision support (e.g. mistral) or ' .
            'set AI_PROVIDER_CHAT to a vision-capable provider.'
        );
    }
}
