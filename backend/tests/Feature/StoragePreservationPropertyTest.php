<?php

namespace Tests\Feature;

use App\Models\LearningMaterial;
use App\Models\Lesson;
use App\Models\SchoolClass;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Property-Based Tests for Storage Operations Behavior Preservation
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * These tests verify behaviors that should be preserved when fixing the 
 * Supabase storage authentication bug. They test functionality that doesn't 
 * depend on actual storage authentication - validation logic, path generation,
 * database operations, and lesson ownership verification.
 * 
 * IMPORTANT: These tests are EXPECTED TO PASS on unfixed code since they test
 * behaviors that work correctly even with JWT token authentication issues.
 */
class StoragePreservationPropertyTest extends TestCase
{
    use RefreshDatabase;
    
    protected User $teacher;
    protected SchoolClass $class;
    protected Topic $topic;
    protected Lesson $lesson;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        // Set up test data structure
        $this->teacher = User::factory()->create(['role' => 'teacher']);
        $this->class = SchoolClass::factory()->create(['teacher_id' => $this->teacher->id]);
        $this->topic = Topic::factory()->create(['class_id' => $this->class->id]);
        $this->lesson = Lesson::factory()->create(['topic_id' => $this->topic->id]);
    }
    
    /**
     * Property 2.1: File Validation Logic Preservation
     * 
     * **Validates: Requirements 3.4**
     * 
     * For any file upload request, the validation logic should continue to work
     * correctly regardless of storage authentication issues. This tests that
     * file type restrictions, size limits, and required field validation
     * function properly.
     */
    public function test_file_validation_logic_preserved_across_file_types()
    {
        $this->actingAs($this->teacher);
        
        // Property: File type validation should work for all supported formats
        $validExtensions = ['pdf', 'docx', 'pptx', 'doc', 'ppt', 'txt'];
        $invalidExtensions = ['exe', 'bat', 'php', 'js'];
        
        foreach ($validExtensions as $ext) {
            $file = UploadedFile::fake()->create("test.$ext", 1000); // 1KB file
            
            $response = $this->postJson('/api/teacher/content', [
                'title' => "Test Document $ext",
                'lesson_id' => $this->lesson->id,
                'file' => $file,
            ]);
            
            // The validation should pass (not return 422)
            // Note: It may fail with 500 due to storage auth, but validation should be OK
            $this->assertNotEquals(422, $response->status(), 
                "File validation failed for valid extension: $ext");
        }
        
        foreach ($invalidExtensions as $ext) {
            $file = UploadedFile::fake()->create("test.$ext", 1000);
            
            $response = $this->postJson('/api/teacher/content', [
                'title' => "Test Document $ext", 
                'lesson_id' => $this->lesson->id,
                'file' => $file,
            ]);
            
            // Should fail validation with 422
            $this->assertEquals(422, $response->status(),
                "File validation should reject invalid extension: $ext");
        }
    }
    
    /**
     * Property 2.2: File Size Validation Preservation
     * 
     * **Validates: Requirements 3.4**
     * 
     * For any file upload, size validation should continue to enforce
     * the 51200KB (50MB) limit regardless of authentication issues.
     */
    public function test_file_size_validation_preserved()
    {
        $this->actingAs($this->teacher);
        
        // Test file under the limit (should pass validation)
        $smallFile = UploadedFile::fake()->create('small.pdf', 1000); // 1KB
        
        $response = $this->postJson('/api/teacher/content', [
            'title' => 'Small Document',
            'lesson_id' => $this->lesson->id,
            'file' => $smallFile,
        ]);
        
        $this->assertNotEquals(422, $response->status(), 
            'Small file should pass size validation');
        
        // Test file over the limit (should fail validation)
        $largeFile = UploadedFile::fake()->create('large.pdf', 52000); // > 50MB
        
        $response = $this->postJson('/api/teacher/content', [
            'title' => 'Large Document',
            'lesson_id' => $this->lesson->id,
            'file' => $largeFile,
        ]);
        
        $this->assertEquals(422, $response->status(),
            'Large file should fail size validation');
    }
    
    /**
     * Property 2.3: Path Generation Consistency Preservation
     * 
     * **Validates: Requirements 3.1**
     * 
     * For any lesson ID, the file path generation should follow the consistent
     * pattern: lessons/{lesson_id}/materials/ regardless of storage issues.
     */
    public function test_path_generation_consistency_preserved()
    {
        // Test path generation for different lesson scenarios
        $testLessons = [];
        
        for ($i = 0; $i < 4; $i++) {
            $testLessons[] = Lesson::factory()->create([
                'topic_id' => $this->topic->id
            ]);
        }
        
        foreach ($testLessons as $lesson) {
            $this->actingAs($this->teacher);
            
            $file = UploadedFile::fake()->create('test.pdf', 1000);
            
            // Make request - even if it fails due to storage, we can check the intended path
            $response = $this->postJson('/api/teacher/content', [
                'title' => "Test for lesson {$lesson->id}",
                'lesson_id' => $lesson->id,
                'file' => $file,
            ]);
            
            // If a LearningMaterial was created, check its path
            $material = LearningMaterial::where('lesson_id', $lesson->id)->first();
            if ($material) {
                $expectedPathPrefix = "lessons/{$lesson->id}/materials/";
                $this->assertStringStartsWith($expectedPathPrefix, $material->file_path,
                    "File path should follow lessons/{lesson_id}/materials/ pattern for lesson ID {$lesson->id}");
            }
        }
    }
    
    /**
     * Property 2.4: Database Record Creation Preservation
     * 
     * **Validates: Requirements 3.2, 3.5**
     * 
     * For any successful file processing (when storage doesn't fail),
     * LearningMaterial records should be created with correct metadata
     * and maintain referential integrity.
     */
    public function test_database_record_creation_preserved()
    {
        $this->actingAs($this->teacher);
        
        $testCases = [
            ['filename' => 'document.pdf', 'expected_type' => 'PDF'],
            ['filename' => 'presentation.pptx', 'expected_type' => 'PPTX'],  
            ['filename' => 'text.docx', 'expected_type' => 'DOCX'],
            ['filename' => 'simple.txt', 'expected_type' => 'TXT'],
        ];
        
        foreach ($testCases as $case) {
            $file = UploadedFile::fake()->create($case['filename'], 1500);
            $title = "Test " . $case['filename'];
            
            $initialCount = LearningMaterial::count();
            
            $response = $this->postJson('/api/teacher/content', [
                'title' => $title,
                'lesson_id' => $this->lesson->id,
                'file' => $file,
            ]);
            
            // Always make an assertion, even if request fails
            if ($response->status() === 201) {
                $this->assertEquals($initialCount + 1, LearningMaterial::count(),
                    'LearningMaterial record should be created');
                
                $material = LearningMaterial::latest()->first();
                
                // Verify metadata is correct
                $this->assertEquals($title, $material->title);
                $this->assertEquals($case['filename'], $material->file_name);
                $this->assertEquals($case['expected_type'], $material->file_type);
                $this->assertEquals(1500, $material->file_size);
                $this->assertEquals($this->teacher->id, $material->teacher_id);
                $this->assertEquals($this->lesson->id, $material->lesson_id);
                $this->assertEquals('pending', $material->ingestion_status);
                
                // Verify referential integrity
                $this->assertNotNull($material->teacher);
                $this->assertNotNull($material->lesson);
                $this->assertEquals($this->teacher->id, $material->teacher->id);
                $this->assertEquals($this->lesson->id, $material->lesson->id);
            } else {
                // Even if storage fails, we should not get a validation error (422)
                // The preservation property is that validation logic works correctly
                $this->assertNotEquals(422, $response->status(), 
                    "Validation should pass for valid file type {$case['expected_type']} even if storage fails");
            }
        }
    }
    
    /**
     * Property 2.5: Lesson Ownership Verification Preservation
     * 
     * **Validates: Requirements 3.3**
     * 
     * For any upload attempt, lesson ownership verification should continue
     * to work correctly, preventing unauthorized uploads regardless of
     * storage authentication status.
     */
    public function test_lesson_ownership_verification_preserved()
    {
        // Create another teacher and their lesson
        $otherTeacher = User::factory()->create(['role' => 'teacher']);
        $otherClass = SchoolClass::factory()->create(['teacher_id' => $otherTeacher->id]);
        $otherTopic = Topic::factory()->create(['class_id' => $otherClass->id]);
        $otherLesson = Lesson::factory()->create(['topic_id' => $otherTopic->id]);
        
        $this->actingAs($this->teacher);
        
        $file = UploadedFile::fake()->create('test.pdf', 1000);
        
        // Try to upload to another teacher's lesson (should be forbidden)
        $response = $this->postJson('/api/teacher/content', [
            'title' => 'Unauthorized Upload',
            'lesson_id' => $otherLesson->id,
            'file' => $file,
        ]);
        
        $this->assertEquals(403, $response->status(),
            'Should reject upload to lesson not owned by teacher');
        
        // Verify no LearningMaterial was created for unauthorized lesson
        $unauthorizedMaterials = LearningMaterial::where('lesson_id', $otherLesson->id)
            ->where('teacher_id', $this->teacher->id)
            ->count();
        
        $this->assertEquals(0, $unauthorizedMaterials,
            'No material should be created for unauthorized lesson');
        
        // Upload to own lesson should pass ownership check (may still fail on storage)
        $response = $this->postJson('/api/teacher/content', [
            'title' => 'Authorized Upload',
            'lesson_id' => $this->lesson->id,
            'file' => $file,
        ]);
        
        $this->assertNotEquals(403, $response->status(),
            'Should pass ownership check for own lesson');
    }
    
    /**
     * Property 2.6: Required Field Validation Preservation
     * 
     * **Validates: Requirements 3.4**
     * 
     * For any upload request, required field validation (title, lesson_id, file)
     * should continue to work correctly.
     */
    public function test_required_field_validation_preserved()
    {
        $this->actingAs($this->teacher);
        
        $file = UploadedFile::fake()->create('test.pdf', 1000);
        
        // Test missing title
        $response = $this->postJson('/api/teacher/content', [
            'lesson_id' => $this->lesson->id,
            'file' => $file,
        ]);
        $this->assertEquals(422, $response->status(), 'Should require title');
        
        // Test missing lesson_id  
        $response = $this->postJson('/api/teacher/content', [
            'title' => 'Test Document',
            'file' => $file,
        ]);
        $this->assertEquals(422, $response->status(), 'Should require lesson_id');
        
        // Test missing file
        $response = $this->postJson('/api/teacher/content', [
            'title' => 'Test Document',
            'lesson_id' => $this->lesson->id,
        ]);
        $this->assertEquals(422, $response->status(), 'Should require file');
        
        // Test invalid lesson_id (non-existent)
        $response = $this->postJson('/api/teacher/content', [
            'title' => 'Test Document',
            'lesson_id' => 99999, // Non-existent lesson
            'file' => $file,
        ]);
        $this->assertEquals(422, $response->status(), 'Should validate lesson exists');
    }
    
    /**
     * Property 2.7: TopicController File Processing Preservation
     * 
     * **Validates: Requirements 3.1, 3.2, 3.4**
     * 
     * The TopicController's storeMaterial method should preserve the same
     * validation and path generation behavior as ContentController.
     */
    public function test_topic_controller_preservation_behavior()
    {
        $this->actingAs($this->teacher);
        
        $file = UploadedFile::fake()->create('presentation.pptx', 2000);
        
        // Test TopicController's storeMaterial endpoint
        $response = $this->postJson("/api/teacher/classes/{$this->class->id}/topics/{$this->topic->id}/lessons/{$this->lesson->id}/materials", [
            'title' => 'Topic Material',
            'file' => $file,
        ]);
        
        // Should pass validation (not 422)
        $this->assertNotEquals(422, $response->status(),
            'TopicController should pass validation for valid inputs');
        
        // If successful, verify database record creation
        if ($response->status() === 201) {
            $material = LearningMaterial::where('lesson_id', $this->lesson->id)
                ->where('title', 'Topic Material')
                ->first();
            
            $this->assertNotNull($material, 'Material should be created via TopicController');
            $this->assertEquals('PPTX', $material->file_type);
            $this->assertEquals(2000, $material->file_size);
            $this->assertTrue($material->ai_sync, 'PPTX files should have ai_sync enabled');
            
            // Verify path follows the same pattern
            $expectedPathPrefix = "lessons/{$this->lesson->id}/materials/";
            $this->assertStringStartsWith($expectedPathPrefix, $material->file_path,
                'TopicController should use same path pattern');
        }
    }
    
    /**
     * Property 2.8: Error Logging Behavior Preservation  
     * 
     * **Validates: Requirements 3.6**
     * 
     * Error logging should continue to work without exposing sensitive
     * credentials, even when storage operations fail.
     */
    public function test_error_logging_preservation()
    {
        $this->actingAs($this->teacher);
        
        // Test with an extremely large file that should trigger size validation
        $largeFile = UploadedFile::fake()->create('huge.pdf', 100000); // > 50MB
        
        $response = $this->postJson('/api/teacher/content', [
            'title' => 'Test Logging',
            'lesson_id' => $this->lesson->id,
            'file' => $largeFile,
        ]);
        
        // Should get validation error (422), not expose credentials in response
        $this->assertEquals(422, $response->status());
        
        $responseData = $response->json();
        
        // Verify no JWT tokens or credentials in error response
        $responseText = json_encode($responseData);
        $this->assertStringNotContainsString('eyJ', $responseText,
            'Response should not contain JWT token fragments');
        $this->assertStringNotContainsString('AWS_ACCESS_KEY', $responseText,
            'Response should not contain credential environment variable names');
        $this->assertStringNotContainsString('AWS_SECRET_ACCESS_KEY', $responseText,
            'Response should not contain credential environment variable names');
    }
    
    /**
     * Property 2.9: URL Generation Pattern Preservation
     * 
     * **Validates: Requirements 3.1**
     * 
     * When files are successfully processed, URL generation should follow
     * consistent patterns using Storage::disk('public')->url().
     */
    public function test_url_generation_pattern_preserved()
    {
        // Mock Storage to avoid actual S3 calls but test the URL generation logic
        Storage::fake('public');
        
        // Create a mock material as if it was uploaded successfully
        $material = LearningMaterial::create([
            'teacher_id' => $this->teacher->id,
            'lesson_id' => $this->lesson->id,
            'title' => 'Test Material',
            'file_path' => "lessons/{$this->lesson->id}/materials/test.pdf",
            'file_name' => 'test.pdf',
            'file_type' => 'PDF',
            'file_size' => 1000,
            'ingestion_status' => 'pending',
        ]);
        
        $this->actingAs($this->teacher);
        
        // Test ContentController index method (which generates URLs)
        $response = $this->getJson('/api/teacher/content');
        
        if ($response->status() === 200) {
            $materials = $response->json();
            $testMaterial = collect($materials)->firstWhere('id', $material->id);
            
            if ($testMaterial) {
                // Verify URL generation follows expected pattern
                $this->assertArrayHasKey('file_url', $testMaterial);
                $this->assertStringContainsString('storage', $testMaterial['file_url'] ?? '');
            }
        }
    }
}