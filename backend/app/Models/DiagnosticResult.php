<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DiagnosticResult extends Model
{
    use HasFactory;

    protected $fillable = ['student_id', 'subject_id', 'score', 'topic_scores', 'study_plan'];

    protected $casts = [
        'topic_scores' => 'array',
        'study_plan'   => 'array',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}
