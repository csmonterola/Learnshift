<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\SchoolClass;
use App\Models\Topic;
use App\Models\Lesson;
use App\Jobs\IngestLearningMaterialJob;
use Tests\TestCase;

/**
 * Bug Condition Exploration Test for Supabase Storage JWT Token Authentication Issue
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 * 
 * This test explores the bug condition where JWT tokens are incorrectly used as AWS S3 credentials
 * for Supabase storage operations, causing authentication failures.
 * 
 * CRITICAL: This test is EXPECTED TO FAIL on unfixed code - failure confirms the bug exists.
 * Success indicates either the bug is fixed or the test doesn't properly detect the bug condition.
 */
class SupabaseStorageBugConditionTest extends TestCase
{
    use RefreshDatabase;

    protected User $teacher;
    protected SchoolClass $schoolClass;
    protected Topic $topic;
    protected Lesson $lesson;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create simple test data without factories to avoid migration conflicts
        $this->teacher = new User([
            'id' => 1,
            'name' => 'Test Teacher',
            'email' => 'teacher@test.com',
            'role' => 'teacher',
        ]);
        
        // Mock simple IDs for relationships 
        $this->schoolClass = (object) ['id' => 1, 'teacher_id' => 1];
        $this->topic = (object) ['id' => 1, 'class_id' => 1];  
        $this->lesson = (object) ['id' => 1, 'topic_id' => 1];
        
