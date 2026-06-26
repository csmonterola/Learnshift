<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Messages - optimize chat queries (use IF NOT EXISTS for idempotency)
        if (Schema::hasTable('messages')) {
            DB::statement('CREATE INDEX IF NOT EXISTS "idx_messages_sender_receiver" ON "messages" ("sender_id", "receiver_id", "created_at")');
            DB::statement('CREATE INDEX IF NOT EXISTS "idx_messages_unread" ON "messages" ("receiver_id", "is_read", "created_at")');
        }

        // Quiz results - optimize student quiz lookups
        if (Schema::hasTable('quiz_results')) {
            DB::statement('CREATE INDEX IF NOT EXISTS "idx_quiz_student_lesson" ON "quiz_results" ("student_id", "lesson_id", "submitted_at")');
        }

        // Lesson progress - optimize progress queries
        if (Schema::hasTable('student_lesson_progress')) {
            DB::statement('CREATE INDEX IF NOT EXISTS "idx_lesson_progress_student" ON "student_lesson_progress" ("student_id", "lesson_id", "status")');
        }

        // Practice attempts - optimize practice queries
        if (Schema::hasTable('practice_attempts')) {
            Schema::table('practice_attempts', function (Blueprint $table) {
                $table->index(['student_id', 'created_at'], 'idx_practice_student_date');
            });
        }

        // Learning materials - optimize content queries
        if (Schema::hasTable('learning_materials')) {
            DB::statement('CREATE INDEX IF NOT EXISTS "idx_materials_lesson_status" ON "learning_materials" ("lesson_id", "ingestion_status")');
        }
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('idx_messages_sender_receiver');
            $table->dropIndex('idx_messages_unread');
        });

        Schema::table('quiz_results', function (Blueprint $table) {
            $table->dropIndex('idx_quiz_student_lesson');
        });

        Schema::table('student_lesson_progress', function (Blueprint $table) {
            $table->dropIndex('idx_lesson_progress_student');
        });

        Schema::table('practice_attempts', function (Blueprint $table) {
            $table->dropIndex('idx_practice_student_date');
        });

        Schema::table('learning_materials', function (Blueprint $table) {
            $table->dropIndex('idx_materials_lesson_status');
        });
    }
};