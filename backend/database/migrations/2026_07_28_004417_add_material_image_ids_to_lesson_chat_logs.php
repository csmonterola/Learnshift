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
        if (!Schema::hasColumn('lesson_chat_logs', 'material_image_ids')) {
            Schema::table('lesson_chat_logs', function (Blueprint $table) {
                $table->json('material_image_ids')->nullable()->after('response');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('lesson_chat_logs', 'material_image_ids')) {
            Schema::table('lesson_chat_logs', function (Blueprint $table) {
                $table->dropColumn('material_image_ids');
            });
        }
    }
};