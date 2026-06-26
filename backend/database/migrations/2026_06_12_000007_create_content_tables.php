<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Teacher-uploaded learning materials
        Schema::create('learning_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->nullOnDelete();
            $table->foreignId('topic_id')->nullable()->constrained('topics')->nullOnDelete();
            $table->foreignId('lesson_id')->nullable()->constrained('lessons')->cascadeOnDelete();
            $table->string('title');
            $table->string('file_path');
            $table->string('file_name');
            $table->string('file_type'); // PDF, DOCX, PPTX
            $table->unsignedBigInteger('file_size')->nullable();
            $table->boolean('ai_sync')->default(false); // synced to AI chatbot
            $table->string('ingestion_status')->default('pending'); // pending, processing, indexed, failed
            $table->timestamps();
        });

        // Guided video sessions (teacher-recorded, visible to parents)
        Schema::create('guided_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('video_path')->nullable();
            $table->string('video_url')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->timestamps();
        });

        // Parent watch progress on guided sessions
        Schema::create('guided_session_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('guided_session_id')->constrained('guided_sessions')->cascadeOnDelete();
            $table->unsignedTinyInteger('progress_percent')->default(0);
            $table->boolean('completed')->default(false);
            $table->timestamp('last_watched_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guided_session_views');
        Schema::dropIfExists('guided_sessions');
        Schema::dropIfExists('learning_materials');
    }
};
