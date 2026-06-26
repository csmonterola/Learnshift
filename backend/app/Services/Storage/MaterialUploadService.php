<?php

namespace App\Services\Storage;

use App\Models\LearningMaterial;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class MaterialUploadService
{
    /**
     * Upload a file to storage and return the stored path.
     *
     * @param  \Illuminate\Http\UploadedFile  $file
     * @param  int  $lessonId
     * @param  string  $disk
     * @return string  Stored path
     *
     * @throws \RuntimeException
     */
    public function upload(UploadedFile $file, int $lessonId, string $disk = 'public'): string
    {
        $extension = $file->getClientOriginalExtension();
        $fileName  = sprintf(
            'lesson_%d/%s_%s.%s',
            $lessonId,
            Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)),
            uniqid(),
            $extension
        );

        try {
            $storedPath = Storage::disk($disk)->putFileAs(
                dirname($fileName),
                $file,
                basename($fileName)
            );

            if ($storedPath === false) {
                throw new RuntimeException('Storage putFileAs returned false.');
            }

            return $storedPath;
        } catch (\Throwable $e) {
            throw new RuntimeException(
                'File upload failed: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Get the public URL for a stored file path.
     *
     * @param  string  $path
     * @param  string  $disk
     * @return string
     */
    public function url(string $path, string $disk = 'public'): string
    {
        return Storage::disk($disk)->url($path);
    }

    /**
     * Delete a file from storage.
     *
     * @param  string  $path
     * @param  string  $disk
     * @return void
     */
    public function delete(string $path, string $disk = 'public'): void
    {
        Storage::disk($disk)->delete($path);
    }
}
