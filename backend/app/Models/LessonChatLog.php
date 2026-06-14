<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonChatLog extends Model
{
    protected $fillable = [
        'student_id',
        'lesson_id',
        'question',
        'response',
        'source',
        'retrieved_chunk_count',
        'confidence_score',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
