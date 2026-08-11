<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PracticeAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id', 'topic_id', 'score',
        'total_questions', 'correct_answers', 'answers', 'question_meta', 'time_spent_seconds',
    ];

    protected $casts = ['answers' => 'array', 'question_meta' => 'array'];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function topic()
    {
        return $this->belongsTo(Topic::class);
    }
}
