<?php

namespace App\Observers;

use App\Jobs\IngestLearningMaterialJob;
use App\Models\LearningMaterial;
use App\Models\LessonEmbedding;

class LearningMaterialObserver
{
    /**
     * Handle the LearningMaterial "created" event.
     */
    public function created(LearningMaterial $material): void
    {
        if ($material->ai_sync && $material->lesson_id !== null) {
            $material->update(['ingestion_status' => 'pending']);
            IngestLearningMaterialJob::dispatch($material->id);
        }
    }

    /**
     * Handle the LearningMaterial "updated" event.
     */
    public function updated(LearningMaterial $material): void
    {
        $aiSyncChangedToTrue = $material->wasChanged('ai_sync')
            && $material->ai_sync === true
            && $material->getOriginal('ai_sync') === false;

        $filePathChangedWithSync = $material->wasChanged('file_path')
            && $material->ai_sync === true;

        $aiSyncChangedToFalse = $material->wasChanged('ai_sync')
            && $material->ai_sync === false
            && $material->getOriginal('ai_sync') === true;

        if ($aiSyncChangedToTrue || $filePathChangedWithSync) {
            $material->update(['ingestion_status' => 'pending']);
            IngestLearningMaterialJob::dispatch($material->id);
            return;
        }

        if ($aiSyncChangedToFalse) {
            LessonEmbedding::where('material_id', $material->id)->delete();
            $material->update(['ingestion_status' => 'none']);
        }
    }

    /**
     * Handle the LearningMaterial "deleted" event.
     */
    public function deleted(LearningMaterial $material): void
    {
        LessonEmbedding::where('material_id', $material->id)->delete();
    }
}
