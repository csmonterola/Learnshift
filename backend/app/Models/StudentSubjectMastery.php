<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StudentSubjectMastery extends Model
{
    use HasFactory;

    protected $table = 'student_subject_mastery';

    protected $fillable = ['student_id', 'subject_id', 'mastery_score', 'target_score'];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}
