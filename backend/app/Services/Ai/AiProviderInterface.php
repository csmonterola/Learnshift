<?php

namespace App\Services\Ai;

interface AiProviderInterface
{
    /**
     * Send a chat completion request.
     *
     * @param  array  $messages  Messages array in Mistral/OpenAI format [{role, content}, ...]
     * @param  array  $options  Optional overrides: max_tokens, temperature, model, etc.
     * @return array ['content' => string, 'raw' => array]
     *
     * @throws \RuntimeException On API failure or connection error
     */
    public function chat(array $messages, array $options = []): array;

    /**
     * Generate embedding vectors for multiple texts.
     *
     * @param  string[]  $texts  Array of text strings to embed
     * @return float[][] Array of float vectors in the same order as input
     *
     * @throws \RuntimeException On API failure or connection error, or if
     *                           the provider does not support embeddings
     */
    public function embed(array $texts): array;

    /**
     * Whether this provider can handle vision/multimodal requests
     * (image captioning, image classification, etc.).
     */
    public function supportsVision(): bool;
}
