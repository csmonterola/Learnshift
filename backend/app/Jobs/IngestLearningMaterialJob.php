<?php

namespace App\Jobs;

use App\Models\LearningMaterial;
use App\Services\Rag\MaterialIngestionService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class IngestLearningMaterialJob implements ShouldQueue, ShouldBeUnique
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

    /**
     * The number of seconds the unique lock is held after the job finishes.
     * Must be longer than $timeout to prevent overlapping dispatches.
     */
    public int $uniqueFor = 360;

    public function __construct(
        private readonly int $materialId
    ) {}

    public function uniqueId(): string
    {
        return (string) $this->materialId;
    }

    public function handle(MaterialIngestionService $ingestionService): void
    {
        $material = LearningMaterial::findOrFail($this->materialId);

        try {
            $ingestionService->ingest($material);
        } catch (\Throwable $e) {
            Log::error('IngestLearningMaterialJob failed', [
                'material_id' => $this->materialId,
                'error'       => $e->getMessage(),
                'error_type'  => get_class($e),
                'trace'       => config('app.debug') ? $e->getTraceAsString() : null,
            ]);

            $material->update([
                'ingestion_status' => 'failed',
                'ai_sync'          => false,
            ]);
        }
    }
}
