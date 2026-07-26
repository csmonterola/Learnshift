<?php

namespace Tests\Feature;

use App\Jobs\IngestLearningMaterialJob;
use App\Models\LearningMaterial;
use App\Models\Lesson;
use App\Models\MaterialImage;
use App\Models\User;
use App\Services\Rag\ImageExtractor;
use App\Services\Rag\MaterialIngestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MaterialImageExtractionTest extends TestCase
{
    use RefreshDatabase;

    private string $fixturesDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fixturesDir = __DIR__ . '/../Fixtures';

        config(['services.image_extraction.min_image_dimension' => 1]);
    }

    private function createMaterial(string $fixtureName, string $fileType): array
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $lesson = Lesson::factory()->create();

        $material = LearningMaterial::factory()->create([
            'teacher_id' => $teacher->id,
            'lesson_id' => $lesson->id,
            'file_path' => "test_{$fixtureName}",
            'file_name' => "test." . strtolower($fileType),
            'file_type' => $fileType,
            'ingestion_status' => 'pending',
            'ai_sync' => false,
        ]);

        Storage::fake('public');
        Storage::disk('public')->put(
            "test_{$fixtureName}",
            file_get_contents("{$this->fixturesDir}/{$fixtureName}")
        );

        return [$teacher, $material, $lesson];
    }

    /** @test */
    public function job_creates_material_image_rows_and_reaches_indexed()
    {
        Http::fake([
            'api.mistral.ai/*' => Http::response([
                'data' => [
                    ['object' => 'embedding', 'index' => 0, 'embedding' => array_fill(0, 1024, 0.01)],
                ],
            ]),
        ]);

        [$teacher, $material] = $this->createMaterial('test_image.docx', 'DOCX');

        $job = new IngestLearningMaterialJob($material->id);
        $job->handle(app(MaterialIngestionService::class));

        $material->refresh();

        $this->assertSame('indexed', $material->ingestion_status);

        $images = MaterialImage::where('learning_material_id', $material->id)->get();
        $this->assertCount(1, $images);

        $image = $images->first();
        $this->assertNull($image->page_number);
        $this->assertSame('extracted', $image->extraction_status);
        $this->assertNotNull($image->width);
        $this->assertNotNull($image->height);
        $this->assertNotNull($image->file_size);
        $this->assertStringContainsString("materials/{$material->id}/images/", $image->s3_path);
        $this->assertStringEndsWith('.jpg', $image->s3_path);

        Storage::disk('public')->assertExists($image->s3_path);
    }

    /** @test */
    public function job_reaches_indexed_even_when_image_extraction_fails()
    {
        Http::fake([
            'api.mistral.ai/*' => Http::response([
                'data' => [
                    ['object' => 'embedding', 'index' => 0, 'embedding' => array_fill(0, 1024, 0.01)],
                ],
            ]),
        ]);

        [$teacher, $material] = $this->createMaterial('test_image.docx', 'DOCX');

        $this->mock(ImageExtractor::class, function ($mock) {
            $mock->shouldReceive('extract')
                ->andThrow(new \RuntimeException('Simulated failure'));
        });

        $job = new IngestLearningMaterialJob($material->id);
        $job->handle(app(MaterialIngestionService::class));

        $material->refresh();

        $this->assertSame('indexed', $material->ingestion_status);

        $imageCount = MaterialImage::where('learning_material_id', $material->id)->count();
        $this->assertSame(0, $imageCount);
    }

    /** @test */
    public function image_extraction_respects_cap()
    {
        config(['services.image_extraction.max_images_per_material' => 1]);
        config(['services.image_extraction.min_image_dimension' => 1]);

        Http::fake([
            'api.mistral.ai/*' => Http::response([
                'data' => [
                    ['object' => 'embedding', 'index' => 0, 'embedding' => array_fill(0, 1024, 0.01)],
                ],
            ]),
        ]);

        [$teacher, $material] = $this->createMaterial('test_2page.pdf', 'PDF');

        $job = new IngestLearningMaterialJob($material->id);
        $job->handle(app(MaterialIngestionService::class));

        $material->refresh();
        $this->assertSame('indexed', $material->ingestion_status);

        $imageCount = MaterialImage::where('learning_material_id', $material->id)->count();
        $this->assertSame(1, $imageCount, 'Cap of 1 should limit images to 1');
    }
}
