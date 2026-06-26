<?php

namespace App\Jobs;

use App\Models\LearningMaterial;
use App\Services\Rag\MaterialIngestionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class IngestLearningMaterialJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;
    public int $timeout = 300;

    public function __construct(
        private readonly int $materialId
    ) {}

    public function handle(
        MaterialIngestionService $ingestionService
    ): void {
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
                'ai_sync' => false,
            ]);
        }
    }
}
