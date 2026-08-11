<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add a question_meta JSON column to practice_attempts.
     *
     * Stores the per-question snapshot ({ index, difficulty, correct }) for
     * AI-generated practice sessions so LearningProfileService can derive the
     * difficulty_appetite trait without joining the (empty) questions table.
     */
    public function up(): void
    {
        Schema::table('practice_attempts', function (Blueprint $table) {
            $table->json('question_meta')->nullable()->after('answers');
        });
    }

    public function down(): void
    {
        Schema::table('practice_attempts', function (Blueprint $table) {
            $table->dropColumn('question_meta');
        });
    }
};
