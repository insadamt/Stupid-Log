<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->timestamps();
        });

        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('currency_code')->default('USD');
            $table->timestamps();
        });

        Schema::create('providers', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('provider_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained()->cascadeOnDelete();
            $table->text('encrypted_client_id')->nullable();
            $table->text('encrypted_client_secret')->nullable();
            $table->text('encrypted_api_key')->nullable();
            $table->boolean('is_enabled')->default(false);
            $table->timestamp('last_tested_at')->nullable();
            $table->string('last_test_status')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'provider_id']);
        });

        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('normalized_title')->index();
            $table->text('cover_url_original')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('publisher')->nullable();
            $table->date('release_date')->nullable();
            $table->text('description')->nullable();
            $table->foreignId('source_provider_id')->nullable()->constrained('providers')->nullOnDelete();
            $table->decimal('base_price_default', 10, 2)->nullable();
            $table->string('base_price_source')->nullable();
            $table->unsignedInteger('total_achievements')->nullable();
            $table->string('total_achievements_source')->nullable();
            $table->timestamp('provider_synced_at')->nullable();
            $table->timestamps();
        });

        Schema::create('external_game_ids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained()->cascadeOnDelete();
            $table->string('external_id');
            $table->text('url')->nullable();
            $table->timestamps();
            $table->unique(['provider_id', 'external_id']);
        });

        Schema::create('platforms', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('platform_device', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_id')->constrained()->cascadeOnDelete();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['platform_id', 'device_id']);
        });

        Schema::create('statuses', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('library_games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('platform_id')->constrained()->restrictOnDelete();
            $table->foreignId('status_id')->constrained()->restrictOnDelete();
            $table->decimal('playtime_hours', 10, 1)->default(0);
            $table->unsignedInteger('earned_achievements')->nullable();
            $table->date('first_played_at')->nullable();
            $table->date('last_played_at')->nullable();
            $table->date('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'game_id', 'platform_id']);
        });

        Schema::create('library_game_device', function (Blueprint $table) {
            $table->id();
            $table->foreignId('library_game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['library_game_id', 'device_id']);
        });

        Schema::create('ownership_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('platform_ownership_type', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ownership_type_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['platform_id', 'ownership_type_id']);
        });

        Schema::create('physical_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('ownership_copies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('library_game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ownership_type_id')->constrained()->restrictOnDelete();
            $table->foreignId('physical_status_id')->nullable()->constrained()->nullOnDelete();
            $table->string('edition_name')->nullable();
            $table->decimal('base_price', 10, 2)->nullable();
            $table->decimal('purchased_price', 10, 2)->nullable();
            $table->date('purchased_at')->nullable();
            $table->timestamps();
            $table->unique(['library_game_id', 'ownership_type_id']);
        });

        Schema::create('dlcs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->string('steam_app_id')->nullable()->unique();
            $table->string('title');
            $table->text('cover_url_original')->nullable();
            $table->string('cover_path')->nullable();
            $table->decimal('base_price', 10, 2)->nullable();
            $table->foreignId('source_provider_id')->nullable()->constrained('providers')->nullOnDelete();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });

        Schema::create('owned_dlcs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('library_game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('dlc_id')->constrained()->cascadeOnDelete();
            $table->string('acquisition_type');
            $table->decimal('purchased_price', 10, 2)->nullable();
            $table->date('purchased_at')->nullable();
            $table->timestamps();
            $table->unique(['library_game_id', 'dlc_id']);
        });

        Schema::create('snapshot_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->string('status')->default('draft');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('library_game_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('library_game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('platform_id')->constrained()->restrictOnDelete();
            $table->foreignId('status_id')->constrained()->restrictOnDelete();
            $table->decimal('playtime_hours', 10, 1)->default(0);
            $table->unsignedInteger('earned_achievements')->nullable();
            $table->unsignedInteger('total_achievements')->nullable();
            $table->date('first_played_at')->nullable();
            $table->date('last_played_at')->nullable();
            $table->date('completed_at')->nullable();
            $table->timestamps();
        });

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

        Schema::create('ownership_copy_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ownership_copy_id')->constrained()->cascadeOnDelete();
            $table->foreignId('library_game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ownership_type_id')->constrained()->restrictOnDelete();
            $table->string('edition_name')->nullable();
            $table->decimal('base_price', 10, 2)->nullable();
            $table->decimal('purchased_price', 10, 2)->nullable();
            $table->date('purchased_at')->nullable();
            $table->timestamps();
        });

        Schema::create('owned_dlc_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('snapshot_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('owned_dlc_id')->constrained()->cascadeOnDelete();
            $table->foreignId('library_game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('dlc_id')->constrained()->cascadeOnDelete();
            $table->string('acquisition_type');
            $table->decimal('base_price', 10, 2)->nullable();
            $table->decimal('purchased_price', 10, 2)->nullable();
            $table->date('purchased_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('owned_dlc_snapshots');
        Schema::dropIfExists('ownership_copy_snapshots');
        Schema::dropIfExists('snapshot_best_games');
        Schema::dropIfExists('library_game_snapshots');
        Schema::dropIfExists('snapshot_runs');
        Schema::dropIfExists('owned_dlcs');
        Schema::dropIfExists('dlcs');
        Schema::dropIfExists('ownership_copies');
        Schema::dropIfExists('physical_statuses');
        Schema::dropIfExists('platform_ownership_type');
        Schema::dropIfExists('ownership_types');
        Schema::dropIfExists('library_game_device');
        Schema::dropIfExists('library_games');
        Schema::dropIfExists('statuses');
        Schema::dropIfExists('platform_device');
        Schema::dropIfExists('devices');
        Schema::dropIfExists('platforms');
        Schema::dropIfExists('external_game_ids');
        Schema::dropIfExists('games');
        Schema::dropIfExists('provider_credentials');
        Schema::dropIfExists('providers');
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('currencies');
    }
};
