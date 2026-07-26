<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_images', function (Blueprint $table) {
            $table->boolean('requires_ai_classification')->default(false)->after('extraction_status');
        });
    }

    public function down(): void
    {
        Schema::table('material_images', function (Blueprint $table) {
            $table->dropColumn('requires_ai_classification');
        });
    }
};