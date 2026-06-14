<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Enable the pgvector extension (requires PostgreSQL with pgvector installed)
        DB::statement('CREATE EXTENSION IF NOT EXISTS vector');

        Schema::create('lesson_embeddings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')
                  ->constrained('lessons')
                  ->cascadeOnDelete();
            $table->foreignId('material_id')
                  ->constrained('learning_materials')
                  ->cascadeOnDelete();
            $table->integer('chunk_index');
            $table->text('chunk_text');
            $table->timestamp('created_at')->useCurrent();

            $table->index('lesson_id', 'idx_lesson_embeddings_lesson_id');
            $table->index('material_id', 'idx_lesson_embeddings_material_id');
        });

        // Add the vector column separately since Laravel Blueprint does not natively support pgvector types
        DB::statement('ALTER TABLE lesson_embeddings ADD COLUMN embedding vector(1024) NOT NULL');

        // IVFFlat index for approximate nearest-neighbour search using cosine distance
        // (best created after bulk loading initial data, but included here for schema completeness)
        DB::statement(
            'CREATE INDEX idx_lesson_embeddings_ivfflat '
            . 'ON lesson_embeddings '
            . 'USING ivfflat (embedding vector_cosine_ops) '
            . 'WITH (lists = 100)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_embeddings');
    }
};
