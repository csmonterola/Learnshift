<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_images', function (Blueprint $table) {
            $table->string('content_hash', 64)->nullable()->after('file_size');
            $table->index('content_hash');
        });
    }

    public function down(): void
    {
        Schema::table('material_images', function (Blueprint $table) {
            $table->dropIndex(['content_hash']);
            $table->dropColumn('content_hash');
        });
    }
};
