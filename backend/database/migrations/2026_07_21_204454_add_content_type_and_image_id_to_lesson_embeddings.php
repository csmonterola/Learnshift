<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_embeddings', function (Blueprint $table) {
            $table->string('content_type', 20)->default('text')->after('chunk_index');
            $table->unsignedBigInteger('material_image_id')->nullable()->after('content_type');
            $table->foreign('material_image_id')
                ->references('id')
                ->on('material_images')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lesson_embeddings', function (Blueprint $table) {
            $table->dropForeign(['material_image_id']);
            $table->dropColumn('material_image_id');
            $table->dropColumn('content_type');
        });
    }
};
