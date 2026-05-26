<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('snapshot_runs', function (Blueprint $table) {
            $table->json('summary_json')->nullable()->after('confirmed_at');
            $table->index(['user_id', 'status', 'year']);
            $table->index(['user_id', 'year']);
        });

        Schema::table('library_games', function (Blueprint $table) {
            $table->index(['user_id', 'status_id']);
            $table->index(['user_id', 'platform_id']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::table('library_game_snapshots', function (Blueprint $table) {
            $table->index(['snapshot_run_id', 'library_game_id']);
            $table->index(['snapshot_run_id', 'platform_id']);
            $table->index(['snapshot_run_id', 'status_id']);
            $table->index(['snapshot_run_id', 'completed_at']);
            $table->index(['snapshot_run_id', 'game_id']);
        });

        Schema::table('ownership_copy_snapshots', function (Blueprint $table) {
            $table->index(['snapshot_run_id', 'library_game_id']);
            $table->index(['snapshot_run_id', 'ownership_type_id']);
        });

        Schema::table('owned_dlc_snapshots', function (Blueprint $table) {
            $table->index(['snapshot_run_id', 'library_game_id']);
            $table->index(['snapshot_run_id', 'acquisition_type']);
        });

    }

    public function down(): void
    {
        Schema::table('owned_dlc_snapshots', function (Blueprint $table) {
            $table->dropIndex(['snapshot_run_id', 'library_game_id']);
            $table->dropIndex(['snapshot_run_id', 'acquisition_type']);
        });

        Schema::table('ownership_copy_snapshots', function (Blueprint $table) {
            $table->dropIndex(['snapshot_run_id', 'library_game_id']);
            $table->dropIndex(['snapshot_run_id', 'ownership_type_id']);
        });

        Schema::table('library_game_snapshots', function (Blueprint $table) {
            $table->dropIndex(['snapshot_run_id', 'library_game_id']);
            $table->dropIndex(['snapshot_run_id', 'platform_id']);
            $table->dropIndex(['snapshot_run_id', 'status_id']);
            $table->dropIndex(['snapshot_run_id', 'completed_at']);
            $table->dropIndex(['snapshot_run_id', 'game_id']);
        });

        Schema::table('library_games', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status_id']);
            $table->dropIndex(['user_id', 'platform_id']);
            $table->dropIndex(['user_id', 'created_at']);
        });

        Schema::table('snapshot_runs', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status', 'year']);
            $table->dropIndex(['user_id', 'year']);
            $table->dropColumn('summary_json');
        });
    }
};
