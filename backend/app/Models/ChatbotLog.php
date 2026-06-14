<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ChatbotLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id', 'subject_id', 'question', 'response',
        'confidence_score', 'status', 'reviewed_by', 'teacher_note', 'reviewed_at',
    ];

    protected $casts = ['reviewed_at' => 'datetime'];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
