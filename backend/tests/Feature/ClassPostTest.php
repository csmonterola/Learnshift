<?php

namespace Tests\Feature;

use App\Models\ClassPost;
use App\Models\PostComment;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassPostTest extends TestCase
{
    use RefreshDatabase;

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

        $student = User::create([
            'name' => 'Test Student',
            'email' => 'student@test.com',
            'email_verified_at' => now(),
            'password' => bcrypt('password'),
            'role' => 'student',
        ]);

        $otherStudent = User::create([
            'name' => 'Other Student',
            'email' => 'otherstudent@test.com',
            'email_verified_at' => now(),
            'password' => bcrypt('password'),
            'role' => 'student',
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

        $schoolClass->students()->attach($student->id, ['enrolled_at' => now()]);

        $published = ClassPost::create([
            'class_id' => $schoolClass->id,
            'author_id' => $teacher->id,
            'title' => 'Welcome',
            'body' => 'Welcome to the class.',
            'status' => 'published',
            'published_at' => now(),
        ]);

        $draft = ClassPost::create([
            'class_id' => $schoolClass->id,
            'author_id' => $teacher->id,
            'title' => 'Draft Post',
            'body' => 'Not ready yet.',
            'status' => 'draft',
        ]);

        $scheduled = ClassPost::create([
            'class_id' => $schoolClass->id,
            'author_id' => $teacher->id,
            'title' => 'Future Post',
            'body' => 'Coming soon.',
            'status' => 'scheduled',
            'scheduled_at' => now()->addDays(1),
        ]);

        return compact('teacher', 'otherTeacher', 'student', 'otherStudent', 'schoolClass', 'otherClass', 'published', 'draft', 'scheduled');
    }

    // ── Student visibility (published() scope) ────────────────────

    public function test_student_feed_excludes_draft_and_scheduled_posts(): void
    {
        $d = $this->setupData();

        $response = $this->actingAs($d['student'])
            ->getJson("/api/student/classes/{$d['schoolClass']->id}/posts");

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.title', 'Welcome')
            ->assertJsonMissing(['title' => 'Draft Post'])
            ->assertJsonMissing(['title' => 'Future Post']);
    }

    public function test_scheduled_post_hidden_before_date_and_visible_after(): void
    {
        $d = $this->setupData();

        $response = $this->actingAs($d['student'])
            ->getJson("/api/student/classes/{$d['schoolClass']->id}/posts");
        $response->assertOk()->assertJsonCount(1);

        // Move scheduled date into the past; it becomes visible to students.
        $d['scheduled']->update(['scheduled_at' => now()->subMinute()]);

        $response = $this->actingAs($d['student'])
            ->getJson("/api/student/classes/{$d['schoolClass']->id}/posts");
        $response->assertOk()->assertJsonCount(2);
    }

    public function test_unenrolled_student_cannot_see_posts(): void
    {
        $d = $this->setupData();

        $this->actingAs($d['otherStudent'])
            ->getJson("/api/student/classes/{$d['schoolClass']->id}/posts")
            ->assertNotFound();
    }

    // ── Teacher CRUD ──────────────────────────────────────────────

    public function test_teacher_index_includes_all_statuses(): void
    {
        $d = $this->setupData();

        $response = $this->actingAs($d['teacher'])
            ->getJson("/api/teacher/classes/{$d['schoolClass']->id}/posts");

        $response->assertOk()->assertJsonCount(3);
    }

    public function test_teacher_can_create_post(): void
    {
        $d = $this->setupData();

        $response = $this->actingAs($d['teacher'])
            ->postJson("/api/teacher/classes/{$d['schoolClass']->id}/posts", [
                'title' => 'Announcement',
                'body' => 'Quiz on Friday.',
                'status' => 'published',
            ]);

        $response->assertCreated()
            ->assertJsonPath('title', 'Announcement')
            ->assertJsonPath('status', 'published');

        $this->assertDatabaseHas('class_posts', ['title' => 'Announcement', 'status' => 'published']);

        $created = ClassPost::where('title', 'Announcement')->first();
        $this->assertNotNull($created->published_at);
        $this->assertLessThan(5, $created->published_at->diffInSeconds(now()));
    }

    public function test_teacher_can_create_scheduled_post_without_published_at(): void
    {
        $d = $this->setupData();

        $response = $this->actingAs($d['teacher'])
            ->postJson("/api/teacher/classes/{$d['schoolClass']->id}/posts", [
                'title' => 'Later',
                'body' => 'Scheduled.',
                'status' => 'scheduled',
                'scheduled_at' => now()->addDay()->toISOString(),
            ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'scheduled')
            ->assertJsonPath('published_at', null);
    }

    public function test_other_teacher_cannot_manage_class_posts(): void
    {
        $d = $this->setupData();

        $this->actingAs($d['otherTeacher'])
            ->postJson("/api/teacher/classes/{$d['schoolClass']->id}/posts", [
                'title' => 'Hacked',
                'body' => 'Nope.',
            ])
            ->assertNotFound();

        $this->actingAs($d['otherTeacher'])
            ->deleteJson("/api/teacher/classes/{$d['schoolClass']->id}/posts/{$d['published']->id}")
            ->assertNotFound();
    }

    public function test_teacher_can_update_post_and_recompute_published_at(): void
    {
        $d = $this->setupData();

        // Draft → published should set published_at.
        $response = $this->actingAs($d['teacher'])
            ->putJson("/api/teacher/classes/{$d['schoolClass']->id}/posts/{$d['draft']->id}", [
                'title' => 'Now Ready',
                'status' => 'published',
            ]);

        $response->assertOk()
            ->assertJsonPath('title', 'Now Ready')
            ->assertJsonPath('status', 'published');

        $this->assertLessThan(5, $d['draft']->fresh()->published_at->diffInSeconds(now()));

        // Published → draft should clear published_at.
        $response = $this->actingAs($d['teacher'])
            ->putJson("/api/teacher/classes/{$d['schoolClass']->id}/posts/{$d['published']->id}", [
                'status' => 'draft',
            ]);

        $response->assertOk()->assertJsonPath('published_at', null);
    }

    public function test_teacher_can_delete_post(): void
    {
        $d = $this->setupData();

        $this->actingAs($d['teacher'])
            ->deleteJson("/api/teacher/classes/{$d['schoolClass']->id}/posts/{$d['published']->id}")
            ->assertOk();

        $this->assertDatabaseMissing('class_posts', ['id' => $d['published']->id]);
    }

    // ── Comments ──────────────────────────────────────────────────

    public function test_student_can_comment_on_published_post(): void
    {
        $d = $this->setupData();

        $response = $this->actingAs($d['student'])
            ->postJson("/api/student/classes/{$d['schoolClass']->id}/posts/{$d['published']->id}/comments", [
                'body' => 'Thanks, teacher!',
            ]);

        $response->assertCreated()
            ->assertJsonPath('body', 'Thanks, teacher!')
            ->assertJsonPath('user_id', $d['student']->id);

        $this->assertDatabaseHas('post_comments', ['post_id' => $d['published']->id, 'user_id' => $d['student']->id]);
    }

    public function test_student_cannot_comment_on_draft_post(): void
    {
        $d = $this->setupData();

        $this->actingAs($d['student'])
            ->postJson("/api/student/classes/{$d['schoolClass']->id}/posts/{$d['draft']->id}/comments", [
                'body' => 'Should fail.',
            ])
            ->assertNotFound();
    }

    public function test_teacher_can_comment_on_post(): void
    {
        $d = $this->setupData();

        $response = $this->actingAs($d['teacher'])
            ->postJson("/api/teacher/classes/{$d['schoolClass']->id}/posts/{$d['published']->id}/comments", [
                'body' => 'Reminder for everyone.',
            ]);

        $response->assertCreated()->assertJsonPath('user_id', $d['teacher']->id);
    }

    public function test_comments_are_returned_with_post_feed(): void
    {
        $d = $this->setupData();

        PostComment::create([
            'post_id' => $d['published']->id,
            'user_id' => $d['student']->id,
            'body' => 'Nice post.',
        ]);

        $response = $this->actingAs($d['student'])
            ->getJson("/api/student/classes/{$d['schoolClass']->id}/posts");

        $response->assertOk()
            ->assertJsonPath('0.comments.0.body', 'Nice post.')
            ->assertJsonPath('0.comments_count', 1);
    }
}
