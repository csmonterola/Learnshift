<?php

namespace Database\Seeders;

use App\Models\Quarter;
use App\Models\SchoolClass;
use App\Models\StudentProfile;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Users ─────────────────────────────────────────────────
        $admin = User::create([
            'name'     => 'Admin User',
            'email'    => 'admin@learnshift.com',
            'password' => Hash::make('password'),
            'role'     => 'admin',
        ]);

        $teacher = User::create([
            'name'     => 'Ms. Rivera',
            'email'    => 'teacher@learnshift.com',
            'password' => Hash::make('password'),
            'role'     => 'teacher',
        ]);

        $parent = User::create([
            'name'            => 'Mr. Thompson',
            'email'           => 'parent@learnshift.com',
            'password'        => Hash::make('password'),
            'role'            => 'parent',
            'enrollment_code' => 'PARENT01',
        ]);

        $student1 = User::create([
            'name'            => 'Emma Thompson',
            'email'           => 'emma@learnshift.com',
            'password'        => Hash::make('password'),
            'role'            => 'student',
            'enrollment_code' => 'STU001',
        ]);

        $student2 = User::create([
            'name'            => 'Liam Garcia',
            'email'           => 'liam@learnshift.com',
            'password'        => Hash::make('password'),
            'role'            => 'student',
            'enrollment_code' => 'STU002',
        ]);

        // ── Student Profiles ──────────────────────────────────────
        StudentProfile::create([
            'student_id'             => $student1->id,
            'grade_level'            => '8th',
            'section'                => 'A',
            'total_xp'               => 1250,
            'streak_days'            => 7,
            'diagnostic_score'       => 92,
            'diagnostic_completed'   => true,
            'last_active_date'       => now()->toDateString(),
        ]);

        StudentProfile::create([
            'student_id'             => $student2->id,
            'grade_level'            => '8th',
            'section'                => 'A',
            'total_xp'               => 640,
            'streak_days'            => 3,
            'diagnostic_score'       => 78,
            'diagnostic_completed'   => true,
            'last_active_date'       => now()->subDay()->toDateString(),
        ]);

        // ── Parent–Child Link ─────────────────────────────────────
        $parent->children()->attach($student1->id);

        // ── Subjects ──────────────────────────────────────────────
        $subjects = [
            ['name' => 'Mathematics',    'code' => 'MATH',    'color' => '#4f46e5'],
            ['name' => 'Science',         'code' => 'SCI',     'color' => '#16a34a'],
            ['name' => 'English',         'code' => 'ENG',     'color' => '#0891b2'],
            ['name' => 'Filipino',        'code' => 'FIL',     'color' => '#dc2626'],
            ['name' => 'Araling Panlipunan', 'code' => 'AP',  'color' => '#d97706'],
            ['name' => 'MAPEH',           'code' => 'MAPEH',   'color' => '#9333ea'],
        ];

        foreach ($subjects as $s) {
            Subject::create($s);
        }

        $math    = Subject::where('code', 'MATH')->first();
        $science = Subject::where('code', 'SCI')->first();

        // ── Classes ───────────────────────────────────────────────
        $mathClass = SchoolClass::create([
            'name'        => 'Grade 8 - Mathematics A',
            'grade_level' => '8th',
            'section'     => 'A',
            'school_year' => '2025-2026',
            'room'        => 'Room 301',
            'schedule'    => 'MWF 8:00-9:00 AM',
            'teacher_id'  => $teacher->id,
            'subject_id'  => $math->id,
        ]);

        $mathClass->students()->attach([$student1->id, $student2->id]);

        // ── Curriculum: Math Q1 ───────────────────────────────────
        $q1 = Quarter::create([
            'subject_id'      => $math->id,
            'grade_level'     => '8th',
            'quarter_number'  => 1,
            'title'           => 'Algebra Fundamentals',
        ]);

        $topics = [
            ['title' => 'Introduction to Algebra',   'order' => 1, 'lesson_count' => 5],
            ['title' => 'Linear Equations',           'order' => 2, 'lesson_count' => 8],
            ['title' => 'Inequalities',               'order' => 3, 'lesson_count' => 6],
        ];

        foreach ($topics as $t) {
            Topic::create(array_merge($t, ['quarter_id' => $q1->id]));
        }

        $q2 = Quarter::create([
            'subject_id'     => $math->id,
            'grade_level'    => '8th',
            'quarter_number' => 2,
            'title'          => 'Functions and Systems',
        ]);

        $q2Topics = [
            ['title' => 'Functions',            'order' => 1, 'lesson_count' => 7],
            ['title' => 'Systems of Equations', 'order' => 2, 'lesson_count' => 9],
        ];

        foreach ($q2Topics as $t) {
            Topic::create(array_merge($t, ['quarter_id' => $q2->id]));
        }

        // ── Sample Questions ──────────────────────────────────────
        $linearEqTopic = Topic::where('title', 'Linear Equations')->first();
        if ($linearEqTopic) {
            $questions = [
                [
                    'question_text'  => 'Solve for x: 2x + 5 = 15',
                    'options'        => json_encode(['x = 5', 'x = 4', 'x = 10', 'x = 3']),
                    'correct_answer' => 'x = 5',
                    'explanation'    => 'Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5.',
                    'difficulty'     => 'easy',
                ],
                [
                    'question_text'  => 'Solve for x: 3x - 7 = 11',
                    'options'        => json_encode(['x = 4', 'x = 6', 'x = 5', 'x = 7']),
                    'correct_answer' => 'x = 6',
                    'explanation'    => 'Add 7 to both sides: 3x = 18, then divide by 3: x = 6.',
                    'difficulty'     => 'easy',
                ],
                [
                    'question_text'  => 'Solve for x: 4x + 3 = 2x + 11',
                    'options'        => json_encode(['x = 2', 'x = 4', 'x = 3', 'x = 5']),
                    'correct_answer' => 'x = 4',
                    'explanation'    => 'Subtract 2x from both sides: 2x + 3 = 11, then subtract 3: 2x = 8, x = 4.',
                    'difficulty'     => 'medium',
                ],
            ];

            foreach ($questions as $q) {
                \App\Models\Question::create(array_merge($q, ['topic_id' => $linearEqTopic->id]));
            }
        }

        $this->command->info('Database seeded successfully!');
        $this->command->info('Test accounts:');
        $this->command->info('  Admin:   admin@learnshift.com / password');
        $this->command->info('  Teacher: teacher@learnshift.com / password');
        $this->command->info('  Parent:  parent@learnshift.com / password');
        $this->command->info('  Student: emma@learnshift.com / password');
        $this->command->info('  Student: liam@learnshift.com / password');
    }
}
