<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('snapshot_best_games')) {
            return;
        }

        Schema::create('snapshot_best_games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('library_game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('rank');
            $table->string('note')->nullable();
            $table->timestamps();

            $table->unique(['snapshot_run_id', 'library_game_id']);
            $table->unique(['snapshot_run_id', 'rank']);
            $table->unique('game_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('snapshot_best_games');
    }
};
