<?php

use App\Models\StupidLog\AppSetting;
use App\Models\StupidLog\Currency;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\SnapshotRun;
use App\Models\StupidLog\Status;
use App\Models\User;
use App\Services\ProviderImportDraftService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('stupid-log:cleanup-provider-import-drafts', function (ProviderImportDraftService $drafts) {
    $count = $drafts->cleanupExpired();
    $this->info("Deleted {$count} expired provider import draft(s).");

    return 0;
})->purpose('Delete expired unconsumed provider import drafts and temporary covers');

Artisan::command('stupid-log:stress-seed
    {--games=10000 : Number of library games to create}
    {--snapshots=1000 : Number of snapshot runs to create}
    {--snapshot-rows=300 : Captured game rows per generated snapshot}
    {--cleanup : Remove generated stress data instead of creating it}
    {--force : Allow running outside local/testing}', function () {
        if (! app()->environment(['local', 'testing']) && ! $this->option('force')) {
            $this->error('Refusing to run outside local/testing. Pass --force only if this is intentional.');

            return 1;
        }

        $prefix = '[Stress Load]';

        if ($this->option('cleanup')) {
            $this->info('Removing stress seed data...');

            DB::transaction(function () use ($prefix) {
                $stressGameIds = DB::table('games')
                    ->where('title', 'like', "{$prefix}%")
                    ->pluck('id');

                $stressLibraryGameIds = DB::table('library_games')
                    ->whereIn('game_id', $stressGameIds)
                    ->pluck('id');

                SnapshotRun::query()
                    ->where('summary_json', 'like', '%"stress_seed":true%')
                    ->delete();

                DB::table('owned_dlcs')->whereIn('library_game_id', $stressLibraryGameIds)->delete();
                DB::table('ownership_copies')->whereIn('library_game_id', $stressLibraryGameIds)->delete();
                DB::table('library_game_device')->whereIn('library_game_id', $stressLibraryGameIds)->delete();
                DB::table('library_games')->whereIn('id', $stressLibraryGameIds)->delete();
                DB::table('games')->whereIn('id', $stressGameIds)->delete();
            });

            $this->info('Stress seed data removed.');

            return 0;
        }

        $gamesTarget = max(1, (int) $this->option('games'));
        $snapshotsTarget = max(0, (int) $this->option('snapshots'));
        $snapshotRowsTarget = max(0, (int) $this->option('snapshot-rows'));
        $user = User::first() ?? User::create(['username' => 'Player One', 'avatar_path' => null]);
        $currency = Currency::first()?->code ?? 'USD';

        AppSetting::updateOrCreate(['user_id' => $user->id], ['currency_code' => $currency]);

        $platformIds = Platform::orderBy('id')->pluck('id')->values();
        $statusIds = Status::orderBy('id')->pluck('id')->values();
        $statusNames = Status::pluck('name', 'id');
        $ownershipTypeId = OwnershipType::where('name', 'Digital')->value('id') ?? OwnershipType::firstOrFail()->id;
        $deviceIdsByPlatform = DB::table('platform_device')
            ->select('platform_id', 'device_id')
            ->get()
            ->groupBy('platform_id')
            ->map(fn ($rows) => $rows->pluck('device_id')->values());

        if ($platformIds->isEmpty() || $statusIds->isEmpty()) {
            $this->error('Run the reference seeders before stress seeding.');

            return 1;
        }

        $existingStressGames = DB::table('games')
            ->where('title', 'like', "{$prefix}%")
            ->count();
        $remainingGames = max(0, $gamesTarget - $existingStressGames);

        $this->info("Creating {$remainingGames} stress games...");
        $bar = $this->output->createProgressBar($remainingGames);
        $bar->start();

        $createdLibraryGameIds = collect();
        $start = $existingStressGames + 1;
        $timestamp = now();

        for ($chunkStart = $start; $chunkStart <= $start + $remainingGames - 1; $chunkStart += 500) {
            $chunkEnd = min($chunkStart + 499, $start + $remainingGames - 1);
            $gameRows = [];

            for ($i = $chunkStart; $i <= $chunkEnd; $i++) {
                $gameRows[] = [
                    'title' => "{$prefix} Game ".str_pad((string) $i, 5, '0', STR_PAD_LEFT),
                    'normalized_title' => Str::slug("stress load game {$i}", ' '),
                    'cover_url_original' => null,
                    'cover_path' => null,
                    'publisher' => 'Stress Studio '.(($i % 25) + 1),
                    'release_date' => null,
                    'description' => 'Generated local stress-test row.',
                    'source_provider_id' => null,
                    'base_price_default' => ($i % 9 + 1) * 5,
                    'base_price_source' => null,
                    'total_achievements' => ($i % 70) + 5,
                    'total_achievements_source' => null,
                    'provider_synced_at' => null,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }

            DB::table('games')->insert($gameRows);

            $insertedGames = DB::table('games')
                ->where('title', 'like', "{$prefix}%")
                ->orderByDesc('id')
                ->take(count($gameRows))
                ->get()
                ->sortBy('id')
                ->values();

            $libraryRows = [];
            foreach ($insertedGames as $index => $game) {
                $i = $chunkStart + $index;
                $platformId = $platformIds[($i - 1) % $platformIds->count()];
                $statusId = $statusIds[($i - 1) % $statusIds->count()];
                $statusName = $statusNames[$statusId] ?? 'Not Played';
                $totalAchievements = (int) $game->total_achievements;
                $earnedAchievements = min($totalAchievements, $i % ($totalAchievements + 1));
                $completed = in_array($statusName, ['Completed', '100%'], true);

                $libraryRows[] = [
                    'user_id' => $user->id,
                    'game_id' => $game->id,
                    'platform_id' => $platformId,
                    'status_id' => $statusId,
                    'playtime_hours' => round(($i % 240) + (($i % 10) / 10), 1),
                    'earned_achievements' => $statusName === '100%' ? $totalAchievements : $earnedAchievements,
                    'first_played_at' => $i % 3 === 0 ? now()->subDays($i % 1500)->format('Y-m-d') : null,
                    'last_played_at' => $i % 4 === 0 ? now()->subDays($i % 365)->format('Y-m-d') : null,
                    'completed_at' => $completed ? now()->subDays($i % 1200)->format('Y-m-d') : null,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }

            DB::table('library_games')->insert($libraryRows);

            $libraryGames = DB::table('library_games')
                ->where('user_id', $user->id)
                ->whereIn('game_id', $insertedGames->pluck('id'))
                ->get();

            $copyRows = [];
            $deviceRows = [];
            foreach ($libraryGames as $libraryGame) {
                $createdLibraryGameIds->push((int) $libraryGame->id);
                $copyRows[] = [
                    'library_game_id' => $libraryGame->id,
                    'ownership_type_id' => $ownershipTypeId,
                    'physical_status_id' => null,
                    'edition_name' => null,
                    'base_price' => ($libraryGame->id % 9 + 1) * 5,
                    'purchased_price' => ($libraryGame->id % 7 + 1) * 3,
                    'purchased_at' => now()->subDays($libraryGame->id % 2000)->format('Y-m-d'),
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];

                $platformDeviceIds = $deviceIdsByPlatform->get($libraryGame->platform_id, collect());
                if ($platformDeviceIds->isNotEmpty()) {
                    $deviceRows[] = [
                        'library_game_id' => $libraryGame->id,
                        'device_id' => $platformDeviceIds[0],
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ];
                }
            }

            if ($copyRows) {
                DB::table('ownership_copies')->insert($copyRows);
            }

            if ($deviceRows) {
                DB::table('library_game_device')->insert($deviceRows);
            }

            $bar->advance(count($gameRows));
        }

        $bar->finish();
        $this->newLine();

        $allStressLibraryGames = DB::table('library_games')
            ->join('games', 'games.id', '=', 'library_games.game_id')
            ->where('library_games.user_id', $user->id)
            ->where('games.title', 'like', "{$prefix}%")
            ->select('library_games.*', 'games.total_achievements')
            ->orderBy('library_games.id')
            ->get();

        $this->info("Creating {$snapshotsTarget} stress snapshots with {$snapshotRowsTarget} rows each...");
        $bar = $this->output->createProgressBar($snapshotsTarget);
        $bar->start();

        for ($snapshotIndex = 1; $snapshotIndex <= $snapshotsTarget; $snapshotIndex++) {
            $snapshot = SnapshotRun::create([
                'user_id' => $user->id,
                'year' => 1970 + ($snapshotIndex % 131),
                'status' => 'draft',
                'summary_json' => [
                    'stress_seed' => true,
                    'unique_titles' => min($snapshotRowsTarget, $allStressLibraryGames->count()),
                    'library_games' => min($snapshotRowsTarget, $allStressLibraryGames->count()),
                    'ownership_copies' => min($snapshotRowsTarget, $allStressLibraryGames->count()),
                    'owned_dlcs' => 0,
                    'completed' => 0,
                    'hundred_percent' => 0,
                    'playtime_hours' => 0,
                    'earned_achievements' => 0,
                    'total_achievements' => 0,
                    'achievement_progress' => 0,
                    'base_value' => 0,
                    'purchased_value' => 0,
                    'breakdowns' => ['platforms' => [], 'statuses' => [], 'ownership_types' => []],
                    'archive' => ['most_played' => [], 'biggest_base_price' => [], 'biggest_paid_price' => []],
                    'best_games' => [],
                    'growth' => [],
                ],
            ]);

            $rows = [];
            $sample = $allStressLibraryGames
                ->slice((($snapshotIndex - 1) * max(1, $snapshotRowsTarget)) % max(1, $allStressLibraryGames->count()))
                ->take($snapshotRowsTarget);

            if ($sample->count() < $snapshotRowsTarget) {
                $sample = $sample->concat($allStressLibraryGames->take($snapshotRowsTarget - $sample->count()));
            }

            foreach ($sample as $libraryGame) {
                $rows[] = [
                    'snapshot_run_id' => $snapshot->id,
                    'library_game_id' => $libraryGame->id,
                    'game_id' => $libraryGame->game_id,
                    'platform_id' => $libraryGame->platform_id,
                    'status_id' => $libraryGame->status_id,
                    'playtime_hours' => $libraryGame->playtime_hours,
                    'earned_achievements' => $libraryGame->earned_achievements,
                    'total_achievements' => $libraryGame->total_achievements,
                    'first_played_at' => $libraryGame->first_played_at,
                    'last_played_at' => $libraryGame->last_played_at,
                    'completed_at' => $libraryGame->completed_at,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ];
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('library_game_snapshots')->insert($chunk);
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Stress seed complete.');
        $this->line('Cleanup later with: php artisan stupid-log:stress-seed --cleanup');

        return 0;
    })->purpose('Create removable local-only stress data for large-library performance testing');
