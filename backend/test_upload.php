<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\LearningMaterial;
use Illuminate\Support\Facades\DB;

foreach ([4, 5] as $id) {
    $material = LearningMaterial::find($id);
    if (!$material) {
        echo "=== MATERIAL $id ===\nNot found\n\n";
        continue;
    }

    echo "=== MATERIAL $id ===\n";
    echo "Title: {$material->title}\n";
    echo "Ingestion Status: {$material->ingestion_status}\n";
    echo "AI Sync: {$material->ai_sync}\n";
    echo "File: {$material->file_name}\n";
    echo "File Size: {$material->file_size} bytes\n";
    echo "File Type: {$material->file_type}\n\n";

    $images = DB::table('material_images')
        ->where('learning_material_id', $id)
        ->get();

    echo "Material Images: {$images->count()}\n";
    foreach ($images as $img) {
        echo "  - Image ID: {$img->id}, Page: {$img->page_number}\n";
        echo "    Original: {$img->original_name}\n";
        echo "    Dimensions: {$img->width}x{$img->height}\n";
        echo "    Size: {$img->file_size} bytes\n";
        echo "    Mime: {$img->mime_type}\n";
        echo "    S3 Path: {$img->file_path}\n";
        echo "    Created: {$img->created_at}\n\n";
    }
    echo "\n";
}