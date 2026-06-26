<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\LearningMaterial;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;

/**
 * Test enhanced ContentController file upload error handling.
 * 
 * **Validates: Requirements 1.2, 2.2, 3.1, 3.2, 3.6**
 */
class ContentControllerErrorHandlingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test URL accessibility verification in LearningMaterial model.
     */
    public function test_file_url_accessibility_check(): void
    {
        // Mock HTTP response for inaccessible file
        Http::fake(['*' => Http::response('', 404)]);
        
        // Mock storage for URL generation
        Storage::fake('public');
        Storage::disk('public')->put('lessons/1/materials/test.pdf', 'test content');

        $material = new LearningMaterial([
            'file_path' => 'lessons/1/materials/test.pdf',
            'file_type' => 'PDF'
        ]);

        // Test URL generation
        $url = $material->getFileUrlAttribute();
        $this->assertNotNull($url);

        // Test accessibility check (should return false for 404 response)
        $accessible = $material->isFileAccessible();
        $this->assertFalse($accessible);
    }

    /**
     * Test storage metadata retrieval.
     */
    public function test_storage_metadata_collection(): void
    {
        Storage::fake('public');
        
        $material = new LearningMaterial([
            'file_path' => 'lessons/1/materials/test.pdf',
            'file_type' => 'PDF'
        ]);

        // Test when file doesn't exist
        $metadata = $material->getStorageMetadata();
        $this->assertFalse($metadata['exists']);

        // Test when file exists
        Storage::disk('public')->put('lessons/1/materials/test.pdf', 'test content');
        $metadata = $material->getStorageMetadata();
        $this->assertTrue($metadata['exists']);
        $this->assertIsInt($metadata['size']);
        $this->assertNotNull($metadata['url']);
    }

    /**
     * Test file URL generation for different file types.
     */
    public function test_file_url_generation_types(): void
    {
        Storage::fake('public');
        
        // Test regular file
        $material = new LearningMaterial([
            'file_path' => 'lessons/1/materials/document.pdf',
            'file_type' => 'PDF'
        ]);
        
        $url = $material->getFileUrlAttribute();
        $this->assertIsString($url);

        // Test LINK type (external URL)
        $externalMaterial = new LearningMaterial([
            'file_path' => 'https://example.com/external-resource',
            'file_type' => 'LINK'
        ]);
        
        $externalUrl = $externalMaterial->getFileUrlAttribute();
        $this->assertEquals('https://example.com/external-resource', $externalUrl);

        // Test null file path
        $nullMaterial = new LearningMaterial([
            'file_path' => null,
            'file_type' => 'PDF'
        ]);
        
        $nullUrl = $nullMaterial->getFileUrlAttribute();
        $this->assertNull($nullUrl);
    }
}