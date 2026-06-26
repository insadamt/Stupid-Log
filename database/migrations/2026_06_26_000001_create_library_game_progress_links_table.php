<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_game_progress_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('target_library_game_id')->constrained('library_games')->cascadeOnDelete();
            $table->foreignId('source_library_game_id')->constrained('library_games')->cascadeOnDelete();
            $table->boolean('sync_playtime')->default(false);
            $table->boolean('sync_achievements')->default(false);
            $table->boolean('sync_dates')->default(false);
            $table->boolean('sync_status')->default(false);
            $table->timestamps();

            $table->unique('target_library_game_id');
            $table->index('source_library_game_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_game_progress_links');
    }
};
