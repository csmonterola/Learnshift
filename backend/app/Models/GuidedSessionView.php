<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GuidedSessionView extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_id', 'student_id', 'guided_session_id',
        'progress_percent', 'completed', 'last_watched_at',
    ];

    protected $casts = [
        'completed'       => 'boolean',
        'last_watched_at' => 'datetime',
    ];

    public function guidedSession()
    {
        return $this->belongsTo(GuidedSession::class);
    }
}
