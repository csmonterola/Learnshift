<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StudentTopicProgress extends Model
{
    use HasFactory;

    protected $table = 'student_topic_progress';

    protected $fillable = ['student_id', 'topic_id', 'status', 'mastery_score', 'xp_earned'];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function topic()
    {
        return $this->belongsTo(Topic::class);
    }
}
