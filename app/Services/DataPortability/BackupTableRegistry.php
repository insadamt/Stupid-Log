<?php

namespace App\Services\DataPortability;

final class BackupTableRegistry
{
    /**
     * @return list<BackupTableDefinition>
     */
    public function tables(): array
    {
        return [
            $this->table('currencies', 'currencies', 'data/reference/currencies.ndjson', ['id', 'code', 'created_at', 'updated_at']),
            $this->table('providers', 'providers', 'data/reference/providers.ndjson', ['id', 'key', 'name', 'created_at', 'updated_at']),
            $this->table('platforms', 'platforms', 'data/reference/platforms.ndjson', ['id', 'name', 'created_at', 'updated_at']),
            $this->table('devices', 'devices', 'data/reference/devices.ndjson', ['id', 'name', 'created_at', 'updated_at']),
            $this->table('statuses', 'statuses', 'data/reference/statuses.ndjson', ['id', 'name', 'color_key', 'color_hex', 'created_at', 'updated_at']),
            $this->table('ownership_types', 'ownership_types', 'data/reference/ownership_types.ndjson', ['id', 'name', 'is_subscription', 'created_at', 'updated_at']),
            $this->table('physical_statuses', 'physical_statuses', 'data/reference/physical_statuses.ndjson', ['id', 'name', 'created_at', 'updated_at']),
            $this->table('platform_devices', 'platform_device', 'data/reference/platform_devices.ndjson', ['id', 'platform_id', 'device_id', 'created_at', 'updated_at']),
            $this->table('platform_ownership_types', 'platform_ownership_type', 'data/reference/platform_ownership_types.ndjson', ['id', 'platform_id', 'ownership_type_id', 'created_at', 'updated_at']),

            $this->table('games', 'games', 'data/core/games.ndjson', ['id', 'title', 'normalized_title', 'cover_url_original', 'cover_path', 'publisher', 'release_date', 'description', 'source_provider_id', 'base_price_default', 'base_price_source', 'total_achievements', 'total_achievements_source', 'provider_synced_at', 'created_at', 'updated_at']),
            $this->table('external_game_ids', 'external_game_ids', 'data/core/external_game_ids.ndjson', ['id', 'game_id', 'provider_id', 'external_id', 'url', 'created_at', 'updated_at']),
            $this->table('library_games', 'library_games', 'data/core/library_games.ndjson', ['id', 'user_id', 'game_id', 'platform_id', 'status_id', 'playtime_hours', 'earned_achievements', 'first_played_at', 'last_played_at', 'completed_at', 'created_at', 'updated_at']),
            $this->table('library_game_devices', 'library_game_device', 'data/core/library_game_devices.ndjson', ['id', 'library_game_id', 'device_id', 'created_at', 'updated_at']),
            $this->table('ownership_copies', 'ownership_copies', 'data/core/ownership_copies.ndjson', ['id', 'library_game_id', 'ownership_type_id', 'physical_status_id', 'edition_name', 'base_price', 'purchased_price', 'purchased_at', 'created_at', 'updated_at']),
            $this->table('dlcs', 'dlcs', 'data/core/dlcs.ndjson', ['id', 'game_id', 'steam_app_id', 'title', 'cover_url_original', 'cover_path', 'base_price', 'source_provider_id', 'synced_at', 'created_at', 'updated_at']),
            $this->table('owned_dlcs', 'owned_dlcs', 'data/core/owned_dlcs.ndjson', ['id', 'library_game_id', 'dlc_id', 'acquisition_type', 'purchased_price', 'purchased_at', 'created_at', 'updated_at']),

            $this->table('subscription_entries', 'subscription_entries', 'data/finance/subscription_entries.ndjson', ['id', 'user_id', 'ownership_type_id', 'amount_paid', 'started_at', 'finished_at', 'created_at', 'updated_at']),
            $this->table('subscription_entry_ownership_copies', 'subscription_entry_ownership_copies', 'data/finance/subscription_entry_ownership_copies.ndjson', ['id', 'subscription_entry_id', 'ownership_copy_id', 'created_at', 'updated_at']),
            $this->table('subscription_entry_years', 'subscription_entry_years', 'data/finance/subscription_entry_years.ndjson', ['id', 'subscription_entry_id', 'year', 'amount_allocated', 'is_locked', 'locked_at', 'locked_by_snapshot_run_id', 'locked_reason', 'created_at', 'updated_at']),
            $this->table('subscription_entry_year_ownership_copies', 'subscription_entry_year_ownership_copies', 'data/finance/subscription_entry_year_ownership_copies.ndjson', ['id', 'subscription_entry_year_id', 'ownership_copy_id', 'allocated_amount', 'created_at', 'updated_at']),
            $this->table('in_app_purchases', 'in_app_purchases', 'data/finance/in_app_purchases.ndjson', ['id', 'library_game_id', 'title', 'amount_paid', 'purchased_at', 'is_locked', 'locked_at', 'locked_by_snapshot_run_id', 'locked_reason', 'created_at', 'updated_at']),

            $this->table('snapshot_runs', 'snapshot_runs', 'data/snapshots/snapshot_runs.ndjson', ['id', 'user_id', 'year', 'status', 'confirmed_at', 'summary_json', 'created_at', 'updated_at']),
            $this->partitionedTable('library_game_snapshots', 'library_game_snapshots', 'data/snapshots/library_game_snapshots', ['id', 'snapshot_run_id', 'library_game_id', 'game_id', 'platform_id', 'status_id', 'playtime_hours', 'earned_achievements', 'total_achievements', 'first_played_at', 'last_played_at', 'completed_at', 'created_at', 'updated_at']),
            $this->partitionedTable('ownership_copy_snapshots', 'ownership_copy_snapshots', 'data/snapshots/ownership_copy_snapshots', ['id', 'snapshot_run_id', 'ownership_copy_id', 'library_game_id', 'ownership_type_id', 'edition_name', 'base_price', 'purchased_price', 'purchased_at', 'created_at', 'updated_at']),
            $this->partitionedTable('owned_dlc_snapshots', 'owned_dlc_snapshots', 'data/snapshots/owned_dlc_snapshots', ['id', 'snapshot_run_id', 'owned_dlc_id', 'library_game_id', 'dlc_id', 'acquisition_type', 'base_price', 'purchased_price', 'purchased_at', 'created_at', 'updated_at']),
            $this->table('snapshot_best_games', 'snapshot_best_games', 'data/snapshots/snapshot_best_games.ndjson', ['id', 'snapshot_run_id', 'library_game_id', 'game_id', 'rank', 'note', 'created_at', 'updated_at']),
        ];
    }

    private function table(string $name, string $table, string $path, array $columns): BackupTableDefinition
    {
        return new BackupTableDefinition($name, $table, $path, $columns);
    }

    private function partitionedTable(string $name, string $table, string $path, array $columns): BackupTableDefinition
    {
        return new BackupTableDefinition($name, $table, $path, $columns, true);
    }
}
