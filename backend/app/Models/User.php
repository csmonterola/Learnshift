<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'role', 'avatar', 'enrollment_code', 'is_active',
        'timezone', 'language', 'email_notifications', 'theme',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
        'is_active'         => 'boolean',
    ];

    // ── Role helpers ──────────────────────────────────────────────
    public function isAdmin(): bool    { return $this->role === 'admin'; }
    public function isTeacher(): bool  { return $this->role === 'teacher'; }
    public function isStudent(): bool  { return $this->role === 'student'; }
    public function isParent(): bool   { return $this->role === 'parent'; }

    // ── Relationships ─────────────────────────────────────────────
    public function studentProfile()
    {
        return $this->hasOne(StudentProfile::class, 'student_id');
    }

    public function taughtClasses()
    {
        return $this->hasMany(SchoolClass::class, 'teacher_id');
    }

    public function enrolledClasses()
    {
        return $this->belongsToMany(SchoolClass::class, 'class_student', 'student_id', 'class_id')
                    ->withPivot('enrolled_at');
    }

    public function children()
    {
        return $this->belongsToMany(User::class, 'parent_child', 'parent_id', 'student_id')
                    ->withPivot('linked_at', 'link_status', 'confirmed_at');
    }

    public function parents()
    {
        return $this->belongsToMany(User::class, 'parent_child', 'student_id', 'parent_id')
                    ->withPivot('linked_at');
    }

    public function topicProgress()
    {
        return $this->hasMany(StudentTopicProgress::class, 'student_id');
    }

    public function subjectMastery()
    {
        return $this->hasMany(StudentSubjectMastery::class, 'student_id');
    }

    public function practiceAttempts()
    {
        return $this->hasMany(PracticeAttempt::class, 'student_id');
    }

    public function chatbotLogs()
    {
        return $this->hasMany(ChatbotLog::class, 'student_id');
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class, 'user_id');
    }

    public function lessonProgress()
    {
        return $this->hasMany(StudentLessonProgress::class, 'student_id');
    }

    public function quizResults()
    {
        return $this->hasMany(QuizResult::class, 'student_id');
    }

    public function lessonChatLogs()
    {
        return $this->hasMany(LessonChatLog::class, 'student_id');
    }
}
