<?php

namespace App\Services\StupidLog;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class BackupDatabaseRestorer
{
    private array $namedIds = [];

    public function __construct(private BackupSnapshotRestorer $snapshotRestorer) {}

    public function restore(User $user, array $data, string $stagingDirectory): void
    {
        $newCoverPaths = [];
        $oldCoverPaths = [];
        $importId = (string) Str::uuid();

        try {
            DB::transaction(function () use (
                $user,
                $data,
                $stagingDirectory,
                $importId,
                &$newCoverPaths,
                &$oldCoverPaths,
            ): void {
                $oldCoverPaths = $this->deleteCurrentPortableData($user);
                $coverMap = $this->copyStagedCovers(
                    $data,
                    $stagingDirectory,
                    $importId,
                    $newCoverPaths,
                );
                $this->restoreGraph($user, $data, $coverMap);
            }, 3);
        } catch (Throwable $exception) {
            if ($newCoverPaths !== []) {
                Storage::disk('public')->delete($newCoverPaths);
            }
            throw $exception;
        }

        $obsoleteCoverPaths = array_values(array_diff($oldCoverPaths, $newCoverPaths));
        if ($obsoleteCoverPaths !== []) {
            Storage::disk('public')->delete($obsoleteCoverPaths);
        }
    }

    private function deleteCurrentPortableData(User $user): array
    {
        $libraryGames = DB::table('library_games')->where('user_id', $user->id)->get();
        $gameIds = $libraryGames->pluck('game_id')->unique()->values();
        $draftCoverPaths = DB::table('provider_import_drafts')
            ->where('user_id', $user->id)
            ->whereNotNull('cover_path')
            ->pluck('cover_path');

        DB::table('snapshot_runs')->where('user_id', $user->id)->delete();
        DB::table('subscription_entries')->where('user_id', $user->id)->delete();
        DB::table('library_games')->where('user_id', $user->id)->delete();
        DB::table('provider_import_drafts')->where('user_id', $user->id)->delete();

        $orphanGameIds = DB::table('games')
            ->whereIn('id', $gameIds)
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('library_games')
                    ->whereColumn('library_games.game_id', 'games.id');
            })
            ->pluck('id');

        $coverPaths = DB::table('games')
            ->whereIn('id', $orphanGameIds)
            ->whereNotNull('cover_path')
            ->pluck('cover_path')
            ->merge(
                DB::table('dlcs')
                    ->whereIn('game_id', $orphanGameIds)
                    ->whereNotNull('cover_path')
                    ->pluck('cover_path'),
            )
            ->merge($draftCoverPaths)
            ->filter()
            ->unique()
            ->values()
            ->all();

        DB::table('games')->whereIn('id', $orphanGameIds)->delete();

        return $coverPaths;
    }

    private function copyStagedCovers(
        array $data,
        string $stagingDirectory,
        string $importId,
        array &$newCoverPaths,
    ): array {
        $coverMap = [];

        foreach (['games', 'dlcs'] as $section) {
            foreach ($data[$section] as $row) {
                $archivePath = $row['archive_cover_path'] ?? null;
                if ($archivePath === null || isset($coverMap[$archivePath])) {
                    continue;
                }

                $relativePath = substr($archivePath, strlen('covers/'));
                $destination = "covers/imports/{$importId}/{$relativePath}";
                $source = Storage::disk('local')->readStream("{$stagingDirectory}/staged/{$archivePath}");
                if (! is_resource($source)) {
                    throw new RuntimeException("Unable to read staged cover {$archivePath}.");
                }

                try {
                    if (! Storage::disk('public')->writeStream($destination, $source)) {
                        throw new RuntimeException("Unable to restore cover {$archivePath}.");
                    }
                } finally {
                    fclose($source);
                }

                $coverMap[$archivePath] = $destination;
                $newCoverPaths[] = $destination;
            }
        }

        return $coverMap;
    }

    private function restoreGraph(User $user, array $data, array $coverMap): void
    {
        $user->update(['username' => $data['profile']['username']]);
        DB::table('app_settings')->updateOrInsert(
            ['user_id' => $user->id],
            [
                'currency_code' => $data['profile']['currency_code'],
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $gameIds = $this->restoreGames($data['games'], $coverMap);
        $this->restoreExternalIds($data['external_game_ids'], $gameIds);
        $libraryGameIds = $this->restoreLibraryGames($user, $data['library_games'], $gameIds);
        $this->restoreLibraryGameDevices($data['library_game_devices'], $libraryGameIds);
        $ownershipCopyIds = $this->restoreOwnershipCopies($data['ownership_copies'], $libraryGameIds);
        $dlcIds = $this->restoreDlcs($data['dlcs'], $gameIds, $coverMap);
        $ownedDlcIds = $this->restoreOwnedDlcs($data['owned_dlcs'], $libraryGameIds, $dlcIds);
        $snapshotIds = $this->restoreSnapshots($user, $data['snapshots']);
        $this->snapshotRestorer->restore(
            $data,
            $snapshotIds,
            $libraryGameIds,
            $gameIds,
            $ownershipCopyIds,
            $ownedDlcIds,
            $dlcIds,
        );
        $subscriptionIds = $this->restoreSubscriptions($user, $data['subscriptions']);
        $this->restoreSubscriptionCopies(
            $data['subscription_ownership_copies'],
            $subscriptionIds,
            $ownershipCopyIds,
        );
        $subscriptionYearIds = $this->restoreSubscriptionYears(
            $data['subscription_years'],
            $subscriptionIds,
            $snapshotIds,
        );
        $this->restoreSubscriptionYearAllocations(
            $data['subscription_year_allocations'],
            $subscriptionYearIds,
            $ownershipCopyIds,
        );
        $this->restoreInAppPurchases(
            $data['in_app_purchases'],
            $libraryGameIds,
            $snapshotIds,
        );
    }

    private function restoreGames(array $rows, array $coverMap): array
    {
        $ids = [];
        foreach ($rows as $row) {
            $ids[$row['ref']] = DB::table('games')->insertGetId([
                'title' => $row['title'],
                'normalized_title' => $row['normalized_title'],
                'cover_url_original' => $row['cover_url_original'],
                'cover_path' => $this->restoredCoverPath($row, $coverMap),
                'publisher' => $row['publisher'],
                'release_date' => $row['release_date'],
                'description' => $row['description'],
                'source_provider_id' => $this->providerId($row['source_provider_key']),
                'base_price_default' => $row['base_price_default'],
                'base_price_source' => $row['base_price_source'],
                'total_achievements' => $row['total_achievements'],
                'total_achievements_source' => $row['total_achievements_source'],
                'provider_synced_at' => $row['provider_synced_at'],
                ...$this->timestamps($row),
            ]);
        }

        return $ids;
    }

    private function restoreExternalIds(array $rows, array $gameIds): void
    {
        foreach ($rows as $row) {
            DB::table('external_game_ids')->insert([
                'game_id' => $gameIds[$row['game_ref']],
                'provider_id' => $this->providerId($row['provider_key']),
                'external_id' => $row['external_id'],
                'url' => $row['url'],
                ...$this->timestamps($row),
            ]);
        }
    }

    private function restoreLibraryGames(User $user, array $rows, array $gameIds): array
    {
        $ids = [];
        foreach ($rows as $row) {
            $ids[$row['ref']] = DB::table('library_games')->insertGetId([
                'user_id' => $user->id,
                'game_id' => $gameIds[$row['game_ref']],
                'platform_id' => $this->namedId('platforms', $row['platform']),
                'status_id' => $this->namedId('statuses', $row['status']),
                'playtime_hours' => $row['playtime_hours'],
                'earned_achievements' => $row['earned_achievements'],
                'first_played_at' => $row['first_played_at'],
                'last_played_at' => $row['last_played_at'],
                'completed_at' => $row['completed_at'],
                ...$this->timestamps($row),
            ]);
        }

        return $ids;
    }

    private function restoreLibraryGameDevices(array $rows, array $libraryGameIds): void
    {
        foreach ($rows as $row) {
            DB::table('library_game_device')->insert([
                'library_game_id' => $libraryGameIds[$row['library_game_ref']],
                'device_id' => $this->namedId('devices', $row['device']),
                ...$this->timestamps($row),
            ]);
        }
    }

    private function restoreOwnershipCopies(array $rows, array $libraryGameIds): array
    {
        $ids = [];
        foreach ($rows as $row) {
            $ids[$row['ref']] = DB::table('ownership_copies')->insertGetId([
                'library_game_id' => $libraryGameIds[$row['library_game_ref']],
                'ownership_type_id' => $this->namedId('ownership_types', $row['ownership_type']),
                'physical_status_id' => $row['physical_status']
                    ? $this->namedId('physical_statuses', $row['physical_status'])
                    : null,
                'edition_name' => $row['edition_name'],
                'base_price' => $row['base_price'],
                'purchased_price' => $row['purchased_price'],
                'purchased_at' => $row['purchased_at'],
                ...$this->timestamps($row),
            ]);
        }

        return $ids;
    }

    private function restoreDlcs(array $rows, array $gameIds, array $coverMap): array
    {
        $ids = [];
        foreach ($rows as $row) {
            $ids[$row['ref']] = DB::table('dlcs')->insertGetId([
                'game_id' => $gameIds[$row['game_ref']],
                'steam_app_id' => $row['steam_app_id'],
                'title' => $row['title'],
                'cover_url_original' => $row['cover_url_original'],
                'cover_path' => $this->restoredCoverPath($row, $coverMap),
                'base_price' => $row['base_price'],
                'source_provider_id' => $this->providerId($row['source_provider_key']),
                'synced_at' => $row['synced_at'],
                ...$this->timestamps($row),
            ]);
        }

        return $ids;
    }

    private function restoreOwnedDlcs(array $rows, array $libraryGameIds, array $dlcIds): array
    {
        $ids = [];
        foreach ($rows as $row) {
            $ids[$row['ref']] = DB::table('owned_dlcs')->insertGetId([
                'library_game_id' => $libraryGameIds[$row['library_game_ref']],
                'dlc_id' => $dlcIds[$row['dlc_ref']],
                'acquisition_type' => $row['acquisition_type'],
                'purchased_price' => $row['purchased_price'],
                'purchased_at' => $row['purchased_at'],
                ...$this->timestamps($row),
            ]);
        }

        return $ids;
    }

    private function restoreSnapshots(User $user, array $rows): array
    {
        $ids = [];
        foreach ($rows as $row) {
            $ids[$row['ref']] = DB::table('snapshot_runs')->insertGetId([
                'user_id' => $user->id,
                'year' => $row['year'],
                'status' => $row['status'],
                'confirmed_at' => $row['confirmed_at'],
                'summary_json' => $row['summary_json'] === null
                    ? null
                    : json_encode($row['summary_json'], JSON_THROW_ON_ERROR),
                ...$this->timestamps($row),
            ]);
        }

        return $ids;
    }

    private function restoreSubscriptions(User $user, array $rows): array
    {
        $ids = [];
        foreach ($rows as $row) {
            $ids[$row['ref']] = DB::table('subscription_entries')->insertGetId([
                'user_id' => $user->id,
                'ownership_type_id' => $this->namedId('ownership_types', $row['ownership_type']),
                'amount_paid' => $row['amount_paid'],
                'started_at' => $row['started_at'],
                'finished_at' => $row['finished_at'],
                ...$this->timestamps($row),
            ]);
        }

        return $ids;
    }

    private function restoreSubscriptionCopies(array $rows, array $subscriptionIds, array $copyIds): void
    {
        foreach ($rows as $row) {
            DB::table('subscription_entry_ownership_copies')->insert([
                'subscription_entry_id' => $subscriptionIds[$row['subscription_ref']],
                'ownership_copy_id' => $copyIds[$row['ownership_copy_ref']],
                ...$this->timestamps($row),
            ]);
        }
    }

    private function restoreSubscriptionYears(array $rows, array $subscriptionIds, array $snapshotIds): array
    {
        $ids = [];
        foreach ($rows as $row) {
            $ids[$row['ref']] = DB::table('subscription_entry_years')->insertGetId([
                'subscription_entry_id' => $subscriptionIds[$row['subscription_ref']],
                'year' => $row['year'],
                'amount_allocated' => $row['amount_allocated'],
                'is_locked' => $row['is_locked'],
                'locked_at' => $row['locked_at'],
                'locked_by_snapshot_run_id' => $row['locked_by_snapshot_ref']
                    ? $snapshotIds[$row['locked_by_snapshot_ref']]
                    : null,
                'locked_reason' => $row['locked_reason'],
                ...$this->timestamps($row),
            ]);
        }

        return $ids;
    }

    private function restoreSubscriptionYearAllocations(array $rows, array $yearIds, array $copyIds): void
    {
        foreach ($rows as $row) {
            DB::table('subscription_entry_year_ownership_copies')->insert([
                'subscription_entry_year_id' => $yearIds[$row['subscription_year_ref']],
                'ownership_copy_id' => $copyIds[$row['ownership_copy_ref']],
                'allocated_amount' => $row['allocated_amount'],
                ...$this->timestamps($row),
            ]);
        }
    }

    private function restoreInAppPurchases(array $rows, array $libraryGameIds, array $snapshotIds): void
    {
        foreach ($rows as $row) {
            DB::table('in_app_purchases')->insert([
                'library_game_id' => $libraryGameIds[$row['library_game_ref']],
                'title' => $row['title'],
                'amount_paid' => $row['amount_paid'],
                'purchased_at' => $row['purchased_at'],
                'is_locked' => $row['is_locked'],
                'locked_at' => $row['locked_at'],
                'locked_by_snapshot_run_id' => $row['locked_by_snapshot_ref']
                    ? $snapshotIds[$row['locked_by_snapshot_ref']]
                    : null,
                'locked_reason' => $row['locked_reason'],
                ...$this->timestamps($row),
            ]);
        }
    }

    private function restoredCoverPath(array $row, array $coverMap): ?string
    {
        $archivePath = $row['archive_cover_path'] ?? null;

        return $archivePath ? $coverMap[$archivePath] : null;
    }

    private function providerId(?string $key): ?int
    {
        return $key ? DB::table('providers')->where('key', $key)->value('id') : null;
    }

    private function namedId(string $table, string $name): int
    {
        $cacheKey = "{$table}:{$name}";
        if (! isset($this->namedIds[$cacheKey])) {
            $id = DB::table($table)->where('name', $name)->value('id');
            if (! $id) {
                throw new RuntimeException("Missing reference value {$name} in {$table}.");
            }
            $this->namedIds[$cacheKey] = (int) $id;
        }

        return $this->namedIds[$cacheKey];
    }

    private function timestamps(array $row): array
    {
        return [
            'created_at' => $row['created_at'] ?? now(),
            'updated_at' => $row['updated_at'] ?? now(),
        ];
    }
}
