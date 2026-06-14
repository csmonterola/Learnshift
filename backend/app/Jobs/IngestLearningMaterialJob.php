<?php

namespace App\Jobs;

use App\Models\LearningMaterial;
use App\Models\LessonEmbedding;
use App\Services\Rag\EmbeddingService;
use App\Services\Rag\TextChunker;
use App\Services\Rag\TextExtractor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class IngestLearningMaterialJob implements ShouldQueue
{
    use Queueable;

    /**
     * The number of times the job may be attempted.
     * Set to 1 — failures are surfaced via ingestion_status, not queue retries.
     */
    public int $tries = 1;

    /**
     * The number of seconds the job can run before timing out.
     */
    public int $timeout = 120;

    public function __construct(
        private readonly int $materialId
    ) {}

    public function handle(
        TextExtractor $extractor,
        TextChunker $chunker,
        EmbeddingService $embedder
    ): void {
        $material = LearningMaterial::findOrFail($this->materialId);

        try {
            $material->update(['ingestion_status' => 'processing']);

            // Resolve the absolute file path from the storage disk
            $filePath = Storage::path($material->file_path);

            // Extract plain text from the file
            $text = $extractor->extract($filePath, $material->file_type);

            // Chunk the text (500 tokens max, 50 token overlap)
            $chunks = $chunker->chunk($text);

            // Generate embeddings for all chunks in a single batch API call
            $vectors = $embedder->embedBatch($chunks);

            // Delete all prior embeddings for this material (upsert semantics)
            LessonEmbedding::where('material_id', $this->materialId)->delete();

            // Bulk-insert new embeddings keyed by lesson_id and material_id
            if (!empty($chunks)) {
                $now  = now()->toDateTimeString();
                $rows = [];

                foreach ($chunks as $index => $chunkText) {
                    $rows[] = [
                        'lesson_id'   => $material->lesson_id,
                        'material_id' => $this->materialId,
                        'chunk_index' => $index,
                        'chunk_text'  => $chunkText,
                        'embedding'   => '[' . implode(',', $vectors[$index]) . ']',
                        'created_at'  => $now,
                    ];
                }

                // Use chunked inserts to avoid hitting DB parameter limits
                foreach (array_chunk($rows, 100) as $batch) {
                    DB::table('lesson_embeddings')->insert($batch);
                }
            }

            $material->update(['ingestion_status' => 'indexed']);
        } catch (\Throwable $e) {
            Log::error('IngestLearningMaterialJob failed', [
                'material_id' => $this->materialId,
                'error'       => $e->getMessage(),
                'trace'       => $e->getTraceAsString(),
            ]);

            $material->update(['ingestion_status' => 'failed']);
            // Do NOT rethrow — prevents queue retry; failure surfaced via ingestion_status
        }
    }
}
