<?php

namespace App\Jobs;

use App\Models\LessonEmbedding;
use App\Models\MaterialImage;
use App\Services\Ai\AiProviderFactory;
use App\Services\Rag\EmbeddingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class CaptionAndEmbedImageJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 10;

    public int $timeout = 120;

    public function __construct(
        private readonly int $materialImageId
    ) {
        $this->onQueue('captions');
    }

    public function handle(EmbeddingService $embeddingService): void
    {
        $image = MaterialImage::with('learningMaterial.lesson')->find($this->materialImageId);

        if (!$image) {
            Log::warning('CaptionAndEmbedImageJob: MaterialImage not found', [
                'material_image_id' => $this->materialImageId,
            ]);
            return;
        }

        $material = $image->learningMaterial;
        if (!$material) {
            Log::warning('CaptionAndEmbedImageJob: orphaned MaterialImage', [
                'material_image_id' => $this->materialImageId,
            ]);
            return;
        }

        $imageUrl = $image->url;
        if (!$imageUrl) {
            Log::error('CaptionAndEmbedImageJob: cannot resolve image URL', [
                'material_image_id' => $this->materialImageId,
                's3_path'           => $image->s3_path,
            ]);
            return;
        }

        $visionProvider = AiProviderFactory::vision();

        // If this image was flagged as borderline, run combined classify + caption
        if ($image->requires_ai_classification) {
            $response = $visionProvider->chat([
                [
                    'role' => 'user',
                    'content' => [
                        [
                            'type' => 'text',
                            'text' => 'Describe this image in 1-3 sentences as a searchable caption for an educational context. Mention any labeled text, diagram type, chart data, or key visual elements. If this image is purely decorative (logo, icon, divider, watermark, border) with no educational content, start your response with exactly DECORATIVE and give a brief reason. Otherwise provide the caption normally without any prefix.',
                        ],
                        [
                            'type' => 'image_url',
                            'image_url' => [
                                'url' => $imageUrl,
                            ],
                        ],
                    ],
                ],
            ], [
                'model' => config('services.mistral.vision_model', 'pixtral-12b-2409'),
                'max_tokens' => 200,
                'temperature' => 0.3,
            ]);

            $responseText = $response['content'] ?? '';

            if (str_starts_with($responseText, 'DECORATIVE')) {
                $image->update([
                    'extraction_status' => 'discarded',
                    'caption' => $responseText,
                ]);
                Log::info('CaptionAndEmbedImageJob: image classified as decorative', [
                    'material_image_id' => $this->materialImageId,
                    'reason'            => substr($responseText, 0, 200),
                ]);
                return;
            }

            $image->update(['extraction_status' => 'extracted', 'caption' => $responseText]);
            $caption = $responseText;
        } else {
            // Normal path: caption only
            $caption = $visionProvider->caption($imageUrl);
            $image->update(['caption' => $caption]);
        }

        try {
            $vectors = $embeddingService->embedBatch([$caption]);
        } catch (\Throwable $e) {
            Log::error('CaptionAndEmbedImageJob: embedding failed', [
                'material_image_id' => $this->materialImageId,
                'error'             => $e->getMessage(),
            ]);
            throw $e;
        }

        LessonEmbedding::create([
            'lesson_id'         => $material->lesson_id,
            'material_id'       => $material->id,
            'chunk_index'       => 0,
            'content_type'      => 'image',
            'material_image_id' => $image->id,
            'page_number'       => $image->page_number,
            'content_hash'      => null,
            'chunk_text'        => $caption,
            'embedding'         => $vectors[0] ?? [],
        ]);

        Log::info('CaptionAndEmbedImageJob: complete', [
            'material_image_id' => $this->materialImageId,
            'caption'           => substr($caption, 0, 100),
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        $image = MaterialImage::find($this->materialImageId);
        if ($image) {
            $image->update(['extraction_status' => 'failed']);
        }
        Log::error('CaptionAndEmbedImageJob failed after all retries', [
            'material_image_id' => $this->materialImageId,
            'error'             => $exception->getMessage(),
        ]);
    }
}
