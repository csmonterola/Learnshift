<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_embeddings', function (Blueprint $table) {
            $table->unsignedInteger('page_number')->nullable()->after('chunk_index');
        });
    }

    public function down(): void
    {
        Schema::table('lesson_embeddings', function (Blueprint $table) {
            $table->dropColumn('page_number');
        });
    }
};
