<?php

namespace App\Services\StupidLog;

use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BackupDataBuilder
{
    private array $covers = [];

    public function build(User $user): array
    {
        $libraryGames = DB::table('library_games')
            ->where('user_id', $user->id)
            ->orderBy('id')
            ->get();
        $libraryGameIds = $libraryGames->pluck('id');
        $gameIds = $libraryGames->pluck('game_id')->unique()->values();
        $games = DB::table('games')->whereIn('id', $gameIds)->orderBy('id')->get();
        $dlcs = DB::table('dlcs')->whereIn('game_id', $gameIds)->orderBy('id')->get();
        $ownershipCopies = DB::table('ownership_copies')
            ->whereIn('library_game_id', $libraryGameIds)
            ->orderBy('id')
            ->get();
        $ownedDlcs = DB::table('owned_dlcs')
            ->whereIn('library_game_id', $libraryGameIds)
            ->orderBy('id')
            ->get();
        $snapshots = DB::table('snapshot_runs')
            ->where('user_id', $user->id)
            ->orderBy('id')
            ->get();
        $snapshotIds = $snapshots->pluck('id');
        $subscriptions = DB::table('subscription_entries')
            ->where('user_id', $user->id)
            ->orderBy('id')
            ->get();
        $subscriptionIds = $subscriptions->pluck('id');
        $subscriptionYears = DB::table('subscription_entry_years')
            ->whereIn('subscription_entry_id', $subscriptionIds)
            ->orderBy('id')
            ->get();

        $data = [
            'profile' => [
                'username' => $user->username,
                'currency_code' => $user->settings?->currency_code ?? 'USD',
            ],
            'games' => $games->map(fn ($row) => $this->game($row))->all(),
            'external_game_ids' => $this->externalGameIds($gameIds),
            'library_games' => $libraryGames->map(fn ($row) => $this->libraryGame($row))->all(),
            'library_game_devices' => $this->libraryGameDevices($libraryGameIds),
            'ownership_copies' => $ownershipCopies->map(fn ($row) => $this->ownershipCopy($row))->all(),
            'dlcs' => $dlcs->map(fn ($row) => $this->dlc($row))->all(),
            'owned_dlcs' => $ownedDlcs->map(fn ($row) => $this->ownedDlc($row))->all(),
            'in_app_purchases' => $this->inAppPurchases($libraryGameIds),
            'subscriptions' => $subscriptions->map(fn ($row) => $this->subscription($row))->all(),
            'subscription_ownership_copies' => $this->subscriptionOwnershipCopies($subscriptionIds),
            'subscription_years' => $subscriptionYears->map(fn ($row) => $this->subscriptionYear($row))->all(),
            'subscription_year_allocations' => $this->subscriptionYearAllocations($subscriptionYears->pluck('id')),
            'snapshots' => $snapshots->map(fn ($row) => $this->snapshot($row))->all(),
            'library_game_snapshots' => $this->libraryGameSnapshots($snapshotIds),
            'ownership_copy_snapshots' => $this->ownershipCopySnapshots($snapshotIds),
            'owned_dlc_snapshots' => $this->ownedDlcSnapshots($snapshotIds),
            'snapshot_best_games' => $this->snapshotBestGames($snapshotIds),
        ];

        return ['data' => $data, 'covers' => $this->covers];
    }

    private function game(object $row): array
    {
        return [
            'ref' => $this->ref('game', $row->id),
            'title' => $row->title,
            'normalized_title' => $row->normalized_title,
            'cover_url_original' => $row->cover_url_original,
            'local_cover_path' => $row->cover_path,
            'archive_cover_path' => $this->registerCover('games', $row->id, $row->cover_path),
            'publisher' => $row->publisher,
            'release_date' => $row->release_date,
            'description' => $row->description,
            'source_provider_key' => $this->providerKey($row->source_provider_id),
            'base_price_default' => $row->base_price_default,
            'base_price_source' => $row->base_price_source,
            'total_achievements' => $row->total_achievements,
            'total_achievements_source' => $row->total_achievements_source,
            'provider_synced_at' => $row->provider_synced_at,
            ...$this->timestamps($row),
        ];
    }

    private function libraryGame(object $row): array
    {
        return [
            'ref' => $this->ref('library_game', $row->id),
            'game_ref' => $this->ref('game', $row->game_id),
            'platform' => $this->namedValue('platforms', $row->platform_id),
            'status' => $this->namedValue('statuses', $row->status_id),
            'playtime_hours' => $row->playtime_hours,
            'earned_achievements' => $row->earned_achievements,
            'first_played_at' => $row->first_played_at,
            'last_played_at' => $row->last_played_at,
            'completed_at' => $row->completed_at,
            ...$this->timestamps($row),
        ];
    }

    private function ownershipCopy(object $row): array
    {
        return [
            'ref' => $this->ref('ownership_copy', $row->id),
            'library_game_ref' => $this->ref('library_game', $row->library_game_id),
            'ownership_type' => $this->namedValue('ownership_types', $row->ownership_type_id),
            'physical_status' => $row->physical_status_id
                ? $this->namedValue('physical_statuses', $row->physical_status_id)
                : null,
            'edition_name' => $row->edition_name,
            'base_price' => $row->base_price,
            'purchased_price' => $row->purchased_price,
            'purchased_at' => $row->purchased_at,
            ...$this->timestamps($row),
        ];
    }

    private function dlc(object $row): array
    {
        return [
            'ref' => $this->ref('dlc', $row->id),
            'game_ref' => $this->ref('game', $row->game_id),
            'steam_app_id' => $row->steam_app_id,
            'title' => $row->title,
            'cover_url_original' => $row->cover_url_original,
            'local_cover_path' => $row->cover_path,
            'archive_cover_path' => $this->registerCover('dlcs', $row->id, $row->cover_path),
            'base_price' => $row->base_price,
            'source_provider_key' => $this->providerKey($row->source_provider_id),
            'synced_at' => $row->synced_at,
            ...$this->timestamps($row),
        ];
    }

    private function ownedDlc(object $row): array
    {
        return [
            'ref' => $this->ref('owned_dlc', $row->id),
            'library_game_ref' => $this->ref('library_game', $row->library_game_id),
            'dlc_ref' => $this->ref('dlc', $row->dlc_id),
            'acquisition_type' => $row->acquisition_type,
            'purchased_price' => $row->purchased_price,
            'purchased_at' => $row->purchased_at,
            ...$this->timestamps($row),
        ];
    }

    private function subscription(object $row): array
    {
        return [
            'ref' => $this->ref('subscription', $row->id),
            'ownership_type' => $this->namedValue('ownership_types', $row->ownership_type_id),
            'amount_paid' => $row->amount_paid,
            'started_at' => $row->started_at,
            'finished_at' => $row->finished_at,
            ...$this->timestamps($row),
        ];
    }

    private function subscriptionYear(object $row): array
    {
        return [
            'ref' => $this->ref('subscription_year', $row->id),
            'subscription_ref' => $this->ref('subscription', $row->subscription_entry_id),
            'year' => $row->year,
            'amount_allocated' => $row->amount_allocated,
            'is_locked' => (bool) $row->is_locked,
            'locked_at' => $row->locked_at,
            'locked_by_snapshot_ref' => $row->locked_by_snapshot_run_id
                ? $this->ref('snapshot', $row->locked_by_snapshot_run_id)
                : null,
            'locked_reason' => $row->locked_reason,
            ...$this->timestamps($row),
        ];
    }

    private function snapshot(object $row): array
    {
        return [
            'ref' => $this->ref('snapshot', $row->id),
            'year' => $row->year,
            'status' => $row->status,
            'confirmed_at' => $row->confirmed_at,
            'summary_json' => $row->summary_json ? json_decode($row->summary_json, true) : null,
            ...$this->timestamps($row),
        ];
    }

    private function externalGameIds(Collection $gameIds): array
    {
        return DB::table('external_game_ids')->whereIn('game_id', $gameIds)->orderBy('id')->get()
            ->map(fn ($row) => [
                'game_ref' => $this->ref('game', $row->game_id),
                'provider_key' => $this->providerKey($row->provider_id),
                'external_id' => $row->external_id,
                'url' => $row->url,
                ...$this->timestamps($row),
            ])->all();
    }

    private function libraryGameDevices(Collection $libraryGameIds): array
    {
        return DB::table('library_game_device')->whereIn('library_game_id', $libraryGameIds)->orderBy('id')->get()
            ->map(fn ($row) => [
                'library_game_ref' => $this->ref('library_game', $row->library_game_id),
                'device' => $this->namedValue('devices', $row->device_id),
                ...$this->timestamps($row),
            ])->all();
    }

    private function inAppPurchases(Collection $libraryGameIds): array
    {
        return DB::table('in_app_purchases')->whereIn('library_game_id', $libraryGameIds)->orderBy('id')->get()
            ->map(fn ($row) => [
                'ref' => $this->ref('in_app_purchase', $row->id),
                'library_game_ref' => $this->ref('library_game', $row->library_game_id),
                'title' => $row->title,
                'amount_paid' => $row->amount_paid,
                'purchased_at' => $row->purchased_at,
                'is_locked' => (bool) $row->is_locked,
                'locked_at' => $row->locked_at,
                'locked_by_snapshot_ref' => $row->locked_by_snapshot_run_id
                    ? $this->ref('snapshot', $row->locked_by_snapshot_run_id)
                    : null,
                'locked_reason' => $row->locked_reason,
                ...$this->timestamps($row),
            ])->all();
    }

    private function subscriptionOwnershipCopies(Collection $subscriptionIds): array
    {
        return DB::table('subscription_entry_ownership_copies')
            ->whereIn('subscription_entry_id', $subscriptionIds)->orderBy('id')->get()
            ->map(fn ($row) => [
                'subscription_ref' => $this->ref('subscription', $row->subscription_entry_id),
                'ownership_copy_ref' => $this->ref('ownership_copy', $row->ownership_copy_id),
                ...$this->timestamps($row),
            ])->all();
    }

    private function subscriptionYearAllocations(Collection $yearIds): array
    {
        return DB::table('subscription_entry_year_ownership_copies')
            ->whereIn('subscription_entry_year_id', $yearIds)->orderBy('id')->get()
            ->map(fn ($row) => [
                'subscription_year_ref' => $this->ref('subscription_year', $row->subscription_entry_year_id),
                'ownership_copy_ref' => $this->ref('ownership_copy', $row->ownership_copy_id),
                'allocated_amount' => $row->allocated_amount,
                ...$this->timestamps($row),
            ])->all();
    }

    private function libraryGameSnapshots(Collection $snapshotIds): array
    {
        return DB::table('library_game_snapshots')->whereIn('snapshot_run_id', $snapshotIds)->orderBy('id')->get()
            ->map(fn ($row) => [
                'snapshot_ref' => $this->ref('snapshot', $row->snapshot_run_id),
                'library_game_ref' => $this->ref('library_game', $row->library_game_id),
                'game_ref' => $this->ref('game', $row->game_id),
                'platform' => $this->namedValue('platforms', $row->platform_id),
                'status' => $this->namedValue('statuses', $row->status_id),
                'playtime_hours' => $row->playtime_hours,
                'earned_achievements' => $row->earned_achievements,
                'total_achievements' => $row->total_achievements,
                'first_played_at' => $row->first_played_at,
                'last_played_at' => $row->last_played_at,
                'completed_at' => $row->completed_at,
                ...$this->timestamps($row),
            ])->all();
    }

    private function ownershipCopySnapshots(Collection $snapshotIds): array
    {
        return DB::table('ownership_copy_snapshots')->whereIn('snapshot_run_id', $snapshotIds)->orderBy('id')->get()
            ->map(fn ($row) => [
                'snapshot_ref' => $this->ref('snapshot', $row->snapshot_run_id),
                'ownership_copy_ref' => $this->ref('ownership_copy', $row->ownership_copy_id),
                'library_game_ref' => $this->ref('library_game', $row->library_game_id),
                'ownership_type' => $this->namedValue('ownership_types', $row->ownership_type_id),
                'edition_name' => $row->edition_name,
                'base_price' => $row->base_price,
                'purchased_price' => $row->purchased_price,
                'purchased_at' => $row->purchased_at,
                ...$this->timestamps($row),
            ])->all();
    }

    private function ownedDlcSnapshots(Collection $snapshotIds): array
    {
        return DB::table('owned_dlc_snapshots')->whereIn('snapshot_run_id', $snapshotIds)->orderBy('id')->get()
            ->map(fn ($row) => [
                'snapshot_ref' => $this->ref('snapshot', $row->snapshot_run_id),
                'owned_dlc_ref' => $this->ref('owned_dlc', $row->owned_dlc_id),
                'library_game_ref' => $this->ref('library_game', $row->library_game_id),
                'dlc_ref' => $this->ref('dlc', $row->dlc_id),
                'acquisition_type' => $row->acquisition_type,
                'base_price' => $row->base_price,
                'purchased_price' => $row->purchased_price,
                'purchased_at' => $row->purchased_at,
                ...$this->timestamps($row),
            ])->all();
    }

    private function snapshotBestGames(Collection $snapshotIds): array
    {
        return DB::table('snapshot_best_games')->whereIn('snapshot_run_id', $snapshotIds)->orderBy('id')->get()
            ->map(fn ($row) => [
                'snapshot_ref' => $this->ref('snapshot', $row->snapshot_run_id),
                'library_game_ref' => $this->ref('library_game', $row->library_game_id),
                'game_ref' => $this->ref('game', $row->game_id),
                'rank' => $row->rank,
                'note' => $row->note,
                ...$this->timestamps($row),
            ])->all();
    }

    private function registerCover(string $type, int $id, ?string $path): ?string
    {
        if (! $path || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        $extension = pathinfo($path, PATHINFO_EXTENSION);
        $archivePath = 'covers/'.$type.'/'.$id.($extension ? '.'.$extension : '');
        $this->covers[] = ['source_path' => $path, 'archive_path' => $archivePath];

        return $archivePath;
    }

    private function providerKey(?int $id): ?string
    {
        return $id ? DB::table('providers')->where('id', $id)->value('key') : null;
    }

    private function namedValue(string $table, int $id): string
    {
        return (string) DB::table($table)->where('id', $id)->value('name');
    }

    private function ref(string $type, int $id): string
    {
        return $type.':'.$id;
    }

    private function timestamps(object $row): array
    {
        return ['created_at' => $row->created_at, 'updated_at' => $row->updated_at];
    }
}
