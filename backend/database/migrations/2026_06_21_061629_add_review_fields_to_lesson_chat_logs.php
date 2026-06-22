<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('lesson_chat_logs', function (Blueprint $table) {
            $table->string('status', 20)->default('ok')->after('confidence_score');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete()->after('status');
            $table->text('teacher_note')->nullable()->after('reviewed_by');
            $table->text('teacher_corrected_response')->nullable()->after('teacher_note');
            $table->timestamp('reviewed_at')->nullable()->after('teacher_corrected_response');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lesson_chat_logs', function (Blueprint $table) {
            $table->dropColumn(['status', 'reviewed_by', 'teacher_note', 'teacher_corrected_response', 'reviewed_at']);
        });
    }
};
