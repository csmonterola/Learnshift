<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->dropColumn(['total_xp', 'streak_days', 'last_active_date']);
        });

        Schema::table('student_topic_progress', function (Blueprint $table) {
            $table->dropColumn('xp_earned');
        });
    }

    public function down(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->unsignedInteger('total_xp')->default(0);
            $table->unsignedInteger('streak_days')->default(0);
            $table->date('last_active_date')->nullable();
        });

        Schema::table('student_topic_progress', function (Blueprint $table) {
            $table->unsignedInteger('xp_earned')->default(0);
        });
    }
};