<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_topic_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('topic_id')->constrained('topics')->cascadeOnDelete();
            $table->enum('status', ['locked', 'active', 'completed'])->default('locked');
            $table->unsignedTinyInteger('mastery_score')->default(0); // 0-100
            $table->unsignedInteger('xp_earned')->default(0);
            $table->timestamps();
            $table->unique(['student_id', 'topic_id']);
        });

        Schema::create('student_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete()->unique();
            $table->string('grade_level')->nullable();
            $table->string('section')->nullable();
            $table->unsignedInteger('total_xp')->default(0);
            $table->unsignedInteger('streak_days')->default(0);
            $table->date('last_active_date')->nullable();
            $table->unsignedInteger('diagnostic_score')->nullable();
            $table->boolean('diagnostic_completed')->default(false);
            $table->timestamps();
        });

        Schema::create('student_subject_mastery', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->unsignedTinyInteger('mastery_score')->default(0);
            $table->unsignedTinyInteger('target_score')->default(85);
            $table->timestamps();
            $table->unique(['student_id', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_subject_mastery');
        Schema::dropIfExists('student_profiles');
        Schema::dropIfExists('student_topic_progress');
    }
};
