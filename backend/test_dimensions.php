<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\Rag\ImageExtractor;

$extractor = $app->make(ImageExtractor::class);
$fixturePath = __DIR__ . '/tests/Fixtures/test_2page.pdf';

$images = $extractor->extract($fixturePath, 'PDF');
echo "Total images: " . count($images) . "\n\n";

foreach ($images as $i => $img) {
    echo "Image $i:\n";
    echo "  Extension: {$img['extension']}\n";
    echo "  Page: {$img['page_number']}\n";
    echo "  Binary size: " . strlen($img['binary']) . " bytes\n";
    
    // Check what getImageDimensions would return
    if ($img['extension'] === 'bin') {
        echo "  Dimensions: null (extension is 'bin')\n";
    } elseif (in_array($img['extension'], ['jpg', 'png', 'gif', 'bmp', 'webp', 'jp2'], true)) {
        $info = @getimagesizefromstring($img['binary']);
        if ($info !== false) {
            echo "  Dimensions: {$info[0]}x{$info[1]}\n";
            $passesMin = ($info[0] >= 50 && $info[1] >= 50);
            echo "  Passes min dimension check (50px): " . ($passesMin ? "YES" : "NO") . "\n";
        } else {
            echo "  Dimensions: getimagesizefromstring FAILED\n";
        }
    }
    echo "\n";
}