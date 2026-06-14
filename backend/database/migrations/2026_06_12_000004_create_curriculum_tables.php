<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Quarters: Q1, Q2, Q3, Q4
        Schema::create('quarters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->string('grade_level');
            $table->tinyInteger('quarter_number'); // 1-4
            $table->string('title')->nullable();
            $table->timestamps();
        });

        // Topics / Skill Tree nodes
        Schema::create('topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quarter_id')->constrained('quarters')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('order')->default(0);
            $table->integer('lesson_count')->default(0);
            $table->timestamps();
        });

        // Lessons within a topic
        Schema::create('lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('topic_id')->constrained('topics')->cascadeOnDelete();
            $table->string('title');
            $table->text('content')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lessons');
        Schema::dropIfExists('topics');
        Schema::dropIfExists('quarters');
    }
};
