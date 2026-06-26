<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SchoolClass extends Model
{
    use HasFactory;

    protected $table = 'classes';

    protected $fillable = [
        'name', 'grade_level', 'section', 'school_year',
        'teacher_id', 'subject', 'subject_id', 'is_active',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function students()
    {
        return $this->belongsToMany(User::class, 'class_student', 'class_id', 'student_id')
                    ->withPivot('enrolled_at');
    }

    public function topics()
    {
        return $this->hasMany(Topic::class, 'class_id')->orderBy('order_index');
    }
}
