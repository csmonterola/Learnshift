<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_materials', function (Blueprint $table) {
            // Check if lesson_id column exists before adding it
            if (!Schema::hasColumn('learning_materials', 'lesson_id')) {
                // Add lesson_id so materials are per-lesson, not just per-topic
                $table->foreignId('lesson_id')->nullable()->after('topic_id')
                      ->constrained('lessons')->cascadeOnDelete();
            }
            // Make topic_id nullable (links may not need it)
            $table->foreignId('topic_id')->nullable()->change();
            // Make subject_id nullable (class materials don't always have a subject)
            $table->foreignId('subject_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('learning_materials', function (Blueprint $table) {
            $table->dropForeign(['lesson_id']);
            $table->dropColumn('lesson_id');
            $table->foreignId('topic_id')->nullable(false)->change();
            $table->foreignId('subject_id')->nullable(false)->change();
        });
    }
};
