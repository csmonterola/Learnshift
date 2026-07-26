<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\LearningMaterial;
use App\Services\Rag\MaterialIngestionService;
use App\Services\Storage\StorageConfigurationValidator;
use App\Exceptions\TextExtractionException;
use App\Exceptions\EmbeddingException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ContentController extends Controller
{
    public function __construct(
        private readonly StorageConfigurationValidator $storageValidator,
        private readonly MaterialIngestionService      $ingestionService,
    ) {}
    
    public function index(Request $request)
    {
        $materials = LearningMaterial::where('teacher_id', $request->user()->id)
            ->with(['lesson.topic.schoolClass', 'subject'])
            ->latest()
            ->get()
            ->map(function ($material) {
                $class = $material->lesson?->topic?->schoolClass;
                return [
                    'id'               => $material->id,
                    'title'            => $material->title,
                    'file_name'        => $material->file_name,
                    'file_type'        => $material->file_type,
                    'file_size'        => $material->file_size,
                    'file_path'        => $material->file_path,
                    'file_url'         => $material->file_url, // Use model's enhanced URL generation
                    'ai_sync'          => $material->ai_sync,
                    'ingestion_status' => $material->ingestion_status ?? 'pending',
                    'created_at'       => $material->created_at,
                    'updated_at'       => $material->updated_at,
                    'subject'          => $class?->subject ?? 'N/A',
                    'class_name'       => $class?->name ?? ($material->subject?->name ?? 'N/A'),
                    'class_id'         => $class?->id,
                    'topic'            => $material->lesson?->topic?->title ?? 'N/A',
                    'topic_id'         => $material->lesson?->topic?->id,
                    'lesson'           => $material->lesson?->title ?? 'N/A',
                    'lesson_id'        => $material->lesson_id,
                ];
            });

        return response()->json($materials);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title'      => 'required|string|max:255',
            'lesson_id'  => 'required|exists:lessons,id',
            'file'       => 'required|file|mimes:pdf,docx,pptx,doc,ppt,txt|max:51200',
        ]);

        // Validate storage configuration before attempting upload
        $configValidation = $this->storageValidator->validateCurrentConfig('public');
        if (!$configValidation['valid']) {
            Log::error('Storage configuration validation failed during upload', [
                'errors' => $configValidation['errors'],
                'credential_type' => $configValidation['credential_type'],
                'lesson_id' => $request->lesson_id,
                'user_id' => $request->user()->id
            ]);
            
            return response()->json([
                'message' => 'Storage system not properly configured',
                'error' => 'Unable to upload files due to authentication configuration issues. Please contact support.',
                'technical_details' => config('app.debug') ? [
                    'errors' => $configValidation['errors'],
                    'credential_type' => $configValidation['credential_type']
                ] : null
            ], 500);
        }

        // Verify lesson ownership
        $lesson = $this->verifyLessonOwnership($request->lesson_id, $request->user()->id);
        if (!$lesson) {
            Log::warning('Unauthorized file upload attempt', [
                'lesson_id' => $request->lesson_id,
                'user_id' => $request->user()->id,
                'user_name' => $request->user()->name
            ]);
            return response()->json(['message' => 'Lesson not found or unauthorized access.'], 403);
        }

        $file = $request->file('file');
        $uploadContext = [
            'lesson_id' => $request->lesson_id,
            'filename' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'file_type' => $file->getClientOriginalExtension(),
            'user_id' => $request->user()->id
        ];
        
        try {
            // Generate consistent file path with unique identifier
            $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $filePath = "lessons/{$request->lesson_id}/materials/{$fileName}";
            
            Log::info('Starting file upload', array_merge($uploadContext, ['storage_path' => $filePath]));
            
            // Upload file with comprehensive error handling
            $storagePath = Storage::disk('public')->putFileAs(
                dirname($filePath), 
                $file, 
                basename($filePath)
            );
            
            if (!$storagePath) {
                throw new \RuntimeException('Storage operation returned false - upload may have failed due to insufficient storage space or permissions');
            }
            
            // Critical: Verify upload success immediately after upload
            if (!Storage::disk('public')->exists($storagePath)) {
                // Attempt cleanup of any partial upload
                try {
                    Storage::disk('public')->delete($storagePath);
                } catch (\Exception $cleanupException) {
                    Log::warning('Failed to cleanup partial upload', [
                        'storage_path' => $storagePath,
                        'cleanup_error' => $cleanupException->getMessage()
                    ]);
                }
                
                throw new \RuntimeException('File upload verification failed - file not found after upload. This may indicate storage authentication issues.');
            }
            
            // Generate URL and verify accessibility
            $uploadResult = $this->verifyUploadAndGenerateUrl($storagePath, $uploadContext);
            
            if (!$uploadResult['success']) {
                // Cleanup uploaded file if URL verification fails
                try {
                    Storage::disk('public')->delete($storagePath);
                } catch (\Exception $cleanupException) {
                    Log::error('Failed to cleanup file after URL verification failure', [
                        'storage_path' => $storagePath,
                        'cleanup_error' => $cleanupException->getMessage()
                    ]);
                }
                
                throw new \RuntimeException($uploadResult['error']);
            }
            
            $fileUrl = $uploadResult['file_url'];
            
            Log::info('File uploaded and verified successfully', array_merge($uploadContext, [
                'storage_path' => $storagePath,
                'file_url' => $fileUrl,
                'url_accessible' => $uploadResult['url_accessible']
            ]));
            
        } catch (\Exception $e) {
            Log::error('File upload failed', array_merge($uploadContext, [
                'error' => $e->getMessage(),
                'error_type' => get_class($e),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ]));
            
            return $this->handleUploadError($e, $uploadContext);
        }

        // Create database record with verified upload
        try {
            $fileType = strtoupper($file->getClientOriginalExtension());

            $material = LearningMaterial::create([
                'teacher_id'       => $request->user()->id,
                'lesson_id'        => $request->lesson_id,
                'title'            => $request->title,
                'file_path'        => $storagePath,
                'file_name'        => $file->getClientOriginalName(),
                'file_type'        => $fileType,
                'file_size'        => $file->getSize(),
                'ai_sync'          => in_array($fileType, ['PDF', 'DOCX', 'PPTX']),
                'ingestion_status' => 'pending',
            ]);

            ActivityLog::create([
                'user_id'     => $request->user()->id,
                'action'      => 'material_uploaded',
                'description' => "Teacher {$request->user()->name} uploaded material '{$material->title}' to lesson {$request->lesson_id}",
            ]);

            return response()->json([
                'success' => true,
                'material' => $material->load(['lesson.topic.schoolClass', 'subject']),
                'file_url' => $fileUrl,
                'upload_verified' => $uploadResult['url_accessible']
            ], 201);
            
        } catch (\Exception $dbException) {
            Log::error('Database record creation failed after successful upload', array_merge($uploadContext, [
                'storage_path' => $storagePath,
                'db_error' => $dbException->getMessage()
            ]));
            
            // Attempt to cleanup uploaded file since DB operation failed
            try {
                Storage::disk('public')->delete($storagePath);
                Log::info('Cleaned up uploaded file after database failure', ['storage_path' => $storagePath]);
            } catch (\Exception $cleanupException) {
                Log::error('Failed to cleanup uploaded file after database failure', [
                    'storage_path' => $storagePath,
                    'cleanup_error' => $cleanupException->getMessage()
                ]);
            }
            
            return response()->json([
                'message' => 'File uploaded successfully but failed to save record',
                'error' => 'Database error occurred while saving file information. Please try again.',
                'debug_info' => config('app.debug') ? $dbException->getMessage() : null
            ], 500);
        }
    }

    public function update(Request $request, LearningMaterial $material)
    {
        if ($material->teacher_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $material->update($request->only(['title', 'lesson_id']));
        return response()->json($material->load(['lesson.topic.schoolClass', 'subject']));
    }

    public function destroy(Request $request, LearningMaterial $material)
    {
        if ($material->teacher_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($material->file_type !== 'LINK') {
            Storage::disk('public')->delete($material->file_path);
        }
        $material->delete();

        return response()->json(['message' => 'Material deleted.']);
    }

    public function reprocess(Request $request, LearningMaterial $material)
    {
        if ($material->teacher_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            $result = $this->ingestionService->ingest($material);

            return response()->json([
                'message' => 'Material successfully processed and indexed.',
                'chunks'  => $result['chunks'],
                'images'  => $result['images'],
            ]);

        } catch (TextExtractionException $e) {
            Log::error('Content reprocess text extraction failed', [
                'material_id' => $material->id,
                'error'       => $e->getMessage(),
            ]);
            $material->update(['ingestion_status' => 'failed']);
            return response()->json(['message' => 'Failed to extract text: ' . $e->getMessage()], 422);

        } catch (EmbeddingException $e) {
            Log::error('Content reprocess embedding failed', [
                'material_id' => $material->id,
                'error'       => $e->getMessage(),
            ]);
            $material->update(['ingestion_status' => 'failed']);
            return response()->json(['message' => 'AI embedding service error: ' . $e->getMessage()], 502);

        } catch (\Throwable $e) {
            Log::error('Content reprocess failed', [
                'material_id' => $material->id,
                'error'       => $e->getMessage(),
                'trace'       => $e->getTraceAsString(),
            ]);
            $material->update(['ingestion_status' => 'failed']);
            return response()->json(['message' => 'Processing failed: ' . $e->getMessage()], 500);
        }
    }

    public function lessons(Request $request)
    {
        $teacher = $request->user();
        $classId = $request->query('class_id');

        $lessons = DB::table('lessons')
            ->join('topics', 'lessons.topic_id', '=', 'topics.id')
            ->join('classes', 'topics.class_id', '=', 'classes.id')
            ->where('classes.teacher_id', $teacher->id)
            ->when($classId, fn($q) => $q->where('classes.id', $classId))
            ->select('lessons.id', 'lessons.title', 'topics.title as topic_title', 'classes.name as class_name', 'classes.id as class_id')
            ->orderBy('classes.name')
            ->orderBy('topics.title')
            ->orderBy('lessons.title')
            ->get();

        return response()->json($lessons);
    }

    /**
     * Verify lesson ownership for the authenticated teacher.
     *
     * @param int $lessonId
     * @param int $teacherId
     * @return object|null
     */
    private function verifyLessonOwnership(int $lessonId, int $teacherId): ?object
    {
        return DB::table('lessons')
            ->join('topics', 'lessons.topic_id', '=', 'topics.id')
            ->join('classes', 'topics.class_id', '=', 'classes.id')
            ->where('lessons.id', $lessonId)
            ->where('classes.teacher_id', $teacherId)
            ->select('lessons.id', 'lessons.title')
            ->first();
    }

    /**
     * Verify upload success and generate accessible URL.
     *
     * @param string $storagePath
     * @param array $context
     * @return array
     */
    private function verifyUploadAndGenerateUrl(string $storagePath, array $context): array
    {
        try {
            // Generate public URL
            $fileUrl = Storage::disk('public')->url($storagePath);
            
            if (!$fileUrl) {
                return [
                    'success' => false,
                    'error' => 'Failed to generate public URL for uploaded file'
                ];
            }

            // Test URL accessibility
            $urlAccessible = $this->testUrlAccessibility($fileUrl, $context);
            
            if (!$urlAccessible) {
                Log::warning('File uploaded but URL not immediately accessible', array_merge($context, [
                    'storage_path' => $storagePath,
                    'file_url' => $fileUrl,
                    'note' => 'URL may become accessible after CDN propagation'
                ]));
            }

            return [
                'success' => true,
                'file_url' => $fileUrl,
                'url_accessible' => $urlAccessible
            ];
            
        } catch (\Exception $e) {
            Log::error('URL generation or verification failed', array_merge($context, [
                'storage_path' => $storagePath,
                'error' => $e->getMessage()
            ]));
            
            return [
                'success' => false,
                'error' => 'Failed to generate or verify file URL: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Test URL accessibility with timeout and proper error handling.
     *
     * @param string $url
     * @param array $context
     * @return bool
     */
    private function testUrlAccessibility(string $url, array $context = []): bool
    {
        try {
            $response = Http::timeout(10)->head($url);
            $accessible = $response->successful();
            
            Log::info('URL accessibility test completed', array_merge($context, [
                'url' => $url,
                'status_code' => $response->status(),
                'accessible' => $accessible
            ]));
            
            return $accessible;
            
        } catch (\Exception $e) {
            Log::warning('URL accessibility test failed with exception', array_merge($context, [
                'url' => $url,
                'error' => $e->getMessage(),
                'note' => 'This may be normal for new uploads due to CDN propagation delays'
            ]));
            
            return false;
        }
    }

    /**
     * Handle upload errors with user-friendly messages.
     *
     * @param \Exception $exception
     * @param array $context
     * @return \Illuminate\Http\JsonResponse
     */
    private function handleUploadError(\Exception $exception, array $context): \Illuminate\Http\JsonResponse
    {
        $errorMessage = $exception->getMessage();
        $userFriendlyMessage = 'Failed to upload file';
        $httpStatus = 500;

        // Provide specific user-friendly messages based on error type
        if (str_contains($errorMessage, 'authentication') || str_contains($errorMessage, 'InvalidAccessKeyId')) {
            $userFriendlyMessage = 'File upload failed due to storage authentication issues';
            $httpStatus = 502; // Bad Gateway - external service issue
        } elseif (str_contains($errorMessage, 'SignatureDoesNotMatch')) {
            $userFriendlyMessage = 'File upload failed due to storage configuration issues';
            $httpStatus = 502;
        } elseif (str_contains($errorMessage, 'NoSuchBucket') || str_contains($errorMessage, 'bucket')) {
            $userFriendlyMessage = 'File upload failed - storage location not available';
            $httpStatus = 502;
        } elseif (str_contains($errorMessage, 'AccessDenied') || str_contains($errorMessage, 'permissions')) {
            $userFriendlyMessage = 'File upload failed due to insufficient storage permissions';
            $httpStatus = 502;
        } elseif (str_contains($errorMessage, 'file size') || str_contains($errorMessage, 'too large')) {
            $userFriendlyMessage = 'File is too large to upload';
            $httpStatus = 413; // Payload Too Large
        } elseif (str_contains($errorMessage, 'network') || str_contains($errorMessage, 'timeout')) {
            $userFriendlyMessage = 'File upload failed due to network connectivity issues';
            $httpStatus = 503; // Service Unavailable
        } elseif (str_contains($errorMessage, 'verification failed')) {
            $userFriendlyMessage = 'File upload completed but verification failed - please try again';
            $httpStatus = 422; // Unprocessable Entity
        }

        return response()->json([
            'message' => $userFriendlyMessage,
            'error' => 'Please check your file and try again. If the problem persists, contact support.',
            'technical_details' => config('app.debug') ? [
                'error_message' => $errorMessage,
                'error_type' => get_class($exception),
                'context' => $context
            ] : null
        ], $httpStatus);
    }
}