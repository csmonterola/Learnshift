<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quiz_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained('lessons')->cascadeOnDelete();
            $table->unsignedSmallInteger('attempt_number'); // 1, 2, or 3
            $table->unsignedTinyInteger('score');            // 0-100 percentage
            $table->unsignedSmallInteger('total_questions');
            $table->unsignedSmallInteger('correct_answers');
            $table->json('answers')->nullable();             // {question_index: selected_option_index}
            $table->timestamp('submitted_at')->useCurrent();

            $table->unique(['student_id', 'lesson_id', 'attempt_number']);
            $table->index(['student_id', 'lesson_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_results');
    }
};