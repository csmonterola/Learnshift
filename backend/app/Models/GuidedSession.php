<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GuidedSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id', 'subject_id', 'title', 'description',
        'video_path', 'video_url', 'duration_minutes',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function views()
    {
        return $this->hasMany(GuidedSessionView::class);
    }
}
