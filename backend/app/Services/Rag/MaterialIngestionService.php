<?php

namespace App\Services\Rag;

use App\Exceptions\EmbeddingException;
use App\Exceptions\TextExtractionException;
use App\Jobs\CaptionAndEmbedImageJob;
use App\Models\LearningMaterial;
use App\Models\LessonEmbedding;
use App\Models\MaterialImage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MaterialIngestionService
{
    public function __construct(
        private readonly TextExtractor $textExtractor,
        private readonly TextChunker $textChunker,
        private readonly EmbeddingService $embeddingService,
        private readonly ImageExtractor $imageExtractor,
    ) {}

    public function ingest(LearningMaterial $material): array
    {
        $timings = [];
        $start = hrtime(true);

        LearningMaterial::withoutEvents(function () use ($material) {
            $material->update(['ingestion_status' => 'processing']);
        });

        $tempPath = $this->downloadToTemp($material);
        $timings['download'] = $this->elapsedSince($start);

        try {
            $fileType = strtolower($material->file_type);
            $hasPages = in_array($fileType, ['pdf', 'pptx'], true);

            // Text extraction (with or without pages)
            $t0 = hrtime(true);
            if ($hasPages) {
                $pagedText = $this->textExtractor->extractWithPages($tempPath, $material->file_type);
                if (empty($pagedText)) {
                    throw new TextExtractionException('No text could be extracted from the file.');
                }
            } else {
                $text = $this->textExtractor->extract($tempPath, $material->file_type);
                if (trim($text) === '') {
                    throw new TextExtractionException('No text could be extracted from the file.');
                }
            }
            $timings['text_extraction'] = $this->elapsedSince($t0);

            // Image extraction
            $imageCount = 0;
            try {
                $t0 = hrtime(true);
                $imageCount = $this->extractImages($material, $tempPath);
                $timings['image_extraction'] = $this->elapsedSince($t0);
            } catch (\Throwable $e) {
                $timings['image_extraction'] = $this->elapsedSince($t0);
                Log::error('MaterialIngestionService: image extraction failed (non-blocking)', [
                    'material_id' => $material->id,
                    'error'       => $e->getMessage(),
                ]);
            }

            // Chunking (with or without pages)
            $t0 = hrtime(true);
            if ($hasPages) {
                $chunks = $this->textChunker->chunkWithPages($pagedText);
            } else {
                $chunks = $this->textChunker->chunk($text);
            }
            $timings['chunking'] = $this->elapsedSince($t0);
            if (empty($chunks)) {
                throw new \RuntimeException('Text chunking produced no chunks.');
            }

            // Embedding API (skip unchanged chunks)
            $t0 = hrtime(true);
            $chunkTexts = array_map(fn($c) => is_string($c) ? $c : $c['text'], $chunks);
            $chunkHashes = array_map('md5', $chunkTexts);

            $existingEmbeddings = LessonEmbedding::where('material_id', $material->id)
                ->get()
                ->keyBy('chunk_index');

            $vectors = [];
            $textsToEmbed = [];
            $indicesToEmbed = [];

            foreach ($chunkHashes as $i => $hash) {
                $existing = $existingEmbeddings->get($i);
                if ($existing && $existing->content_hash === $hash) {
                    $vectors[$i] = $existing->embedding;
                } else {
                    $textsToEmbed[] = $chunkTexts[$i];
                    $indicesToEmbed[] = $i;
                }
            }

            LessonEmbedding::where('material_id', $material->id)
                ->where('content_type', 'text')
                ->delete();

            if (!empty($textsToEmbed)) {
                $newVectors = $this->embeddingService->embedBatch($textsToEmbed);
                foreach ($indicesToEmbed as $j => $i) {
                    $vectors[$i] = $newVectors[$j];
                }
            }

            ksort($vectors);
            $vectors = array_values($vectors);
            $timings['embedding_api'] = $this->elapsedSince($t0);

            // DB writes
            $t0 = hrtime(true);
            $this->storeEmbeddings($material, $chunks, $vectors, $hasPages, $chunkHashes);
            $timings['db_writes'] = $this->elapsedSince($t0);

            LearningMaterial::withoutEvents(function () use ($material) {
                $material->update([
                    'ingestion_status' => 'indexed',
                    'ai_sync'          => true,
                ]);
            });

            $timings['total'] = $this->elapsedSince($start);

            Log::info('MaterialIngestionService: ingestion complete', [
                'material_id' => $material->id,
                'file_type'   => $material->file_type,
                'chunks'      => count($chunks),
                'images'      => $imageCount,
                'timings_ms'  => $timings,
            ]);

            return [
                'chunks' => count($chunks),
                'images' => $imageCount,
            ];
        } finally {
            if (file_exists($tempPath)) {
                @unlink($tempPath);
            }
        }
    }

    private function elapsedSince(int|float $start): float
    {
        return (hrtime(true) - $start) / 1_000_000;
    }

    private function downloadToTemp(LearningMaterial $material): string
    {
        $tempDir = sys_get_temp_dir();
        $tempFileName = uniqid('material_') . '.' . strtolower($material->file_type);
        $tempPath = $tempDir . '/' . $tempFileName;

        try {
            $fileContents = Storage::disk('public')->get($material->file_path);
        } catch (\Throwable $e) {
            $errorType = $this->classifyStorageError($e->getMessage());
            Log::error('MaterialIngestionService: storage access failed', [
                'material_id' => $material->id,
                'error'       => $e->getMessage(),
                'error_type'  => $errorType,
                'file_path'   => $material->file_path,
            ]);
            throw new \RuntimeException("Storage access failed ({$errorType}): {$e->getMessage()}");
        }

        file_put_contents($tempPath, $fileContents);

        if (!file_exists($tempPath)) {
            throw new \RuntimeException('Failed to write temporary file: ' . $tempPath);
        }

        return $tempPath;
    }

    private function classifyStorageError(string $message): string
    {
        if (str_contains($message, 'InvalidAccessKeyId') ||
            str_contains($message, 'SignatureDoesNotMatch') ||
            str_contains($message, 'authentication')) {
            return 'storage_authentication_error';
        }
        if (str_contains($message, 'NoSuchBucket') || str_contains($message, 'bucket')) {
            return 'storage_bucket_error';
        }
        if (str_contains($message, 'AccessDenied') || str_contains($message, 'Forbidden')) {
            return 'storage_permission_error';
        }
        return 'storage_error';
    }

    private function extractImages(LearningMaterial $material, string $tempPath): int
    {
        $images = $this->imageExtractor->extract($tempPath, $material->file_type);

        $materialId = $material->id;
        $lessonId   = $material->lesson_id;

        $existingByHash = MaterialImage::where('learning_material_id', $materialId)
            ->get()
            ->groupBy('content_hash');

        if (empty($images)) {
            $orphanIds = $existingByHash->flatten()->pluck('id');
            if ($orphanIds->isNotEmpty()) {
                LessonEmbedding::where('material_id', $materialId)
                    ->where('content_type', 'image')
                    ->whereIn('material_image_id', $orphanIds)
                    ->delete();
                MaterialImage::whereIn('id', $orphanIds)->delete();
                LessonEmbedding::where('material_id', $materialId)
                    ->where('content_type', 'image')
                    ->whereNull('material_image_id')
                    ->delete();
            }
            return 0;
        }

        $maxImages      = (int) config('services.image_extraction.max_images_per_material', 30);
        $minDimension   = (int) config('services.image_extraction.min_image_dimension', 80);
        $minFileSize    = (int) config('services.image_extraction.min_file_size', 2048);
        $minPixelArea   = (int) config('services.image_extraction.min_pixel_area', 6400);
        $hashThreshold  = (int) config('services.image_extraction.duplicate_hash_threshold', 3);
        $aspectLimit    = (float) config('services.image_extraction.aspect_ratio_limit', 6.0);
        $colorVariance  = (float) config('services.image_extraction.borderline_color_variance', 0.05);
        $processed      = 0;
        $imageHashes    = [];
        $discarded      = 0;

        foreach ($images as $image) {
            if ($processed >= $maxImages) {
                Log::warning('MaterialIngestionService: hit image cap', [
                    'material_id' => $materialId,
                    'cap'         => $maxImages,
                ]);
                break;
            }

            $sizeInfo = $this->getImageDimensions($image['binary'], $image['extension']);
            if ($sizeInfo === null) {
                Log::info('MaterialIngestionService: discarding image — cannot read dimensions', [
                    'material_id' => $materialId,
                    'extension'   => $image['extension'],
                    'size_bytes'  => strlen($image['binary']),
                ]);
                $discarded++;
                continue;
            }

            $width   = $sizeInfo['width'];
            $height  = $sizeInfo['height'];
            $fileSize = strlen($image['binary']);

            // Discard tiny files (e.g. icons, decorative bullets)
            if ($fileSize < $minFileSize) {
                Log::info('MaterialIngestionService: discarding image — file too small', [
                    'material_id' => $materialId,
                    'width'       => $width,
                    'height'      => $height,
                    'file_size'   => $fileSize,
                    'min_size'    => $minFileSize,
                    'reason'      => 'min_file_size',
                ]);
                $discarded++;
                continue;
            }

            // Discard images below minimum pixel area (e.g. tiny thumbnails)
            $pixelArea = $width * $height;
            if ($pixelArea < $minPixelArea) {
                Log::info('MaterialIngestionService: discarding image — below minimum pixel area', [
                    'material_id' => $materialId,
                    'width'       => $width,
                    'height'      => $height,
                    'pixel_area'  => $pixelArea,
                    'min_area'    => $minPixelArea,
                    'reason'      => 'min_pixel_area',
                ]);
                $discarded++;
                continue;
            }

            if ($width < $minDimension || $height < $minDimension) {
                Log::info('MaterialIngestionService: discarding image — too small', [
                    'material_id' => $materialId,
                    'width'       => $width,
                    'height'      => $height,
                    'reason'      => 'min_dimension',
                ]);
                $discarded++;
                continue;
            }

            $ratio = max($width, $height) / min($width, $height);
            if ($ratio > $aspectLimit) {
                Log::info('MaterialIngestionService: discarding image — extreme aspect ratio', [
                    'material_id' => $materialId,
                    'width'       => $width,
                    'height'      => $height,
                    'ratio'       => round($ratio, 2),
                    'reason'      => 'aspect_ratio',
                ]);
                $discarded++;
                continue;
            }

            $hash = hash('sha256', $image['binary']);
            $imageHashes[$hash] = ($imageHashes[$hash] ?? 0) + 1;
            if ($imageHashes[$hash] >= $hashThreshold) {
                Log::info('MaterialIngestionService: discarding image — duplicate/likely repeating watermark', [
                    'material_id'    => $materialId,
                    'hash'           => $hash,
                    'occurrence'     => $imageHashes[$hash],
                    'reason'         => 'duplicate_hash',
                ]);
                $discarded++;
                continue;
            }

            $uniqueColors = $this->estimateUniqueColors($image['binary'], $image['extension']);
            $totalPixels  = $width * $height;
            $needsClassification = $uniqueColors !== null && $totalPixels > 0
                && ($uniqueColors / $totalPixels) < $colorVariance;

            // Hash-diff: reuse existing row if image is unchanged and complete
            $matchingBucket = $existingByHash->get($hash);
            if ($matchingBucket && $matchingBucket->isNotEmpty()) {
                $existingRow = $matchingBucket->shift();

                $shouldSkip = ($existingRow->extraction_status === 'extracted' && $existingRow->caption !== null)
                    || $existingRow->extraction_status === 'discarded';

                if ($shouldSkip) {
                    $processed++;
                    continue;
                }

                $existingRow->delete();
            }

            $uuid = (string) Str::uuid();
            $s3Path = "lessons/{$lessonId}/materials/{$materialId}/images/{$uuid}.{$image['extension']}";

            try {
                Storage::disk('public')->put($s3Path, $image['binary']);
            } catch (\Throwable $e) {
                Log::error('MaterialIngestionService: failed to upload image', [
                    'material_id' => $materialId,
                    's3_path'     => $s3Path,
                    'error'       => $e->getMessage(),
                ]);
                continue;
            }

            $materialImage = MaterialImage::create([
                'learning_material_id'        => $materialId,
                'page_number'                 => $image['page_number'],
                's3_path'                     => $s3Path,
                'width'                       => $width,
                'height'                      => $height,
                'file_size'                   => strlen($image['binary']),
                'content_hash'                => $hash,
                'extraction_status'           => 'extracted',
                'requires_ai_classification'  => $needsClassification,
            ]);

            CaptionAndEmbedImageJob::dispatch($materialImage->id);

            $processed++;
        }

        // Clean up images that are no longer present in the document
        $orphanRows = $existingByHash->flatten();
        if ($orphanRows->isNotEmpty()) {
            $orphanIds = $orphanRows->pluck('id');
            LessonEmbedding::where('material_id', $materialId)
                ->where('content_type', 'image')
                ->whereIn('material_image_id', $orphanIds)
                ->delete();
            MaterialImage::whereIn('id', $orphanIds)->delete();
            LessonEmbedding::where('material_id', $materialId)
                ->where('content_type', 'image')
                ->whereNull('material_image_id')
                ->delete();
        }

        Log::info('MaterialIngestionService: image extraction complete', [
            'material_id' => $materialId,
            'extracted'   => $processed,
            'discarded'   => $discarded,
            'total_found' => count($images),
        ]);

        return $processed;
    }

    private function estimateUniqueColors(string $binary, string $extension): ?int
    {
        if (!in_array($extension, ['jpg', 'png', 'gif', 'bmp', 'webp'], true)) {
            return null;
        }
        $img = @imagecreatefromstring($binary);
        if ($img === false) {
            return null;
        }
        $w = imagesx($img);
        $h = imagesy($img);
        if ($w * $h === 0) {
            imagedestroy($img);
            return null;
        }
        $colors = [];
        $sampled = 0;
        $step = max(1, (int) round(($w * $h) / 5000));
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                if ($sampled++ % $step !== 0) {
                    continue;
                }
                $rgb = imagecolorat($img, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;
                $key = ($r >> 4) . '|' . ($g >> 4) . '|' . ($b >> 4);
                $colors[$key] = true;
            }
        }
        imagedestroy($img);
        return count($colors) * $step;
    }

    private function getImageDimensions(string $binary, string $extension): ?array
    {
        if ($extension === 'bin') {
            return null;
        }

        if (in_array($extension, ['jpg', 'png', 'gif', 'bmp', 'webp', 'jp2'], true)) {
            $info = @getimagesizefromstring($binary);
            if ($info !== false) {
                return ['width' => $info[0], 'height' => $info[1]];
            }
        }

        return null;
    }

    private function storeEmbeddings(LearningMaterial $material, array $chunks, array $vectors, bool $hasPages = false, array $chunkHashes = []): void
    {
        $now = now()->toDateTimeString();
        $rows = [];

        foreach ($chunks as $index => $chunk) {
            $vector = $vectors[$index] ?? [];
            if (empty($vector)) {
                continue;
            }

            $chunkText = $hasPages ? $chunk['text'] : $chunk;
            $pageNumber = $hasPages ? $chunk['page_number'] : null;

            $rows[] = [
                'lesson_id'   => $material->lesson_id,
                'material_id' => $material->id,
                'chunk_index' => $index,
                'page_number' => $pageNumber,
                'content_hash' => $chunkHashes[$index] ?? md5($chunkText),
                'chunk_text'  => $chunkText,
                'embedding'   => '[' . implode(',', $vector) . ']',
                'created_at'  => $now,
            ];
        }

        foreach (array_chunk($rows, 100) as $batch) {
            DB::table('lesson_embeddings')->insert($batch);
        }
    }
}
