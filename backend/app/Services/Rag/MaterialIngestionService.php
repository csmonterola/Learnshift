<?php

namespace App\Services\Rag;

use App\Models\LearningMaterial;
use App\Models\LessonEmbedding;
use App\Services\Rag\EmbeddingService;
use App\Services\Rag\TextChunker;
use App\Services\Rag\TextExtractor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class MaterialIngestionService
{
    public function __construct(
        private readonly TextExtractor    $extractor,
        private readonly TextChunker      $chunker,
        private readonly EmbeddingService $embedder,
    ) {}

    /**
     * Run the full ingestion pipeline: download → extract → chunk → embed → store.
     *
     * @param  \App\Models\LearningMaterial  $material
     * @return int  Number of chunks stored
     *
     * @throws \RuntimeException
     */
    public function ingest(LearningMaterial $material): int
    {
        $material->update(['ingestion_status' => 'processing']);

        // Download file from S3 to a temporary local path
        $tempDir    = sys_get_temp_dir();
        $tempFileName = uniqid('material_') . '.' . strtolower($material->file_type);
        $tempPath   = $tempDir . '/' . $tempFileName;

        try {
            $fileContents = Storage::disk('public')->get($material->file_path);
            if ($fileContents === false || $fileContents === null) {
                throw new RuntimeException('Unable to read file from storage: ' . $material->file_path);
            }
            file_put_contents($tempPath, $fileContents);

            // Clean up on shutdown
            register_shutdown_function(function () use ($tempPath) {
                if (file_exists($tempPath)) {
                    @unlink($tempPath);
                }
            });

            // Extract plain text
            $text = $this->extractor->extract($tempPath, $material->file_type);

            if (trim($text) === '') {
                Log::warning('MaterialIngestionService: extracted text is empty', [
                    'material_id' => $material->id,
                ]);
                $material->update(['ingestion_status' => 'failed']);
                return 0;
            }

            // Chunk the text
            $maxTokens = (int) config('rag.chunk_max_tokens', 500);
            $overlap   = (int) config('rag.chunk_overlap', 50);
            $chunks    = $this->chunker->chunk($text, $maxTokens, $overlap);

            // Generate embeddings
            $vectors = $this->embedder->embedBatch($chunks);

            // Delete prior embeddings for this material (idempotency)
            LessonEmbedding::where('material_id', $material->id)->delete();

            // Bulk-insert new embeddings
            if (!empty($chunks)) {
                $now  = now()->toDateTimeString();
                $rows = [];
                foreach ($chunks as $index => $chunkText) {
                    $rows[] = [
                        'lesson_id'   => $material->lesson_id,
                        'material_id' => $material->id,
                        'chunk_index' => $index,
                        'chunk_text'  => $chunkText,
                        'embedding'   => '[' . implode(',', $vectors[$index]) . ']',
                        'created_at'  => $now,
                    ];
                }
                foreach (array_chunk($rows, 100) as $batch) {
                    DB::table('lesson_embeddings')->insert($batch);
                }
            }

            $material->update(['ingestion_status' => 'indexed']);

            return count($chunks);
        } catch (\Throwable $e) {
            Log::error('MaterialIngestionService failed', [
                'material_id' => $material->id,
                'error'       => $e->getMessage(),
                'error_type'  => get_class($e),
            ]);
            $material->update(['ingestion_status' => 'failed']);

            throw new RuntimeException('Ingestion failed: ' . $e->getMessage(), 0, $e);
        }
    }
}
