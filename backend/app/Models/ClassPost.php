<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassPost extends Model
{
    protected $fillable = [
        'class_id',
        'author_id',
        'title',
        'body',
        'status',
        'scheduled_at',
        'published_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'published_at' => 'datetime',
    ];

    public function class(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(PostComment::class, 'post_id');
    }

    /**
     * Only posts students may see: explicitly published posts, plus
     * scheduled posts whose scheduled date has passed. This removes the
     * need for a cron job to flip 'scheduled' → 'published' on schedule.
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->where('status', 'published')
                ->orWhere(function (Builder $inner) {
                    $inner->where('status', 'scheduled')
                        ->whereNotNull('scheduled_at')
                        ->where('scheduled_at', '<=', now());
                });
        });
    }
}
