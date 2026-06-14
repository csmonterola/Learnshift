<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            // Make quarter_id nullable so class-specific topics don't need a quarter
            $table->foreignId('class_id')->nullable()->after('quarter_id')
                  ->constrained('classes')->cascadeOnDelete();
            $table->unsignedInteger('order_index')->default(0)->after('order');
        });

        // Make quarter_id nullable for class-scoped topics
        Schema::table('topics', function (Blueprint $table) {
            $table->foreignId('quarter_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->dropForeign(['class_id']);
            $table->dropColumn(['class_id', 'order_index']);
            $table->foreignId('quarter_id')->nullable(false)->change();
        });
    }
};
