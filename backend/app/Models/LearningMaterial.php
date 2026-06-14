<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class LearningMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id', 'subject_id', 'topic_id', 'lesson_id',
        'title', 'file_path', 'file_name', 'file_type', 'file_size', 'ai_sync',
        'ingestion_status',
    ];

    protected $casts = ['ai_sync' => 'boolean'];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function topic()
    {
        return $this->belongsTo(Topic::class);
    }
}
