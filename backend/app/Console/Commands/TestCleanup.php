<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TestCleanup extends Command
{
    protected $signature = 'test:cleanup';
    protected $description = 'Delete all test records prefixed with TEST_';

    public function handle(): void
    {
        // Material images first (FK safety)
        DB::table('material_images')->whereIn('learning_material_id', function ($q) {
            $q->select('id')->from('learning_materials')->where('file_name', 'like', 'TEST_%');
        })->delete();

        // Learning materials
        DB::table('learning_materials')->where('file_name', 'like', 'TEST_%')->delete();

        // Lessons
        DB::table('lessons')->where('title', 'like', 'TEST_%')->delete();

        // Topics
        DB::table('topics')->where('title', 'like', 'TEST_%')->delete();

        // Quarters
        DB::table('quarters')->where('title', 'like', 'TEST_%')->delete();

        // Subjects
        DB::table('subjects')->where('name', 'like', 'TEST_%')->delete();

        // Enrollments via class name
        $classIds = DB::table('classes')->where('name', 'like', 'TEST_%')->pluck('id');
        if ($classIds->isNotEmpty()) {
            DB::table('class_student')->whereIn('class_id', $classIds)->delete();
            DB::table('classes')->whereIn('id', $classIds)->delete();
        }

        // Parent-child links for test users
        $testUserIds = DB::table('users')->where('name', 'like', 'TEST_%')->pluck('id');
        if ($testUserIds->isNotEmpty()) {
            DB::table('parent_child')->whereIn('parent_id', $testUserIds)->delete();
            DB::table('parent_child')->whereIn('student_id', $testUserIds)->delete();
        }

        // Users
        DB::table('users')->where('name', 'like', 'TEST_%')->delete();

        $this->info('Test cleanup complete.');
    }
}