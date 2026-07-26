<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\Rag\ImageExtractor;

$extractor = $app->make(ImageExtractor::class);

// Test the fixture PDF
$fixturePath = __DIR__ . '/tests/Fixtures/test_2page.pdf';
echo "=== Fixture: test_2page.pdf (" . filesize($fixturePath) . " bytes) ===\n";
try {
    $result = $extractor->extract($fixturePath, 'PDF');
    echo "Images found: " . count($result) . "\n";
    foreach ($result as $i => $img) {
        echo "  Image $i: ext={$img['extension']}, page={$img['page_number']}, size=" . strlen($img['binary']) . " bytes\n";
    }
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

echo "\n";

// Also test the user's PDF
$userPdf = 'C:\Users\walbe\Downloads\18B_Letter-of-Proposal_Limitless.pdf';
if (file_exists($userPdf)) {
    echo "=== User PDF (" . filesize($userPdf) . " bytes) ===\n";
    try {
        $result = $extractor->extract($userPdf, 'PDF');
        echo "Images found: " . count($result) . "\n";
        foreach ($result as $i => $img) {
            echo "  Image $i: ext={$img['extension']}, page={$img['page_number']}, size=" . strlen($img['binary']) . " bytes\n";
        }
    } catch (\Throwable $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
}