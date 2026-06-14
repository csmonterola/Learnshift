<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Question extends Model
{
    use HasFactory;

    protected $fillable = ['topic_id', 'question_text', 'options', 'correct_answer', 'explanation', 'difficulty'];

    protected $casts = ['options' => 'array'];

    public function topic()
    {
        return $this->belongsTo(Topic::class);
    }
}
