<?php

namespace App\Console\Commands;

use App\Jobs\IngestLearningMaterialJob;
use App\Models\LearningMaterial;
use Illuminate\Console\Command;

class ReDispatchPendingIngestions extends Command
{
    protected $signature = 'rag:redispatch';
    protected $description = 'Re-dispatch ingestion jobs for materials stuck in pending status';

    public function handle(): int
    {
        $materials = LearningMaterial::where('ingestion_status', 'pending')
            ->where('ai_sync', true)
            ->whereNotNull('lesson_id')
            ->get();

        if ($materials->isEmpty()) {
            $this->info('No pending materials to re-dispatch.');
            return self::SUCCESS;
        }

        $this->info("Re-dispatching {$materials->count()} material(s)...");

        foreach ($materials as $material) {
            $this->line("  Dispatching material #{$material->id}: {$material->title}");
            IngestLearningMaterialJob::dispatch($material->id);
        }

        $this->info('Done. Run "php artisan queue:work" to process the jobs.');

        return self::SUCCESS;
    }
}