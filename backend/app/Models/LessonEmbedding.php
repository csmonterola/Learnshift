<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonEmbedding extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'lesson_id',
        'material_id',
        'chunk_index',
        'content_type',
        'material_image_id',
        'page_number',
        'content_hash',
        'chunk_text',
        'embedding',
    ];

    protected $casts = [
        'embedding' => 'array',
    ];

    public function materialImage(): BelongsTo
    {
        return $this->belongsTo(MaterialImage::class, 'material_image_id');
    }
}
