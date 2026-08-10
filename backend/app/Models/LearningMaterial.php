<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class LearningMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'teacher_id', 'subject_id', 'topic_id', 'lesson_id',
        'title', 'description', 'tags', 'file_path', 'file_name', 'file_type', 'file_size', 'ai_sync',
        'ingestion_status',
    ];

    protected $casts = [
        'ai_sync' => 'boolean',
        'tags'    => 'array',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function topic()
    {
        return $this->belongsTo(Topic::class);
    }

    public function lesson()
    {
        return $this->belongsTo(Lesson::class, 'lesson_id');
    }

    public function images()
    {
        return $this->hasMany(MaterialImage::class, 'learning_material_id');
    }

    /**
     * Generate consistent file URL with proper error handling.
     *
     * @return string|null
     */
    public function getFileUrlAttribute(): ?string
    {
        if ($this->file_type === 'LINK') {
            return $this->file_path; // External URL
        }
        
        if (!$this->file_path) {
            return null;
        }
        
        try {
            return Storage::disk('public')->url($this->file_path);
        } catch (\Exception $e) {
            Log::error('Failed to generate file URL', [
                'material_id' => $this->id,
                'file_path' => $this->file_path,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Generate public URL for the file.
     *
     * @return string|null
     */
    public function getPublicUrlAttribute(): ?string
    {
        return $this->getFileUrlAttribute();
    }

    /**
     * Check if the file URL is accessible.
     *
     * @return bool
     */
    public function isFileAccessible(): bool
    {
        $url = $this->file_url;
        if (!$url) {
            return false;
        }
        
        try {
            $response = Http::timeout(10)->head($url);
            $accessible = $response->successful();
            
            if (!$accessible) {
                Log::warning('File accessibility check failed', [
                    'material_id' => $this->id,
                    'url' => $url,
                    'status_code' => $response->status(),
                    'file_path' => $this->file_path
                ]);
            }
            
            return $accessible;
            
        } catch (\Exception $e) {
            Log::warning('File accessibility check exception', [
                'material_id' => $this->id,
                'url' => $url,
                'error' => $e->getMessage(),
                'file_path' => $this->file_path
            ]);
            return false;
        }
    }

    /**
     * Get storage metadata for the file.
     *
     * @return array
     */
    public function getStorageMetadata(): array
    {
        if (!$this->file_path) {
            return [];
        }
        
        try {
            $exists = Storage::disk('public')->exists($this->file_path);
            $size = $exists ? Storage::disk('public')->size($this->file_path) : null;
            $lastModified = $exists ? Storage::disk('public')->lastModified($this->file_path) : null;
            
            return [
                'exists' => $exists,
                'size' => $size,
                'last_modified' => $lastModified ? date('Y-m-d H:i:s', $lastModified) : null,
                'url' => $this->file_url,
                'accessible' => $this->isFileAccessible()
            ];
            
        } catch (\Exception $e) {
            Log::error('Failed to get storage metadata', [
                'material_id' => $this->id,
                'file_path' => $this->file_path,
                'error' => $e->getMessage()
            ]);
            
            return [
                'exists' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}