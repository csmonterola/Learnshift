<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('material_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learning_material_id')
                ->constrained('learning_materials')
                ->cascadeOnDelete();
            $table->unsignedInteger('page_number')->nullable();
            $table->string('s3_path');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('extraction_status', 20)->default('pending');
            $table->timestamps();

            $table->index('learning_material_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_images');
    }
};
