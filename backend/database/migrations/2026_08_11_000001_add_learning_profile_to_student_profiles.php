<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the learner-profile JSON column to student_profiles.
     *
     * The column stores ONLY the self-report seed answers (per-trait scale
     * values in [-1,1]) plus schema_version and updated_at. Behavioral traits
     * are always derived live by LearningProfileService::analyze() at read
     * time and merged with this seed — never persisted here.
     */
    public function up(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->json('learning_profile')->nullable()->after('diagnostic_completed');
        });
    }

    public function down(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->dropColumn('learning_profile');
        });
    }
};
