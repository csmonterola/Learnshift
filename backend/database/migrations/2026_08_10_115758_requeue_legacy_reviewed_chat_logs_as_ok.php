<?php

use App\Models\LessonChatLog;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Task 4 removed the 'reviewed' status. Any rows still carrying that
     * value were orphaned (no badge case, excluded from the needs_review
     * count). Re-queue them into the normal review flow as 'ok'.
     */
    public function up(): void
    {
        LessonChatLog::where('status', 'reviewed')->update(['status' => 'ok']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
