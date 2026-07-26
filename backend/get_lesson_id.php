<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo "admin_id: " . DB::table('users')->where('email', 'test_admin@learnshift.test')->value('id') . " role: " . DB::table('users')->where('email', 'test_admin@learnshift.test')->value('role') . PHP_EOL;
echo "teacher_id: " . DB::table('users')->where('email', 'test_teacher@learnshift.test')->value('id') . PHP_EOL;
echo "student_id: " . DB::table('users')->where('email', 'test_student@learnshift.test')->value('id') . PHP_EOL;
echo "lesson_id: " . DB::table('lessons')->where('title', 'TEST_Capability Lesson')->value('id') . PHP_EOL;