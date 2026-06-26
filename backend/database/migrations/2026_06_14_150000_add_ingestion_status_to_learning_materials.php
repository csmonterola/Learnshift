<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_materials', function (Blueprint $table) {
            // Check if ingestion_status column exists before adding it
            if (!Schema::hasColumn('learning_materials', 'ingestion_status')) {
                $table->enum('ingestion_status', ['none', 'pending', 'processing', 'indexed', 'failed'])
                      ->default('none')
                      ->after('ai_sync');
            }
        });
    }

    public function down(): void
    {
        Schema::table('learning_materials', function (Blueprint $table) {
            $table->dropColumn('ingestion_status');
        });
    }
};
