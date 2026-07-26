<?php

namespace Tests\Feature;

use App\Jobs\IngestLearningMaterialJob;
use App\Models\LearningMaterial;
use App\Models\Lesson;
use App\Models\MaterialImage;
use App\Models\SchoolClass;
use App\Models\Topic;
use App\Models\User;
use App\Services\Rag\ImageExtractor;
use App\Services\Rag\MaterialIngestionService;
use App\Services\Rag\TextExtractor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ContentControllerRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.image_extraction.min_image_dimension' => 1]);
    }

    private function fakeImageExtractor(): void
    {
        $testImage = base64_decode('R0lGODdhZABkAIAAAPz8/AIAACwAAAAAZABkAAACc4SPqcvtD6OctNqLs968+w+G4kiW5omm6sq27gvH8kzX9o3n+s73/g8MCofEovGITCqXzKbzCY1Kp9Sq9YrNarfcrvcLDovH5LL5jE6r1+y2+w2Py+f0uv2Oz+v3/L7/DxgoOEhYaHiImKi4yNjo+AhpWAAAOw==');

        $this->mock(ImageExtractor::class, function ($mock) use ($testImage) {
            $mock->shouldReceive('extract')
                ->andReturn([
                    [
                        'binary'      => $testImage,
                        'extension'   => 'gif',
                        'page_number' => 1,
                    ],
                ]);
        });
    }

    private function fakeTextExtractor(int $pageCount = 1, int $wordsPerPage = 100): void
    {
        $pages = [];
        for ($i = 1; $i <= $pageCount; $i++) {
            $pages[] = [
                'page_number' => $i,
                'text'        => "Page {$i} content. " . str_repeat('word ', $wordsPerPage),
            ];
        }

        $this->mock(TextExtractor::class, function ($mock) use ($pages) {
            $mock->shouldReceive('extract')
                ->zeroOrMoreTimes()
                ->andReturn(implode("\n", array_column($pages, 'text')));

            $mock->shouldReceive('extractWithPages')
                ->zeroOrMoreTimes()
                ->andReturn($pages);
        });
    }

    private function fakeEmbeddings(): void
    {
        Http::fake(function ($request) {
            // Return a valid chat-completion response for vision/chat endpoints
            if (str_contains($request->url(), 'chat/completions')) {
                return Http::response([
                    'choices' => [['message' => ['content' => 'A test caption.']]],
                ]);
            }

            $body = json_decode($request->body(), true);
            $inputCount = count($body['input'] ?? []);
            $data = [];
            for ($i = 0; $i < $inputCount; $i++) {
                $data[] = ['object' => 'embedding', 'index' => $i, 'embedding' => [0.01, 0.02]];
            }
            return Http::response(['data' => $data]);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //  Issue 1 — ContentController::store() does not set ai_sync=true
    // ═══════════════════════════════════════════════════════════════

    /** @test */
    public function store_sets_ai_sync_false_for_non_indexable_types()
    {
        Event::fake();
        Storage::fake('public');
        Http::fake(['*' => Http::response('', 200)]);

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $file = UploadedFile::fake()->create('notes.txt', 512, 'text/plain');

        $response = $this->actingAs($teacher)->postJson('/api/teacher/content', [
            'title'     => 'Text Notes',
            'lesson_id' => $lesson->id,
            'file'      => $file,
        ]);

        $response->assertStatus(201);

        $material = LearningMaterial::where('title', 'Text Notes')->first();
        $this->assertNotNull($material);
        $this->assertFalse($material->ai_sync);
    }

    /** @test */
    public function store_sets_ai_sync_true_for_pdf()
    {
        Event::fake();
        Storage::fake('public');
        Http::fake(['*' => Http::response('', 200)]);

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $file = UploadedFile::fake()->create('document.pdf', 1024, 'application/pdf');

        $response = $this->actingAs($teacher)->postJson('/api/teacher/content', [
            'title'     => 'PDF Material',
            'lesson_id' => $lesson->id,
            'file'      => $file,
        ]);

        $response->assertStatus(201);

        $material = LearningMaterial::where('title', 'PDF Material')->first();
        $this->assertNotNull($material);
        $this->assertTrue($material->ai_sync);
    }

    /** @test */
    public function store_sets_ai_sync_true_for_docx_as_well()
    {
        Event::fake();
        Storage::fake('public');
        Http::fake(['*' => Http::response('', 200)]);

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $file = UploadedFile::fake()->create('doc.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        $response = $this->actingAs($teacher)->postJson('/api/teacher/content', [
            'title'     => 'DOCX Material',
            'lesson_id' => $lesson->id,
            'file'      => $file,
        ]);

        $response->assertStatus(201);

        $material = LearningMaterial::where('title', 'DOCX Material')->first();
        $this->assertNotNull($material);
        $this->assertTrue($material->ai_sync);
    }

    /** @test */
    public function store_sets_ai_sync_true_for_pptx_as_well()
    {
        Event::fake();
        Storage::fake('public');
        Http::fake(['*' => Http::response('', 200)]);

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $file = UploadedFile::fake()->create('slide.pptx', 1024, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');

        $response = $this->actingAs($teacher)->postJson('/api/teacher/content', [
            'title'     => 'PPTX Material',
            'lesson_id' => $lesson->id,
            'file'      => $file,
        ]);

        $response->assertStatus(201);

        $material = LearningMaterial::where('title', 'PPTX Material')->first();
        $this->assertNotNull($material);
        $this->assertTrue($material->ai_sync);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Issue 1b — observer dispatches job when ai_sync=true
    // ═══════════════════════════════════════════════════════════════

    /** @test */
    public function observer_dispatches_job_when_ai_sync_is_true()
    {
        Bus::fake();

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $material = LearningMaterial::create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'title'            => 'Test Material',
            'file_path'        => 'test/test.pdf',
            'file_name'        => 'test.pdf',
            'file_type'        => 'PDF',
            'file_size'        => 1024,
            'ai_sync'          => true,
            'ingestion_status' => 'pending',
        ]);

        Bus::assertDispatched(IngestLearningMaterialJob::class);
        Bus::assertDispatchedTimes(IngestLearningMaterialJob::class, 1);
    }

    /** @test */
    public function observer_does_not_dispatch_job_when_ai_sync_is_false()
    {
        Bus::fake();

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $material = LearningMaterial::create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'title'            => 'Test Material',
            'file_path'        => 'test/test.txt',
            'file_name'        => 'test.txt',
            'file_type'        => 'TXT',
            'file_size'        => 512,
            'ai_sync'          => false,
            'ingestion_status' => 'none',
        ]);

        Bus::assertNotDispatched(IngestLearningMaterialJob::class);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Issue 2 — reprocess() does not extract / persist images
    // ═══════════════════════════════════════════════════════════════

    /** @test */
    public function reprocess_creates_material_images()
    {
        Event::fake();
        $this->fakeTextExtractor();
        $this->fakeImageExtractor();
        $this->fakeEmbeddings();
        Storage::fake('public');

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $material = LearningMaterial::factory()->create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'file_type'        => 'PDF',
            'ingestion_status' => 'pending',
            'ai_sync'          => false,
            'file_path'        => 'fake/test.pdf',
        ]);

        Storage::disk('public')->put($material->file_path, 'dummy');

        $this->assertSame(0, MaterialImage::where('learning_material_id', $material->id)->count());

        $service = $this->app->make(MaterialIngestionService::class);
        $result = $service->ingest($material);

        $this->assertSame(1, $result['chunks']);
        $this->assertSame(1, $result['images']);

        $this->assertSame(1, MaterialImage::where('learning_material_id', $material->id)->count(),
            'Reprocess should create exactly 1 material_image row');

        $image = MaterialImage::where('learning_material_id', $material->id)->first();
        $this->assertSame(1, $image->page_number);
        $this->assertSame('extracted', $image->extraction_status);
        $this->assertStringEndsWith('.gif', $image->s3_path);
        Storage::disk('public')->assertExists($image->s3_path);
    }

    /** @test */
    public function reprocess_deletes_old_material_images_before_re_extraction()
    {
        Event::fake();
        $this->fakeTextExtractor();
        $this->fakeImageExtractor();
        $this->fakeEmbeddings();
        Storage::fake('public');

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $material = LearningMaterial::factory()->create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'file_type'        => 'PDF',
            'ingestion_status' => 'pending',
            'ai_sync'          => false,
            'file_path'        => 'fake/test.pdf',
        ]);

        Storage::disk('public')->put($material->file_path, 'dummy');

        MaterialImage::create([
            'learning_material_id' => $material->id,
            's3_path'              => 'old/stale_image.gif',
            'width'                => 100,
            'height'               => 100,
            'file_size'            => 500,
            'extraction_status'    => 'extracted',
        ]);

        $this->assertSame(1, MaterialImage::where('learning_material_id', $material->id)->count(),
            'Should have 1 stale image before reprocess');

        $service = $this->app->make(MaterialIngestionService::class);
        $result = $service->ingest($material);

        $this->assertSame(1, $result['chunks']);
        $this->assertSame(1, $result['images']);

        $images = MaterialImage::where('learning_material_id', $material->id)->get();
        $this->assertCount(1, $images, 'Should have exactly 1 image after reprocess (old deleted, new inserted)');
        $this->assertStringNotContainsString('old/', $images->first()->s3_path,
            'The stale image path should be gone; a fresh path should exist');
        Storage::disk('public')->assertExists($images->first()->s3_path);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Step 1 — Page/slide-referencing in lesson_embeddings
    // ═══════════════════════════════════════════════════════════════

    /** @test */
    public function full_ingestion_stores_page_number_for_pdf()
    {
        Event::fake();
        $this->fakeTextExtractor();
        $this->fakeImageExtractor();
        $this->fakeEmbeddings();
        Storage::fake('public');

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $material = LearningMaterial::factory()->create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'file_type'        => 'PDF',
            'ingestion_status' => 'pending',
            'ai_sync'          => false,
            'file_path'        => 'fake/test.pdf',
        ]);

        Storage::disk('public')->put($material->file_path, 'dummy');

        $service = $this->app->make(MaterialIngestionService::class);
        $service->ingest($material);

        $rows = DB::table('lesson_embeddings')
            ->where('material_id', $material->id)
            ->get();

        $this->assertGreaterThan(0, $rows->count());
        foreach ($rows as $row) {
            $this->assertNotNull($row->page_number, 'PDF chunks must have non-null page_number');
        }
    }

    /** @test */
    public function full_ingestion_stores_page_number_for_pptx()
    {
        Event::fake();
        $this->fakeTextExtractor();
        $this->fakeImageExtractor();
        $this->fakeEmbeddings();
        Storage::fake('public');

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $material = LearningMaterial::factory()->create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'file_type'        => 'PPTX',
            'ingestion_status' => 'pending',
            'ai_sync'          => false,
            'file_path'        => 'fake/test.pptx',
        ]);

        Storage::disk('public')->put($material->file_path, 'dummy');

        $service = $this->app->make(MaterialIngestionService::class);
        $service->ingest($material);

        $rows = DB::table('lesson_embeddings')
            ->where('material_id', $material->id)
            ->get();

        $this->assertGreaterThan(0, $rows->count());
        foreach ($rows as $row) {
            $this->assertNotNull($row->page_number, 'PPTX chunks must have non-null page_number');
        }
    }

    /** @test */
    public function full_ingestion_keeps_page_number_null_for_docx()
    {
        Event::fake();
        $this->fakeTextExtractor();
        $this->fakeImageExtractor();
        $this->fakeEmbeddings();
        Storage::fake('public');

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $material = LearningMaterial::factory()->create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'file_type'        => 'DOCX',
            'ingestion_status' => 'pending',
            'ai_sync'          => false,
            'file_path'        => 'fake/test.docx',
        ]);

        Storage::disk('public')->put($material->file_path, 'dummy');

        $service = $this->app->make(MaterialIngestionService::class);
        $service->ingest($material);

        $rows = DB::table('lesson_embeddings')
            ->where('material_id', $material->id)
            ->get();

        $this->assertGreaterThan(0, $rows->count());
        foreach ($rows as $row) {
            $this->assertNull($row->page_number, 'DOCX chunks must have null page_number');
        }
    }

    /** @test */
    public function full_ingestion_stores_content_hash()
    {
        Event::fake();
        $this->fakeTextExtractor();
        $this->fakeImageExtractor();
        $this->fakeEmbeddings();
        Storage::fake('public');

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $material = LearningMaterial::factory()->create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'file_type'        => 'PDF',
            'ingestion_status' => 'pending',
            'ai_sync'          => false,
            'file_path'        => 'fake/test.pdf',
        ]);

        Storage::disk('public')->put($material->file_path, 'dummy');

        $service = $this->app->make(MaterialIngestionService::class);
        $service->ingest($material);

        $rows = DB::table('lesson_embeddings')
            ->where('material_id', $material->id)
            ->get();

        $this->assertGreaterThan(0, $rows->count());
        foreach ($rows as $row) {
            $this->assertNotNull($row->content_hash, 'Each row must have a content_hash');
            $expectedHash = md5($row->chunk_text);
            $this->assertSame($expectedHash, $row->content_hash, 'content_hash must be md5 of chunk_text');
        }
    }

    /** @test */
    public function content_hash_skip_avoids_embedding_api_on_reingestion()
    {
        Event::fake();
        $this->fakeTextExtractor();
        $this->fakeImageExtractor();
        Storage::fake('public');

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $material = LearningMaterial::factory()->create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'file_type'        => 'PDF',
            'ingestion_status' => 'pending',
            'ai_sync'          => false,
            'file_path'        => 'fake/test.pdf',
        ]);

        Storage::disk('public')->put($material->file_path, 'dummy');

        // First ingestion — send one embedding request
        $this->fakeEmbeddings();
        $service = $this->app->make(MaterialIngestionService::class);
        $service->ingest($material);

        // Second ingestion — use a call counter in the fake
        Bus::fake();
        $embedCallCount = 0;
        Http::fake(function () use (&$embedCallCount) {
            $embedCallCount++;
            return Http::response('', 500);
        });

        $service->ingest($material);

        $this->assertSame(0, $embedCallCount,
            'Content-hash skip should prevent embedding API call on re-ingestion of unchanged content');
    }

    /** @test */
    public function reprocess_with_shrinking_chunk_count_deletes_stale_rows()
    {
        Event::fake();
        Storage::fake('public');

        $teacher = User::factory()->create(['role' => 'teacher']);
        $class = SchoolClass::factory()->create(['teacher_id' => $teacher->id]);
        $topic = Topic::factory()->create(['class_id' => $class->id]);
        $lesson = Lesson::factory()->create(['topic_id' => $topic->id]);

        $material = LearningMaterial::factory()->create([
            'teacher_id'       => $teacher->id,
            'lesson_id'        => $lesson->id,
            'file_type'        => 'DOCX',
            'ingestion_status' => 'pending',
            'ai_sync'          => false,
            'file_path'        => 'fake/test.docx',
        ]);

        Storage::disk('public')->put($material->file_path, 'dummy');

        $this->fakeImageExtractor();
        $this->fakeEmbeddings();

        // Mock TextExtractor to return a long text first, then short text on second call.
        // extractWithPages is never called for DOCX (hasPages=false), only extract() is.
        $callCount = 0;
        $this->mock(TextExtractor::class, function ($mock) use (&$callCount) {
            $mock->shouldReceive('extract')
                ->zeroOrMoreTimes()
                ->andReturnUsing(function () use (&$callCount) {
                    $callCount++;
                    if ($callCount <= 1) {
                        // First call: ~12500 chars → ~6-7 chunks
                        return str_repeat('word ', 2500);
                    }
                    // Second call: short text → 1 chunk
                    return 'Short text that fits in one chunk.';
                });

            $mock->shouldReceive('extractWithPages')
                ->zeroOrMoreTimes()
                ->andReturn([['page_number' => null, 'text' => '']]);
        });

        $service = $this->app->make(MaterialIngestionService::class);

        // First ingestion → many chunks
        $service->ingest($material);

        $firstCount = DB::table('lesson_embeddings')
            ->where('material_id', $material->id)
            ->count();
        $this->assertGreaterThanOrEqual(4, $firstCount,
            'First ingestion should produce at least 4 chunks');

        // Second ingestion → fewer chunks (stale rows should be deleted)
        $service->ingest($material);

        $rows = DB::table('lesson_embeddings')
            ->where('material_id', $material->id)
            ->orderBy('chunk_index')
            ->get();

        $this->assertCount(1, $rows,
            'Second ingestion should produce exactly 1 chunk');
        $this->assertSame([0], $rows->pluck('chunk_index')->toArray(),
            'Stale chunk_index entries from the first ingestion should have been deleted');
    }
}