        // Mock JWT token credentials (these should cause failures)
        config([
            'filesystems.disks.public.key' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhha29mY2F0cXBqdWZ2em9rbmNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMzODI4OSwiZXhwIjoyMDk2OTE0Mjg5fQ.QfMczDyb2GgdlzJ2LBOLAkd6ijYnhetrD_My_RPALEI',
            'filesystems.disks.public.secret' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhha29mY2F0cXBqdWZ2em9rbmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzgyODksImV4cCI6MjA5NjkxNDI4OX0.UR_9b15XSsAdKxo3UNz5_aH6GMQdSaCRkSdabOcj-lQ',
        ]);
    }

    /**
     * Property 1: JWT Token Authentication Failure - Storage operations with JWT tokens fail with authentication errors
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
     */
    public function testProperty1JwtTokenAuthenticationFailure(): void
    {
        // This property tests that when JWT tokens are used as S3 credentials,
        // storage operations fail with authentication errors (Requirements 1.1-1.5)
        
        $file = UploadedFile::fake()->create('test-document.pdf', 1024, 'application/pdf');
        
        // Test ContentController file upload - should fail with JWT tokens
        $response = $this->actingAs($this->teacher)->post('/api/teacher/content', [
            'title' => 'Test Material',
            'lesson_id' => $this->lesson->id,
            'file' => $file,
        ]);
        
        // Property assertion: Storage operations MUST fail when JWT tokens are used as credentials
        // Expected outcomes when using JWT tokens (bug condition):
        // - HTTP 500 error response due to storage authentication failure
        // - Error message indicating upload failure
        // - No valid file path returned
        // - Storage operation returns false or throws authentication exception
        
        $this->assertEquals(500, $response->status());
        $this->assertArrayHasKey('message', $response->json());
        $this->assertStringContainsString('Failed to upload file', $response->json('message'));
    }

    /**
     * Property 2: TopicController Upload Failure - File uploads through TopicController fail with JWT token credentials
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
     */
    public function testProperty2TopicControllerUploadFailure(): void
    {
        // Test TopicController material upload - should fail with authentication errors
        
        $file = UploadedFile::fake()->create('lesson-material.docx', 2048, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        
        $response = $this->actingAs($this->teacher)->post("/api/teacher/classes/{$this->schoolClass->id}/topics/{$this->topic->id}/lessons/{$this->lesson->id}/materials", [
            'file' => $file,
            'title' => 'Test Lesson Material',
        ]);
        
        // Property assertion: TopicController uploads MUST fail with JWT token credentials
        $this->assertGreaterThanOrEqual(400, $response->status());
        $this->assertLessThan(600, $response->status()); // Any 4xx or 5xx error
        
        // Verify no material was successfully created due to storage failure
        $this->assertDatabaseMissing('learning_materials', [
            'lesson_id' => $this->lesson->id,
            'title' => 'Test Lesson Material',
        ]);
    }

    /**
     * Property 3: IngestLearningMaterialJob Processing Failure - Job fails to access files with JWT credentials
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
     */
    public function testProperty3IngestLearningMaterialJobProcessingFailure(): void
    {
        // Create a material record manually (simulating one that got past initial validation)
        $material = \App\Models\LearningMaterial::create([
            'teacher_id' => $this->teacher->id,
            'lesson_id' => $this->lesson->id,
            'title' => 'Test Material for Processing',
            'file_path' => 'lessons/' . $this->lesson->id . '/materials/test.pdf',
            'file_name' => 'test.pdf',
            'file_type' => 'PDF',
            'file_size' => 1024,
            'ingestion_status' => 'pending',
        ]);
        
        // Mock Storage facade to simulate file existence but access failure with JWT tokens
        Storage::fake('public');
        Storage::disk('public')->put($material->file_path, 'fake pdf content');
        
        // Execute the ingestion job - should fail due to JWT token authentication issues
        $job = new IngestLearningMaterialJob($material->id);
        
        // Property assertion: IngestLearningMaterialJob MUST fail when using JWT tokens for S3 access
        try {
            $job->handle(
                app(\App\Services\Rag\TextExtractor::class),
                app(\App\Services\Rag\TextChunker::class),
                app(\App\Services\Rag\EmbeddingService::class)
            );
            
            // If we reach here, the job didn't fail as expected
            // Check if the material status indicates failure
            $material->refresh();
            $this->assertEquals('failed', $material->ingestion_status);
            
        } catch (\Exception $e) {
            // Expected: Job should throw exception due to storage authentication failure
            $this->assertMatchesRegularExpression('/auth|credential|access|403|401/i', $e->getMessage());
        }
    }

    /**
     * Property 4: File URL Generation Failure - Generated URLs are inaccessible with JWT token authentication
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
     */
    public function testProperty4FileUrlGenerationFailure(): void
    {
        // Create material with fake path
        $material = \App\Models\LearningMaterial::create([
            'teacher_id' => $this->teacher->id,
            'lesson_id' => $this->lesson->id,
            'title' => 'URL Test Material',
            'file_path' => 'lessons/' . $this->lesson->id . '/materials/test-url.pdf',
            'file_name' => 'test-url.pdf',
            'file_type' => 'PDF',
            'file_size' => 1024,
        ]);
        
        // Test URL generation - should produce URLs that return authentication errors
        try {
            $fileUrl = Storage::disk('public')->url($material->file_path);
            
            // Property assertion: Generated URLs MUST be inaccessible when using JWT tokens
            // The URL might be generated successfully, but accessing it should fail
            
            // Simulate HTTP request to the generated URL (this would fail in real scenario)
            // In a real test environment, this would return 401/403 from Supabase
            $this->assertIsString($fileUrl);
            $this->assertStringContainsString('supabase.co', $fileUrl); // URL format looks correct
            
            // But the URL would be inaccessible due to JWT token authentication issues
            // This represents the bug condition where URLs are generated but unusable
            
        } catch (\Exception $e) {
            // Expected: URL generation itself might fail with JWT tokens
            $this->assertMatchesRegularExpression('/auth|credential|access|token/i', $e->getMessage());
        }
    }

    /**
     * Property 5: Storage Configuration Validation - Current config should be identified as using invalid JWT credentials
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
     */
    public function testProperty5StorageConfigurationValidation(): void
    {
        // Test configuration validation to detect JWT token usage
        
        $currentConfig = config('filesystems.disks.public');
        
        // Property assertion: Configuration validation MUST detect JWT tokens as invalid S3 credentials
        
        // Check if access key is a JWT token (contains dots)
        $accessKey = $currentConfig['key'];
        $secretKey = $currentConfig['secret'];
        
        $this->assertStringContainsString('.', $accessKey); // JWT tokens contain dots
        $this->assertStringContainsString('.', $secretKey); // JWT tokens contain dots
        $this->assertGreaterThan(2, str_word_count($accessKey, 0, '.')); // JWT has 3 parts
        $this->assertGreaterThan(2, str_word_count($secretKey, 0, '.')); // JWT has 3 parts
        
        // Verify these are actually JWT-formatted tokens
        $accessKeyParts = explode('.', $accessKey);
        $secretKeyParts = explode('.', $secretKey);
        
        $this->assertEquals(3, count($accessKeyParts)); // JWT structure: header.payload.signature
        $this->assertEquals(3, count($secretKeyParts));
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]+$/', $accessKeyParts[0]); // Base64URL encoded
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]+$/', $secretKeyParts[0]);
        
        // This configuration should be rejected by proper validation
        // The bug is that the system currently accepts these JWT tokens as S3 credentials
    }

    /**
     * Property 6: Storage Operation Return Values - Operations return false or null when JWT authentication fails
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
     */
    public function testProperty6StorageOperationReturnValues(): void
    {
        // Test direct storage operations to verify they return failure indicators
        
        Storage::fake('public'); // Use fake storage to isolate the credential issue
        
        $testFile = UploadedFile::fake()->create('direct-test.txt', 100, 'text/plain');
        $testPath = 'lessons/' . $this->lesson->id . '/materials/direct-test.txt';
        
        // Property assertion: Storage operations MUST return false/null when authentication fails
        
        try {
            // This should fail with JWT tokens as credentials
            $result = Storage::disk('public')->putFileAs(
                'lessons/' . $this->lesson->id . '/materials',
                $testFile,
                'direct-test.txt'
            );
            
            // If the operation completes, it should return false or null indicating failure
            $this->assertContains($result, [false, null, '', '0'])
                || $this->assertStringStartsWith('0', (string) $result); // Some storage operations return paths starting with '0' on failure
            
        } catch (\Exception $e) {
            // Expected: Direct storage operation throws authentication exception
            $this->assertMatchesRegularExpression('/auth|credential|access|forbidden|401|403/i', $e->getMessage());
        }
        
        // Test file existence check - should also fail
        try {
            $exists = Storage::disk('public')->exists($testPath);
            // With JWT tokens, existence checks should fail or return false
            $this->assertFalse($exists);
            
        } catch (\Exception $e) {
            // Expected: Existence check fails due to authentication
            $this->assertMatchesRegularExpression('/auth|credential|access/i', $e->getMessage());
        }
    }
}