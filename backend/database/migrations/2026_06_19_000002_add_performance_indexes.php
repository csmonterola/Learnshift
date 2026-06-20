<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Messages - optimize chat queries
        Schema::table('messages', function (Blueprint $table) {
            $table->index(['sender_id', 'receiver_id', 'created_at'], 'idx_messages_sender_receiver');
            $table->index(['receiver_id', 'is_read', 'created_at'], 'idx_messages_unread');
        });

        // Quiz results - optimize student quiz lookups
        Schema::table('quiz_results', function (Blueprint $table) {
            $table->index(['student_id', 'lesson_id', 'submitted_at'], 'idx_quiz_student_lesson');
        });

        // Lesson progress - optimize progress queries
        Schema::table('student_lesson_progress', function (Blueprint $table) {
            $table->index(['student_id', 'lesson_id', 'status'], 'idx_lesson_progress_student');
        });

        // Practice attempts - optimize practice queries
        Schema::table('practice_attempts', function (Blueprint $table) {
            $table->index(['student_id', 'created_at'], 'idx_practice_student_date');
        });

        // Learning materials - optimize content queries
        Schema::table('learning_materials', function (Blueprint $table) {
            $table->index(['lesson_id', 'ingestion_status'], 'idx_materials_lesson_status');
        });
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