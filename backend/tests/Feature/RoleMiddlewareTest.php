<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function admin_cannot_access_student_routes(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/student/dashboard')
            ->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** @test */
    public function student_cannot_access_admin_routes(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** @test */
    public function teacher_cannot_access_parent_routes(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/parent/dashboard')
            ->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }
}
