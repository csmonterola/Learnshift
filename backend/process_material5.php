<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$mat = DB::table('learning_materials')->where('id', 5)->first();
echo "Material #5:\n";
echo "  file_path: " . $mat->file_path . "\n";
echo "  File exists in storage: " . (\Storage::disk('public')->exists($mat->file_path) ? 'YES' : 'NO') . "\n";
echo "  ingestion_status: " . $mat->ingestion_status . "\n";

// Reset and dispatch
if ($mat->ingestion_status === 'pending' || $mat->ingestion_status === 'failed') {
    DB::table('learning_materials')->where('id', 5)->update(['ingestion_status' => 'pending']);
    \App\Jobs\IngestLearningMaterialJob::dispatch(5);
}
