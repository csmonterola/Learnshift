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
     * Extended to 300 s (5 minutes) for large PPTX/DOCX files (Requirement 2.10).
     */
    public int $timeout = 300;

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

            // Download file from S3 to a temporary local path for processing
            $tempDir = sys_get_temp_dir();
            $tempFileName = uniqid('material_') . '.' . strtolower($material->file_type);
            $tempPath = $tempDir . '/' . $tempFileName;

            // Attempt to download file from storage with specific error handling
            try {
                $fileContents = Storage::disk('public')->get($material->file_path);
            } catch (\Throwable $storageException) {
                // Classify storage errors for better diagnostics
                $errorMessage = $storageException->getMessage();
                $errorType = 'storage_error';
                
                if (str_contains($errorMessage, 'InvalidAccessKeyId') || 
                    str_contains($errorMessage, 'SignatureDoesNotMatch') ||
                    str_contains($errorMessage, 'authentication')) {
                    $errorType = 'storage_authentication_error';
                    Log::error('IngestLearningMaterialJob: Storage authentication failed', [
                        'material_id' => $this->materialId,
                        'error' => $errorMessage,
                        'file_path' => $material->file_path,
                        'note' => 'Check S3 credentials configuration'
                    ]);
                } elseif (str_contains($errorMessage, 'NoSuchBucket') || 
                          str_contains($errorMessage, 'bucket')) {
                    $errorType = 'storage_bucket_error';
                    Log::error('IngestLearningMaterialJob: Storage bucket not found', [
                        'material_id' => $this->materialId,
                        'error' => $errorMessage,
                        'file_path' => $material->file_path
                    ]);
                } elseif (str_contains($errorMessage, 'AccessDenied') || 
                          str_contains($errorMessage, 'Forbidden')) {
                    $errorType = 'storage_permission_error';
                    Log::error('IngestLearningMaterialJob: Storage permission denied', [
                        'material_id' => $this->materialId,
                        'error' => $errorMessage,
                        'file_path' => $material->file_path
                    ]);
                } else {
                    Log::error('IngestLearningMaterialJob: Storage access failed', [
                        'material_id' => $this->materialId,
                        'error' => $errorMessage,
                        'error_type' => $errorType,
                        'file_path' => $material->file_path
                    ]);
                }

                $material->update([
                    'ingestion_status' => 'failed',
                    'ai_sync' => false
                ]);
                
                // Throw exception to be caught by outer catch block
                throw new \RuntimeException("Storage access failed ({$errorType}): {$errorMessage}");
            }
            
            file_put_contents($tempPath, $fileContents);

            // Clean up temporary file after successful processing
            register_shutdown_function(function () use ($tempPath) {
                if (file_exists($tempPath)) {
                    @unlink($tempPath);
                }
            });

            // Extract plain text from the file
            $text = $extractor->extract($tempPath, $material->file_type);

            // Guard: if extraction yields no usable text, mark as failed and bail out (Requirement 2.3)
            if (trim($text) === '') {
                Log::warning('IngestLearningMaterialJob: extracted text is empty', [
                    'material_id' => $this->materialId,
                ]);
                $material->update(['ingestion_status' => 'failed']);
                return;
            }

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
            $errorMessage = $e->getMessage();
            
            // Check if this is a storage-related error that we should classify
            if (str_contains($errorMessage, 'Storage access failed')) {
                // Already logged with specific details above
            } else {
                Log::error('IngestLearningMaterialJob failed', [
                    'material_id' => $this->materialId,
                    'error'       => $errorMessage,
                    'error_type'  => get_class($e),
                    'trace'       => config('app.debug') ? $e->getTraceAsString() : null,
                ]);
            }

            $material->update([
                'ingestion_status' => 'failed',
                'ai_sync' => false
            ]);
            
            // Do NOT rethrow — prevents queue retry; failure surfaced via ingestion_status
        }
    }
}
