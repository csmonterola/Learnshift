<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class StudentProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id', 'grade_level', 'section', 'total_xp',
        'streak_days', 'last_active_date', 'diagnostic_score', 'diagnostic_completed',
    ];

    protected $casts = [
        'last_active_date'       => 'date',
        'diagnostic_completed'   => 'boolean',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function masteryLevel(): string
    {
        $score = $this->diagnostic_score ?? 0;
        if ($score >= 90) return 'Advanced';
        if ($score >= 80) return 'Proficient';
        if ($score >= 60) return 'Developing';
        return 'Beginning';
    }
}
