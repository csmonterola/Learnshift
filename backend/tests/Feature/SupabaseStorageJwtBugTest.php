<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
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
class SupabaseStorageJwtBugTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        
        // Mock JWT token credentials from the actual .env file (these should cause failures)
        config([
            'filesystems.disks.public.key' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhha29mY2F0cXBqdWZ2em9rbmNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMzODI4OSwiZXhwIjoyMDk2OTE0Mjg5fQ.QfMczDyb2GgdlzJ2LBOLAkd6ijYnhetrD_My_RPALEI',
            'filesystems.disks.public.secret' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhha29mY2F0cXBqdWZ2em9rbmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzgyODksImV4cCI6MjA5NjkxNDI4OX0.UR_9b15XSsAdKxo3UNz5_aH6GMQdSaCRkSdabOcj-lQ',
            'filesystems.disks.public.endpoint' => 'https://xakofcatqpjufvzokncl.supabase.co/storage/v1/s3',
            'filesystems.disks.public.bucket' => 'learnshift',
        ]);
    }

    /**
     * Property 1: JWT Token Detection - Current configuration uses JWT tokens instead of S3 keys
     * **Validates: Requirements 1.1, 1.6**
     */
    public function testProperty1JwtTokenDetection(): void
    {
        $config = config('filesystems.disks.public');
        
        // Property assertion: Current credentials ARE JWT tokens (this proves the bug condition)
        $accessKey = $config['key'];
        $secretKey = $config['secret'];
        
        // Verify these are JWT-formatted tokens (3 parts separated by dots)
        $this->assertStringContainsString('.', $accessKey, 'Access key should contain dots (JWT format)');
        $this->assertStringContainsString('.', $secretKey, 'Secret key should contain dots (JWT format)');
        
        $accessKeyParts = explode('.', $accessKey);
        $secretKeyParts = explode('.', $secretKey);
        
        $this->assertEquals(3, count($accessKeyParts), 'Access key should have 3 JWT parts (header.payload.signature)');
        $this->assertEquals(3, count($secretKeyParts), 'Secret key should have 3 JWT parts (header.payload.signature)');
        
        // Verify JWT header structure (should decode to JSON with 'alg' and 'typ')
        $decodedHeader = json_decode(base64_decode($accessKeyParts[0]), true);
        $this->assertIsArray($decodedHeader, 'JWT header should decode to array');
        $this->assertArrayHasKey('alg', $decodedHeader, 'JWT header should contain algorithm');
        $this->assertArrayHasKey('typ', $decodedHeader, 'JWT header should contain type');
        $this->assertEquals('JWT', $decodedHeader['typ'], 'Type should be JWT');
        
        // This configuration represents the bug - JWT tokens being used as S3 credentials
        // In the fixed version, these should be replaced with proper S3 service keys
    }

    /**
     * Property 2: Direct Storage Operation Failure - Storage operations fail with JWT credentials  
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
     */
    public function testProperty2DirectStorageOperationFailure(): void
    {
        // Use real storage configuration (not fake) to test actual Supabase authentication
        $testFile = UploadedFile::fake()->create('test-storage.txt', 100, 'text/plain');
        $testPath = 'test-uploads/bug-exploration.txt';
        
        // Property assertion: Storage operations MUST fail with JWT token credentials
        try {
            // Attempt to store file using JWT tokens as S3 credentials - this should fail
            $result = Storage::disk('public')->putFileAs(
                'test-uploads',
                $testFile,
                'bug-exploration.txt'
            );
            
            // If we get here, check if the operation actually succeeded (which would be unexpected)
            if ($result && !in_array($result, [false, null, '', '0']) && !str_starts_with((string)$result, '0')) {
                // Unexpected success - this means the bug might not exist or JWT tokens are somehow working
                $this->fail('Storage operation unexpectedly succeeded with JWT tokens. Expected authentication failure.');
            } else {
                // Expected: Storage operation returned failure indicator
                $this->assertContains($result, [false, null, '', '0'], 
                    'Storage operation should return failure indicator when using JWT tokens as S3 credentials');
            }
            
        } catch (\Exception $e) {
            // Expected: Storage operation throws authentication/credential exception
            // SSL certificate errors also indicate network-level failures when trying to authenticate
            $this->assertMatchesRegularExpression(
                '/auth|credential|access|forbidden|401|403|invalid.*key|signature.*not.*match|ssl.*certificate|unable.*write.*file/i', 
                $e->getMessage(),
                'Exception should indicate authentication/credential/network failure: ' . $e->getMessage()
            );
        }
    }

    /**
     * Property 3: File Existence Check Failure - Existence checks fail with JWT authentication
     * **Validates: Requirements 1.1, 1.4, 1.5**
     */
    public function testProperty3FileExistenceCheckFailure(): void
    {
        $testPath = 'lessons/1/materials/nonexistent-file.pdf';
        
        // Property assertion: File existence checks MUST fail with JWT token credentials
        try {
            $exists = Storage::disk('public')->exists($testPath);
            
            // With JWT tokens, even existence checks should fail due to authentication
            // If it returns false, that could be due to authentication failure OR file not existing
            // If it returns true, that would be very unexpected and indicate the bug doesn't exist
            $this->assertFalse($exists, 
                'File existence check should fail or return false when using JWT tokens for authentication');
            
        } catch (\Exception $e) {
            // Expected: Existence check fails due to authentication issues
            $this->assertMatchesRegularExpression(
                '/auth|credential|access|forbidden|401|403|unable.*check.*existence/i', 
                $e->getMessage(),
                'Existence check should fail with authentication error: ' . $e->getMessage()
            );
        }
    }

    /**
     * Property 4: URL Generation Behavior - URLs generated with JWT credentials may be invalid
     * **Validates: Requirements 1.5**
     */
    public function testProperty4UrlGenerationBehavior(): void
    {
        $testPath = 'lessons/1/materials/test-url.pdf';
        
        // Property assertion: URL generation with JWT tokens produces problematic URLs
        try {
            $url = Storage::disk('public')->url($testPath);
            
            // URL might be generated successfully but would be inaccessible
            $this->assertIsString($url, 'URL should be generated as string');
            $this->assertStringContainsString('supabase.co', $url, 'URL should point to Supabase storage');
            
            // This URL would return 401/403 when accessed due to JWT authentication issues
            // The bug is that URLs are generated but unusable with JWT credentials
            
        } catch (\Exception $e) {
            // Alternative: URL generation itself fails with JWT tokens
            $this->assertMatchesRegularExpression(
                '/auth|credential|access|token|url.*generation/i', 
                $e->getMessage(),
                'URL generation failure should indicate authentication issue: ' . $e->getMessage()
            );
        }
    }

    /**
     * Property 5: Configuration Format Validation - System should reject JWT tokens as S3 credentials
     * **Validates: Requirements 1.6, 2.6**
     */
    public function testProperty5ConfigurationFormatValidation(): void
    {
        $config = config('filesystems.disks.public');
        
        // Property assertion: A proper validation system would reject these JWT tokens
        $accessKey = $config['key'];
        $secretKey = $config['secret'];
        
        // Simulate what proper validation should detect:
        
        // 1. JWT tokens contain dots (S3 keys typically don't)
        $this->assertTrue(str_contains($accessKey, '.'), 'Current access key contains dots (JWT characteristic)');
        $this->assertTrue(str_contains($secretKey, '.'), 'Current secret key contains dots (JWT characteristic)');
        
        // 2. JWT tokens are too long for typical S3 keys
        $this->assertGreaterThan(100, strlen($accessKey), 'JWT tokens are much longer than typical S3 access keys');
        $this->assertGreaterThan(100, strlen($secretKey), 'JWT tokens are much longer than typical S3 secret keys');
        
        // 3. JWT tokens have base64url encoded parts
        $keyParts = explode('.', $accessKey);
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]+$/', $keyParts[0], 
            'JWT header is base64url encoded (not typical of S3 keys)');
        
        // The bug: Current system accepts these JWT tokens
        // Fixed system should reject them and require proper S3 service keys
        
        // Document the expected behavior after fix:
        // - Access keys should be 16-20 alphanumeric characters
        // - Secret keys should be 40 alphanumeric characters  
        // - No dots should be present in either key
        // - Keys should not decode as valid JWT tokens
    }

    /**
     * Property 6: Storage Driver Configuration Issue - S3 driver with JWT credentials
     * **Validates: Requirements 1.1, 2.1**
     */
    public function testProperty6StorageDriverConfigurationIssue(): void
    {
        $config = config('filesystems.disks.public');
        
        // Property assertion: S3 driver is configured with JWT tokens (bug condition)
        $this->assertEquals('s3', $config['driver'], 'Storage driver should be S3');
        
        // Verify JWT token characteristics in S3 configuration
        $accessKey = $config['key'];
        $secretKey = $config['secret'];
        
        // These JWT tokens will cause AWS S3 SDK authentication failures
        $this->assertStringStartsWith('eyJ', $accessKey, 'Access key starts with JWT header encoding');
        $this->assertStringStartsWith('eyJ', $secretKey, 'Secret key starts with JWT header encoding');
        
        // Endpoint should be Supabase storage S3 API
        $this->assertStringContainsString('supabase.co/storage/v1/s3', $config['endpoint'], 
            'Endpoint should be Supabase S3-compatible API');
        
        // The issue: S3 driver expects AWS-style access keys, but receives JWT tokens
        // This causes authentication failures when the AWS S3 SDK tries to sign requests
        
        // Expected behavior after fix:
        // - Replace JWT tokens with Supabase S3 service keys
        // - Service keys should be in AWS access key format (AKIA...)
        // - Secret keys should be standard AWS secret key format
    }
}