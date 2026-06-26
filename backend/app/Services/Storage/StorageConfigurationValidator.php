<?php

namespace App\Services\Storage;

use InvalidArgumentException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Validates Supabase storage configuration to ensure proper S3 credentials
 * are used instead of JWT tokens.
 */
class StorageConfigurationValidator
{
    /**
     * Validate storage configuration and detect JWT tokens.
     *
     * @param array $config Storage configuration array
     * @return array Validation result with success status and error details
     */
    public function validate(array $config): array
    {
        $errors = [];

        // Validate required configuration keys exist
        $requiredKeys = ['key', 'secret', 'endpoint', 'bucket'];
        foreach ($requiredKeys as $key) {
            if (empty($config[$key])) {
                $errors[] = "Missing required configuration: {$key}";
            }
        }

        // If required keys are missing, return early
        if (!empty($errors)) {
            return [
                'valid' => false,
                'errors' => $errors,
                'credential_type' => 'unknown'
            ];
        }

        $accessKey = $config['key'];
        $secretKey = $config['secret'];
        $endpoint = $config['endpoint'];
        $bucket = $config['bucket'];

        // Step 1: Detect JWT tokens (primary validation)
        $credentialType = $this->detectCredentialType($accessKey, $secretKey);
        if ($credentialType === 'jwt') {
            $errors[] = 'Invalid credentials: JWT tokens detected. Supabase storage requires S3-compatible service keys, not JWT tokens (anon/service_role keys). Please use S3 service keys from your Supabase dashboard.';
        }

        // Step 2: Validate S3 key format and length requirements
        if ($credentialType !== 'jwt') {
            $keyValidation = $this->validateS3KeyFormat($accessKey, $secretKey);
            $errors = array_merge($errors, $keyValidation);
        }

        // Step 3: Validate Supabase endpoint URL format
        $endpointValidation = $this->validateEndpointFormat($endpoint);
        $errors = array_merge($errors, $endpointValidation);

        // Step 4: Validate bucket configuration
        $bucketValidation = $this->validateBucketName($bucket);
        $errors = array_merge($errors, $bucketValidation);

        // Step 5: Test connection if basic validation passes
        if (empty($errors)) {
            $connectionErrors = $this->testStorageConnection($config);
            $errors = array_merge($errors, $connectionErrors);
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'credential_type' => $credentialType
        ];
    }

    /**
     * Detect if credentials are JWT tokens or S3 keys.
     *
     * @param string $accessKey
     * @param string $secretKey
     * @return string 'jwt', 's3_key', or 'unknown'
     */
    public function detectCredentialType(string $accessKey, string $secretKey): string
    {
        // JWT tokens contain dots (.) as separators between header.payload.signature
        $accessKeyHasDots = str_contains($accessKey, '.');
        $secretKeyHasDots = str_contains($secretKey, '.');

        if ($accessKeyHasDots || $secretKeyHasDots) {
            return 'jwt';
        }

        // S3 keys are typically alphanumeric strings without dots
        // Access keys are usually 20 characters, secret keys 40+ characters
        if (strlen($accessKey) >= 16 && strlen($secretKey) >= 32 &&
            preg_match('/^[A-Za-z0-9]+$/', $accessKey) &&
            preg_match('/^[A-Za-z0-9+\/=]+$/', $secretKey)) {
            return 's3_key';
        }

        return 'unknown';
    }

    /**
     * Validate S3 service key format and length requirements.
     *
     * @param string $accessKey
     * @param string $secretKey
     * @return array Array of validation error messages
     */
    private function validateS3KeyFormat(string $accessKey, string $secretKey): array
    {
        $errors = [];

        // Validate access key length
        if (strlen($accessKey) < 16) {
            $errors[] = 'Access key too short: S3 access keys should be at least 16 characters long.';
        }

        // Validate secret key length
        if (strlen($secretKey) < 32) {
            $errors[] = 'Secret key too short: S3 secret keys should be at least 32 characters long.';
        }

        // Validate access key format (alphanumeric)
        if (!preg_match('/^[A-Za-z0-9]+$/', $accessKey)) {
            $errors[] = 'Invalid access key format: S3 access keys should contain only alphanumeric characters.';
        }

        // Validate secret key format (base64-like)
        if (!preg_match('/^[A-Za-z0-9+\/=]+$/', $secretKey)) {
            $errors[] = 'Invalid secret key format: S3 secret keys should contain only base64-compatible characters.';
        }

        return $errors;
    }

