<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('material_images', function (Blueprint $table) {
            $table->text('caption')->nullable()->after('extraction_status');
        });
    }

    public function down(): void
    {
        Schema::table('material_images', function (Blueprint $table) {
            $table->dropColumn('caption');
        });
    }
};
