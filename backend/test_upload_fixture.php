<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\LearningMaterial;
use App\Http\Controllers\Api\Teacher\ContentController;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

$lessonId = (int) DB::table('lessons')->where('title', 'TEST_Capability Lesson')->value('id');
$teacherId = DB::table('users')->where('email', 'test_teacher@learnshift.test')->value('id');
$teacher = User::find($teacherId);

echo "Teacher ID: {$teacher->id}, Lesson ID: {$lessonId}\n";

// Use fixture PDF with images
$fixturePath = __DIR__ . '/tests/Fixtures/test_2page.pdf';
echo "Fixture: $fixturePath (" . filesize($fixturePath) . " bytes)\n";

$tmpPath = __DIR__ . '/storage/app/fixture_temp.pdf';
copy($fixturePath, $tmpPath);

$uploadedFile = new UploadedFile(
    $tmpPath,
    'test_2page.pdf',
    'application/pdf',
    null,
    true
);

$request = new Request([
    'title' => 'TEST_Fixture 2-Page PDF',
    'lesson_id' => $lessonId,
]);
$request->files->set('file', $uploadedFile);
$request->setUserResolver(function () use ($teacher) {
    return $teacher;
});

$controller = $app->make(ContentController::class);
try {
    $response = $controller->store($request);
    $content = json_decode($response->getContent(), true);
    echo "Response status: " . $response->getStatusCode() . "\n";
    $materialId = $content['material']['id'] ?? 'unknown';
    echo "Material ID created: $materialId\n\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}

@unlink($tmpPath);