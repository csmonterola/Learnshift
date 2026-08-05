<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_pins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('other_user_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('pinned_at')->useCurrent();
            $table->timestamps();

            $table->unique(['user_id', 'other_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_pins');
    }
};