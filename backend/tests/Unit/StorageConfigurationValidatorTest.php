<?php

namespace Tests\Unit;

use App\Services\Storage\StorageConfigurationValidator;
use PHPUnit\Framework\TestCase;

/**
 * Unit Tests for StorageConfigurationValidator - Task 3.2
 * 
 * Tests the configuration validation logic to detect JWT tokens and validate
 * S3 service key formats, endpoint URLs, and bucket configurations.
 */
class StorageConfigurationValidatorTest extends TestCase
{
    private StorageConfigurationValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = new StorageConfigurationValidator();
    }

    /**
     * Test JWT token detection - Requirement 1.6, 2.6
     */
    public function test_detects_jwt_tokens_correctly(): void
    {
        // JWT tokens (should be detected as 'jwt')
        $jwtAccessKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.signature';
        $jwtSecretKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig';
        
        $result = $this->validator->detectCredentialType($jwtAccessKey, $jwtSecretKey);
        $this->assertEquals('jwt', $result, 'Should detect JWT tokens');

        // S3 keys (should be detected as 's3_key')
        $s3AccessKey = '391dedef79fe351c7869ef9bc6f9a437';
        $s3SecretKey = '3dae03dcde140f83e7595565983895e4820a9684bddd13b0a7385d1fb143eaa6';
        
        $result = $this->validator->detectCredentialType($s3AccessKey, $s3SecretKey);
        $this->assertEquals('s3_key', $result, 'Should detect valid S3 keys');
    }

    /**
     * Test JWT token validation rejection - Requirement 1.6, 2.6
     */
    public function test_validates_and_rejects_jwt_tokens(): void
    {
        $jwtConfig = [
            'key' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.signature',
            'secret' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig',
            'endpoint' => 'https://xakofcatqpjufvzokncl.supabase.co/storage/v1/s3',
            'bucket' => 'learnshift',
        ];

        $result = $this->validator->validate($jwtConfig);
        
        $this->assertFalse($result['valid'], 'Should reject JWT token configuration');
        $this->assertEquals('jwt', $result['credential_type'], 'Should identify credential type as JWT');
        $this->assertContains(
            'Invalid credentials: JWT tokens detected. Supabase storage requires S3-compatible service keys, not JWT tokens (anon/service_role keys). Please use S3 service keys from your Supabase dashboard.',
            $result['errors']
        );
    }

    /**
     * Test S3 key format validation - Requirement 2.6
     */
    public function test_validates_s3_key_format(): void
    {
        // Test just the detection without full validation (to avoid facade issues in unit tests)
        $s3AccessKey = '391dedef79fe351c7869ef9bc6f9a437';
        $s3SecretKey = '3dae03dcde140f83e7595565983895e4820a9684bddd13b0a7385d1fb143eaa6';
        
        $result = $this->validator->detectCredentialType($s3AccessKey, $s3SecretKey);
        $this->assertEquals('s3_key', $result, 'Should identify as S3 keys');

        // Test with too short keys
        $shortAccessKey = 'short';
        $shortSecretKey = 'alsoshort';
        
        $result = $this->validator->detectCredentialType($shortAccessKey, $shortSecretKey);
        $this->assertEquals('unknown', $result, 'Should identify short keys as unknown');
    }

    /**
     * Test endpoint URL validation - Requirement 2.6
     */
    public function test_validates_supabase_endpoint_format(): void
    {
        // Just test the endpoint format validation method directly
        $validator = new \ReflectionClass($this->validator);
        $method = $validator->getMethod('validateEndpointFormat');
        $method->setAccessible(true);

        // Valid endpoint
        $validEndpoint = 'https://xakofcatqpjufvzokncl.supabase.co/storage/v1/s3';
        $result = $method->invoke($this->validator, $validEndpoint);
        $this->assertEmpty($result, 'Valid Supabase endpoint should pass validation');

        // Invalid endpoint
        $invalidEndpoint = 'http://invalid-endpoint.com';
        $result = $method->invoke($this->validator, $invalidEndpoint);
        $this->assertNotEmpty($result, 'Invalid endpoint should fail validation');
    }

    /**
     * Test bucket name validation - Requirement 2.6
     */
    public function test_validates_bucket_name(): void
    {
        // Test the bucket validation method directly
        $validator = new \ReflectionClass($this->validator);
        $method = $validator->getMethod('validateBucketName');
        $method->setAccessible(true);

        // Empty bucket
        $result = $method->invoke($this->validator, '');
        $this->assertContains('Bucket name is required.', $result);

        // Valid bucket
        $result = $method->invoke($this->validator, 'learnshift');
        $this->assertEmpty($result, 'Valid bucket name should pass validation');

        // Invalid bucket (too short)
        $result = $method->invoke($this->validator, 'ab');
        $this->assertNotEmpty($result, 'Too short bucket name should fail validation');
    }

    /**
     * Test missing configuration keys - Requirement 2.6
     */
    public function test_validates_required_configuration_keys(): void
    {
        $incompleteConfig = [
            'key' => '391dedef79fe351c7869ef9bc6f9a437',
            // Missing secret, endpoint, bucket
        ];

        $result = $this->validator->validate($incompleteConfig);
        
        $this->assertFalse($result['valid'], 'Should reject incomplete configuration');
        $this->assertEquals('unknown', $result['credential_type']);
        
        $expectedErrors = ['Missing required configuration: secret', 'Missing required configuration: endpoint', 'Missing required configuration: bucket'];
        foreach ($expectedErrors as $expectedError) {
            $this->assertContains($expectedError, $result['errors']);
        }
    }
}