    /**
     * Validate Supabase storage endpoint URL format.
     *
     * @param string $endpoint
     * @return array Array of validation error messages
     */
    private function validateEndpointFormat(string $endpoint): array
    {
        $errors = [];

        // Basic URL validation
        if (!filter_var($endpoint, FILTER_VALIDATE_URL)) {
            $errors[] = 'Invalid endpoint URL format: Must be a valid HTTPS URL.';
            return $errors;
        }

        // Must be HTTPS
        if (!str_starts_with($endpoint, 'https://')) {
            $errors[] = 'Endpoint must use HTTPS protocol for security.';
        }

        // Must match Supabase storage pattern
        $expectedPattern = '/^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/s3$/';
        if (!preg_match($expectedPattern, $endpoint)) {
            $errors[] = 'Invalid Supabase storage endpoint: Expected format is "https://[project-ref].supabase.co/storage/v1/s3".';
        }

        return $errors;
    }

    /**
     * Validate bucket name.
     *
     * @param string $bucket
     * @return array Array of validation error messages
     */
    private function validateBucketName(string $bucket): array
    {
        $errors = [];

        if (empty(trim($bucket))) {
            $errors[] = 'Bucket name is required.';
            return $errors;
        }

        // S3 bucket naming rules (simplified)
        if (!preg_match('/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/', $bucket) && strlen($bucket) > 1) {
            $errors[] = 'Invalid bucket name format: Must start and end with alphanumeric characters, may contain hyphens.';
        }

        if (strlen($bucket) < 3 || strlen($bucket) > 63) {
            $errors[] = 'Invalid bucket name length: Must be between 3 and 63 characters.';
        }

        return $errors;
    }

    /**
     * Test storage connection with provided configuration.
     *
     * @param array $config
     * @return array Array of connection error messages
     */
    private function testStorageConnection(array $config): array
    {
        $errors = [];

        try {
            // Create a temporary storage configuration for testing
            $testConfig = [
                'driver' => 's3',
                'key' => $config['key'],
                'secret' => $config['secret'],
                'region' => $config['region'] ?? 'us-east-1',
                'bucket' => $config['bucket'],
                'endpoint' => $config['endpoint'],
                'use_path_style_endpoint' => $config['use_path_style_endpoint'] ?? true,
                'http' => [
                    'verify' => false,
                ],
            ];

            // Test connection by attempting to list bucket contents
            // This is a minimal test that doesn't create any files
            $disk = app('filesystem')->createS3Driver($testConfig);
            
            // Attempt a simple operation that requires valid credentials
            try {
                $disk->files('');
            } catch (\Exception $e) {
                $errorMessage = $e->getMessage();
                
                // Provide specific error messages based on common failures
                if (str_contains($errorMessage, 'InvalidAccessKeyId')) {
                    $errors[] = 'Connection test failed: Invalid access key ID. Please verify your S3 service keys.';
                } elseif (str_contains($errorMessage, 'SignatureDoesNotMatch')) {
                    $errors[] = 'Connection test failed: Invalid secret key. Please verify your S3 service keys.';
                } elseif (str_contains($errorMessage, 'NoSuchBucket')) {
                    $errors[] = 'Connection test failed: Bucket does not exist or is not accessible.';
                } elseif (str_contains($errorMessage, 'AccessDenied')) {
                    $errors[] = 'Connection test failed: Access denied. Please check bucket permissions and RLS policies.';
                } else {
                    $errors[] = 'Connection test failed: ' . $errorMessage;
                }

                Log::warning('Storage connection test failed', [
                    'endpoint' => $config['endpoint'],
                    'bucket' => $config['bucket'],
                    'error' => $errorMessage
                ]);
            }

        } catch (\Exception $e) {
            $errors[] = 'Connection test exception: ' . $e->getMessage();
            Log::error('Storage connection test exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }

        return $errors;
    }

    /**
     * Get configuration from Laravel config files.
     *
     * @param string $disk Disk name (default: 'public')
     * @return array Storage configuration
     */
    public function getStorageConfig(string $disk = 'public'): array
    {
        $config = config("filesystems.disks.{$disk}");

        if (!$config) {
            throw new InvalidArgumentException("Storage disk '{$disk}' not found in configuration.");
        }

        return [
            'key' => $config['key'] ?? '',
            'secret' => $config['secret'] ?? '',
            'region' => $config['region'] ?? '',
            'bucket' => $config['bucket'] ?? '',
            'endpoint' => $config['endpoint'] ?? '',
            'use_path_style_endpoint' => $config['use_path_style_endpoint'] ?? false,
        ];
    }

    /**
     * Validate current application storage configuration.
     *
     * @param string $disk Disk name to validate
     * @return array Validation result
     */
    public function validateCurrentConfig(string $disk = 'public'): array
    {
        try {
            $config = $this->getStorageConfig($disk);
            return $this->validate($config);
        } catch (\Exception $e) {
            return [
                'valid' => false,
                'errors' => ['Configuration error: ' . $e->getMessage()],
                'credential_type' => 'unknown'
            ];
        }
    }
}