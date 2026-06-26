<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_game_progress_link_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('library_game_progress_link_id')->nullable()->constrained('library_game_progress_links')->nullOnDelete();
            $table->foreignId('target_library_game_id')->constrained('library_games')->cascadeOnDelete();
            $table->foreignId('source_library_game_id')->constrained('library_games')->cascadeOnDelete();
            $table->boolean('sync_playtime')->default(false);
            $table->boolean('sync_achievements')->default(false);
            $table->boolean('sync_dates')->default(false);
            $table->boolean('sync_status')->default(false);
            $table->timestamps();

            $table->unique(['snapshot_run_id', 'target_library_game_id'], 'progress_link_snapshot_target_unique');
            $table->index('source_library_game_id', 'progress_link_snapshot_source_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_game_progress_link_snapshots');
    }
};
