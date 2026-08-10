<?php

namespace Tests\Feature;

use App\Jobs\IngestLearningMaterialJob;
use App\Models\LearningMaterial;
use App\Models\Lesson;
use App\Models\LessonEmbedding;
use App\Models\SchoolClass;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ContentUpdateTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Task 3: metadata edits (title/description/tags/lesson) persist correctly,
     * file replacement resets ingestion and clears stale embeddings, and the
     * update endpoint respects teacher ownership of both material and lesson.
     */
    protected function setUp(): void
    {
        parent::setUp();
        Bus::fake();
        Storage::fake('public');
        Http::fake();
    }

    private function setupData(): array
    {
        $teacher = User::create([
            'name' => 'Test Teacher',
            'email' => 'teacher@test.com',
            'email_verified_at' => now(),
            'password' => bcrypt('password'),
            'role' => 'teacher',
        ]);

        $otherTeacher = User::create([
            'name' => 'Other Teacher',
            'email' => 'other@test.com',
            'email_verified_at' => now(),
            'password' => bcrypt('password'),
            'role' => 'teacher',
        ]);

        $schoolClass = SchoolClass::create([
            'name' => 'Test Class',
            'teacher_id' => $teacher->id,
            'subject' => 'Mathematics',
            'grade_level' => '10',
            'section' => 'A',
            'school_year' => '2024-2025',
        ]);

        $otherClass = SchoolClass::create([
            'name' => 'Other Class',
            'teacher_id' => $otherTeacher->id,
            'subject' => 'Science',
            'grade_level' => '10',
            'section' => 'B',
            'school_year' => '2024-2025',
        ]);

        $topic = Topic::create(['title' => 'Test Topic', 'class_id' => $schoolClass->id, 'order_index' => 1]);
        $otherTopic = Topic::create(['title' => 'Other Topic', 'class_id' => $otherClass->id, 'order_index' => 1]);

        $lesson = Lesson::create(['title' => 'Test Lesson', 'topic_id' => $topic->id, 'order' => 1]);
        $lesson2 = Lesson::create(['title' => 'Second Lesson', 'topic_id' => $topic->id, 'order' => 2]);
        $otherLesson = Lesson::create(['title' => 'Other Lesson', 'topic_id' => $otherTopic->id, 'order' => 1]);

        // Wrap in withoutEvents so the `created` observer doesn't dispatch a
        // re-ingestion job during setup — dispatch assertions must only count
        // what the endpoint under test actually does.
        $material = LearningMaterial::withoutEvents(fn () => LearningMaterial::create([
            'teacher_id' => $teacher->id,
            'lesson_id' => $lesson->id,
            'title' => 'Original Title',
            'file_path' => "lessons/{$lesson->id}/materials/original.pdf",
            'file_name' => 'original.pdf',
            'file_type' => 'PDF',
            'file_size' => 2048,
            'ai_sync' => true,
            'ingestion_status' => 'indexed',
        ]));

        return [
            'teacher' => $teacher,
            'other_teacher' => $otherTeacher,
            'lesson' => $lesson,
            'lesson2' => $lesson2,
            'other_lesson' => $otherLesson,
            'material' => $material,
        ];
    }

    public function test_updates_metadata(): void
    {
        $d = $this->setupData();

        $response = $this->actingAs($d['teacher'])
            ->putJson("/api/teacher/content/{$d['material']->id}", [
                'title' => 'Updated Title',
                'description' => 'A new description',
                'tags' => ['algebra', 'equations'],
                'lesson_id' => $d['lesson2']->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('title', 'Updated Title')
            ->assertJsonPath('description', 'A new description')
            ->assertJsonPath('tags.0', 'algebra')
            ->assertJsonPath('tags.1', 'equations');

        $d['material']->refresh();
        $this->assertSame('Updated Title', $d['material']->title);
        $this->assertSame('A new description', $d['material']->description);
        $this->assertSame(['algebra', 'equations'], $d['material']->tags);
        $this->assertSame($d['lesson2']->id, $d['material']->lesson_id);
        $this->assertSame('indexed', $d['material']->ingestion_status);
    }

    public function test_rejects_other_teacher(): void
    {
        $d = $this->setupData();

        $this->actingAs($d['other_teacher'])
            ->putJson("/api/teacher/content/{$d['material']->id}", ['title' => 'Hacked'])
            ->assertStatus(403);
    }

    public function test_rejects_lesson_not_owned_by_teacher(): void
    {
        $d = $this->setupData();

        $this->actingAs($d['teacher'])
            ->putJson("/api/teacher/content/{$d['material']->id}", [
                'title' => 'Moved',
                'lesson_id' => $d['other_lesson']->id,
            ])
            ->assertStatus(403);
    }

    public function test_requires_title(): void
    {
        $d = $this->setupData();

        $this->actingAs($d['teacher'])
            ->putJson("/api/teacher/content/{$d['material']->id}", ['description' => 'no title'])
            ->assertStatus(422);
    }

    public function test_can_unassign_lesson(): void
    {
        $d = $this->setupData();

        $this->actingAs($d['teacher'])
            ->putJson("/api/teacher/content/{$d['material']->id}", [
                'title' => 'Unassigned',
                'lesson_id' => null,
            ])
            ->assertStatus(200);

        $d['material']->refresh();
        $this->assertNull($d['material']->lesson_id);
    }

    public function test_replaces_file_resets_pending_and_clears_stale_embeddings(): void
    {
        $d = $this->setupData();
        $oldPath = $d['material']->file_path;

        Storage::disk('public')->put($oldPath, 'old content');
        LessonEmbedding::create([
            'lesson_id' => $d['material']->lesson_id,
            'material_id' => $d['material']->id,
            'chunk_index' => 0,
            'chunk_text' => 'stale chunk',
            'embedding' => [],
        ]);
        $this->assertSame(1, LessonEmbedding::where('material_id', $d['material']->id)->count());

        $newFile = UploadedFile::fake()->create('replacement.pdf', 1024);

        $this->actingAs($d['teacher'])
            ->put("/api/teacher/content/{$d['material']->id}", [
                'title' => 'Replaced',
                'file' => $newFile,
            ], ['Accept' => 'application/json'])
            ->assertStatus(200);

        $d['material']->refresh();
        $this->assertSame('pending', $d['material']->ingestion_status);
        $this->assertSame('replacement.pdf', $d['material']->file_name);
        $this->assertFalse(Storage::disk('public')->exists($oldPath));
        $this->assertTrue(Storage::disk('public')->exists($d['material']->file_path));
        $this->assertSame(0, LessonEmbedding::where('material_id', $d['material']->id)->count());

        // A replaced file on an already-indexed material must be re-queued
        // (the observer skips re-dispatch for that case), so it doesn't sit
        // at "pending" until a manual Reprocess.
        Bus::assertDispatched(IngestLearningMaterialJob::class);
    }

    public function test_replace_file_on_failed_material_dispatches_job_exactly_once(): void
    {
        $d = $this->setupData();
        $d['material']->ingestion_status = 'failed';
        $d['material']->save();

        $newFile = UploadedFile::fake()->create('retry.pdf', 1024);

        $this->actingAs($d['teacher'])
            ->put("/api/teacher/content/{$d['material']->id}", [
                'title' => 'Retry',
                'file' => $newFile,
            ], ['Accept' => 'application/json'])
            ->assertStatus(200);

        // The observer handles re-dispatch for non-indexed materials; the
        // controller's explicit dispatch must not fire on top of it.
        Bus::assertDispatchedTimes(IngestLearningMaterialJob::class, 1);
    }

    public function test_metadata_only_update_does_not_dispatch_job(): void
    {
        $d = $this->setupData();

        $this->actingAs($d['teacher'])
            ->putJson("/api/teacher/content/{$d['material']->id}", [
                'title' => 'Just a rename',
                'tags' => ['new'],
            ])
            ->assertStatus(200);

        Bus::assertNotDispatched(IngestLearningMaterialJob::class);
    }

    public function test_delete_succeeds_for_owning_teacher(): void
    {
        $d = $this->setupData();
        Storage::disk('public')->put($d['material']->file_path, 'content');

        $this->actingAs($d['teacher'])
            ->deleteJson("/api/teacher/content/{$d['material']->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('learning_materials', ['id' => $d['material']->id]);
        $this->assertFalse(Storage::disk('public')->exists($d['material']->file_path));
    }

    public function test_delete_rejects_other_teacher(): void
    {
        $d = $this->setupData();

        $this->actingAs($d['other_teacher'])
            ->deleteJson("/api/teacher/content/{$d['material']->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('learning_materials', ['id' => $d['material']->id]);
    }

    public function test_index_includes_description_and_tags(): void
    {
        $d = $this->setupData();
        $d['material']->description = 'A description';
        $d['material']->tags = ['tag-a', 'tag-b'];
        $d['material']->save();

        $response = $this->actingAs($d['teacher'])->getJson('/api/teacher/content');
        $response->assertStatus(200);

        $item = collect($response->json())->firstWhere('id', $d['material']->id);
        $this->assertNotNull($item);
        $this->assertSame('A description', $item['description']);
        $this->assertSame(['tag-a', 'tag-b'], $item['tags']);
    }
}
