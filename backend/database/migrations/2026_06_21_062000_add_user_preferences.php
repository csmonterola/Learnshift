<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('timezone', 50)->default('Asia/Manila')->after('avatar');
            $table->string('language', 10)->default('en')->after('timezone');
            $table->boolean('email_notifications')->default(true)->after('language');
            $table->string('theme', 20)->default('light')->after('email_notifications');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['timezone', 'language', 'email_notifications', 'theme']);
        });
    }
};