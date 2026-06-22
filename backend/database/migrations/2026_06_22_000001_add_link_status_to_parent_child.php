<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parent_child', function (Blueprint $table) {
            $table->string('link_status', 20)->default('pending')->after('student_id');
            $table->timestamp('confirmed_at')->nullable()->after('link_status');
        });
    }

    public function down(): void
    {
        Schema::table('parent_child', function (Blueprint $table) {
            $table->dropColumn(['link_status', 'confirmed_at']);
        });
    }
};