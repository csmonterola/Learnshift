<?php

namespace App\Console\Commands;

use App\Services\Storage\StorageConfigurationValidator;
use Illuminate\Console\Command;

class ValidateStorageConfig extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'storage:validate 
                            {--disk=public : The storage disk to validate}
                            {--detailed : Show detailed validation information}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Validate Supabase storage configuration and detect JWT token usage';

    /**
     * Execute the console command.
     */
    public function handle(StorageConfigurationValidator $validator): int
    {
        $disk = $this->option('disk');
        $detailed = $this->option('detailed');

        $this->info("Validating storage configuration for disk: {$disk}");
        $this->newLine();

        try {
            $result = $validator->validateCurrentConfig($disk);

            if ($result['valid']) {
                $this->info('✅ Storage configuration is valid!');
                $this->info("✅ Credential type: {$result['credential_type']}");
                
                if ($detailed) {
                    $config = $validator->getStorageConfig($disk);
                    $this->newLine();
                    $this->info('Configuration details:');
                    $this->table(['Setting', 'Value'], [
                        ['Access Key Length', strlen($config['key']) . ' characters'],
                        ['Secret Key Length', strlen($config['secret']) . ' characters'],
                        ['Endpoint', $config['endpoint']],
                        ['Bucket', $config['bucket']],
                        ['Region', $config['region']],
                    ]);
                }

                return Command::SUCCESS;
            } else {
                $this->error('❌ Storage configuration validation failed:');
                $this->newLine();

                foreach ($result['errors'] as $error) {
                    $this->error("  • {$error}");
                }

                $this->newLine();
                $this->warn("Credential type detected: {$result['credential_type']}");

                if ($result['credential_type'] === 'jwt') {
                    $this->newLine();
                    $this->warn('🔧 Fix Instructions:');
                    $this->warn('1. Go to your Supabase dashboard');
                    $this->warn('2. Navigate to Settings > API');
                    $this->warn('3. Scroll to "S3 Connection" section');
                    $this->warn('4. Generate or copy your S3 Access Key and Secret Key');
                    $this->warn('5. Update your .env file:');
                    $this->warn('   AWS_ACCESS_KEY_ID=your_s3_access_key');
                    $this->warn('   AWS_SECRET_ACCESS_KEY=your_s3_secret_key');
                    $this->warn('6. Do NOT use anon or service_role JWT tokens for storage');
                }

                return Command::FAILURE;
            }

        } catch (\Exception $e) {
            $this->error("❌ Validation failed with exception: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }
}