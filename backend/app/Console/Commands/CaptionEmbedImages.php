<?php

namespace App\Console\Commands;

use App\Jobs\CaptionAndEmbedImageJob;
use App\Models\MaterialImage;
use Illuminate\Console\Command;

class CaptionEmbedImages extends Command
{
    protected $signature = 'images:caption-embed
                            {--dry-run : Only report what would be dispatched without dispatching}
                            {--material= : Only process images belonging to a specific learning material ID}';

    protected $description = 'Generate captions and embeddings for extracted images that lack them';

    public function handle(): int
    {
        $query = MaterialImage::whereNull('caption')
            ->where('extraction_status', 'extracted');

        if ($materialId = $this->option('material')) {
            $query->where('learning_material_id', (int) $materialId);
        }

        $images = $query->get();

        if ($images->isEmpty()) {
            $this->info('No images found that need captioning.');
            return self::SUCCESS;
        }

        $this->info("Found {$images->count()} image(s) without captions.");

        $grouped = $images->groupBy('learning_material_id');
        foreach ($grouped as $materialId => $group) {
            $this->line("  Material #{$materialId}: {$group->count()} image(s)");
        }

        if ($this->option('dry-run')) {
            $this->info('Dry-run mode — no jobs dispatched.');
            return self::SUCCESS;
        }

        foreach ($images as $image) {
            $this->line("  Dispatching caption job for image #{$image->id} (material #{$image->learning_material_id})");
            CaptionAndEmbedImageJob::dispatch($image->id);
        }

        $this->info('Done. Run "php artisan queue:work" to process the jobs.');

        return self::SUCCESS;
    }
}
