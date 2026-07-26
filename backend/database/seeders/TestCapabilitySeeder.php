<?php

namespace Database\Seeders;

use App\Models\SchoolClass;
use App\Models\Lesson;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TestCapabilitySeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::factory()->create([
            'name' => 'TEST_Admin Capability',
            'email' => 'test_admin@learnshift.test',
            'role' => 'admin',
        ]);

        $teacher = User::factory()->create([
            'name' => 'TEST_Teacher Capability',
            'email' => 'test_teacher@learnshift.test',
            'role' => 'teacher',
        ]);

        $student = User::factory()->create([
            'name' => 'TEST_Student Capability',
            'email' => 'test_student@learnshift.test',
            'role' => 'student',
        ]);

        $class = SchoolClass::create([
            'name' => 'TEST_Capability_Check',
            'grade_level' => 'Grade 1',
            'section' => 'A',
            'school_year' => '2026-2027',
            'subject' => 'Math',
            'teacher_id' => $teacher->id,
            'is_active' => true,
        ]);

        DB::table('class_student')->insert([
            'class_id' => $class->id,
            'student_id' => $student->id,
            'enrolled_at' => now(),
        ]);

        $subjectId = DB::table('subjects')->insertGetId([
            'name' => 'TEST_Math',
            'code' => 'TEST-MATH',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $quarter = DB::table('quarters')->insertGetId([
            'subject_id' => $subjectId,
            'grade_level' => 'Grade 1',
            'quarter_number' => 1,
            'title' => 'TEST_Q1',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $topic = Topic::create([
            'title' => 'TEST_Capability Topic',
            'quarter_id' => $quarter,
            'class_id' => $class->id,
        ]);

        $lesson = Lesson::create([
            'title' => 'TEST_Capability Lesson',
            'topic_id' => $topic->id,
        ]);
    }
}