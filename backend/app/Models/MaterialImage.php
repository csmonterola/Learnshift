<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class MaterialImage extends Model
{
    protected $fillable = [
        'learning_material_id',
        'page_number',
        's3_path',
        'width',
        'height',
        'file_size',
        'content_hash',
        'extraction_status',
        'caption',
        'requires_ai_classification',
    ];

    public function learningMaterial(): BelongsTo
    {
        return $this->belongsTo(LearningMaterial::class);
    }

    public function getUrlAttribute(): ?string
    {
        if (!$this->s3_path) {
            return null;
        }

        try {
            return Storage::disk('public')->url($this->s3_path);
        } catch (\Exception $e) {
            return null;
        }
    }

    public function scopeByMaterialAndPage($query, int $materialId, int $pageNumber)
    {
        return $query->where('learning_material_id', $materialId)
            ->where('page_number', $pageNumber)
            ->orderBy('id');
    }
}
