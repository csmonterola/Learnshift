<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->unsignedBigInteger('quarter_id')->nullable()->change();
        });

        Schema::table('topics', function (Blueprint $table) {
            $table->dropColumn(['lesson_count', 'order']);
        });
    }

    public function down(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->unsignedBigInteger('quarter_id')->nullable(false)->change();
        });

        Schema::table('topics', function (Blueprint $table) {
            $table->integer('lesson_count')->default(0);
            $table->integer('order');
        });
    }
};
