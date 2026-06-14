<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LessonEmbedding extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'lesson_id',
        'material_id',
        'chunk_index',
        'chunk_text',
        'embedding',
    ];

    protected $casts = [
        'embedding' => 'array',
    ];
}
