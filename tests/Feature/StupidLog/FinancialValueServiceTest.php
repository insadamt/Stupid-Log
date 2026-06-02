<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Game;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\SnapshotRun;
use App\Models\StupidLog\Status;
use App\Models\StupidLog\SubscriptionEntry;
use App\Models\User;
use App\Services\FinancialPeriodService;
use App\Services\FinancialValueService;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FinancialValueServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_cross_year_proration_uses_inclusive_days(): void
    {
        $periods = app(FinancialPeriodService::class);
        [$start2025, $end2025] = $periods->periodBoundsForYear(2025);
        [$start2026, $end2026] = $periods->periodBoundsForYear(2026);

        $this->assertSame(32, $periods->inclusiveDays(CarbonImmutable::parse('2025-12-12'), CarbonImmutable::parse('2026-01-12')));
        $this->assertSame(20, $periods->overlapDays(CarbonImmutable::parse('2025-12-12'), CarbonImmutable::parse('2026-01-12'), $start2025, $end2025));
        $this->assertSame(12, $periods->overlapDays(CarbonImmutable::parse('2025-12-12'), CarbonImmutable::parse('2026-01-12'), $start2026, $end2026));
        $this->assertSame(20.0, round($periods->proratedAmount(32, '2025-12-12', '2026-01-12', $start2025, $end2025), 2));
        $this->assertSame(12.0, round($periods->proratedAmount(32, '2025-12-12', '2026-01-12', $start2026, $end2026), 2));
    }

    public function test_subscription_allocation_is_zero_when_no_selected_copy_exists(): void
    {
        $this->createSubscription('Game Pass', 30);

        $values = app(FinancialValueService::class)->calculateLiveFinancialValuesForUser($this->user);

        $this->assertSame(0.0, $values['subscription_allocated_value']);
        $this->assertSame(0.0, $values['in_app_purchase_value']);
    }

    public function test_live_subscription_allocation_uses_all_selected_copies(): void
    {
        $firstCopy = $this->createOwnershipCopy($this->user, 'First Game', 'Xbox', 'Game Pass');
        $secondCopy = $this->createOwnershipCopy($this->user, 'Second Game', 'Xbox', 'Game Pass');
        $subscription = $this->createSubscription('Game Pass', 30);
        $subscription->ownershipCopies()->sync([$firstCopy->id, $secondCopy->id]);

        $byGame = app(FinancialValueService::class)->calculateLiveFinancialValuesByLibraryGame($this->user);
        $totals = app(FinancialValueService::class)->calculateLiveFinancialValuesForUser($this->user);

        $this->assertSame(15.0, $byGame[$firstCopy->library_game_id]['subscription_allocated_value']);
        $this->assertSame(15.0, $byGame[$secondCopy->library_game_id]['subscription_allocated_value']);
        $this->assertSame(30.0, $totals['subscription_allocated_value']);
    }

    public function test_snapshot_subscription_allocation_uses_selected_copy_count_before_visibility_filtering(): void
    {
        $visibleCopy = $this->createOwnershipCopy($this->user, 'Visible Game', 'Xbox', 'Game Pass');
        $hiddenPcCopy = $this->createOwnershipCopy($this->user, 'Hidden PC Game', 'Steam', 'EA Play');
        $hiddenPlayStationCopy = $this->createOwnershipCopy($this->user, 'Hidden PlayStation Game', 'PS Network', 'PS Plus');
        $gamePass = OwnershipType::where('name', 'Game Pass')->firstOrFail();
        $hiddenPcCopy->update(['ownership_type_id' => $gamePass->id]);
        $hiddenPlayStationCopy->update(['ownership_type_id' => $gamePass->id]);
        $subscription = $this->createSubscription('Game Pass', 30);
        $subscription->ownershipCopies()->sync([$visibleCopy->id, $hiddenPcCopy->id, $hiddenPlayStationCopy->id]);
        $snapshot = $this->createSnapshotRun(2026);
        $this->insertSnapshotGame($snapshot, $visibleCopy->libraryGame);

        $service = app(FinancialValueService::class);
        $totals = $service->calculateSnapshotFinancialValuesForRun($snapshot);
        $byPlatform = $service->calculateSnapshotFinancialValuesByPlatform($snapshot);
        $byGame = $service->calculateSnapshotFinancialValuesByLibraryGame($snapshot);

        $this->assertSame(10.0, $totals['subscription_allocated_value']);
        $this->assertNotSame(30.0, $totals['subscription_allocated_value']);
        $this->assertSame(10.0, $byPlatform[$visibleCopy->libraryGame->platform_id]['subscription_allocated_value']);
        $this->assertSame(10.0, $byGame[$visibleCopy->library_game_id]['subscription_allocated_value']);
        $this->assertArrayNotHasKey($hiddenPcCopy->library_game_id, $byGame);
        $this->assertArrayNotHasKey($hiddenPlayStationCopy->library_game_id, $byGame);
    }

    public function test_snapshot_excludes_iap_when_library_game_is_not_in_snapshot(): void
    {
        $visibleCopy = $this->createOwnershipCopy($this->user, 'Visible IAP Game', 'Xbox', 'Game Pass');
        $hiddenCopy = $this->createOwnershipCopy($this->user, 'Hidden IAP Game', 'Xbox', 'Game Pass');
        $visibleCopy->libraryGame->inAppPurchases()->create([
            'title' => 'Visible Pack',
            'amount_paid' => 5,
            'purchased_at' => '2026-06-01',
        ]);
        $hiddenCopy->libraryGame->inAppPurchases()->create([
            'title' => 'Hidden Pack',
            'amount_paid' => 50,
            'purchased_at' => '2026-06-01',
        ]);
        $snapshot = $this->createSnapshotRun(2026);
        $this->insertSnapshotGame($snapshot, $visibleCopy->libraryGame);

        $values = app(FinancialValueService::class)->calculateSnapshotFinancialValuesForRun($snapshot);

        $this->assertSame(5.0, $values['in_app_purchase_value']);
    }

    public function test_cross_year_subscription_proration_rounds_after_aggregation(): void
    {
        $firstCopy = $this->createOwnershipCopy($this->user, 'First Prorated Game', 'Xbox', 'Game Pass');
        $secondCopy = $this->createOwnershipCopy($this->user, 'Second Prorated Game', 'Xbox', 'Game Pass');
        $subscription = $this->createSubscription('Game Pass', 10, '2026-01-01', '2026-01-01');
        $subscription->ownershipCopies()->sync([$firstCopy->id, $secondCopy->id]);

        $values = app(FinancialValueService::class)->calculateLiveFinancialValuesForUser($this->user);

        $this->assertSame(10.0, $values['subscription_allocated_value']);
    }

    private function createSubscription(string $ownershipTypeName, float $amount, string $startedAt = '2026-01-01', string $finishedAt = '2026-01-31'): SubscriptionEntry
    {
        return SubscriptionEntry::create([
            'user_id' => $this->user->id,
            'ownership_type_id' => OwnershipType::where('name', $ownershipTypeName)->firstOrFail()->id,
            'amount_paid' => $amount,
            'started_at' => $startedAt,
            'finished_at' => $finishedAt,
        ]);
    }

    private function createOwnershipCopy(User $user, string $title, string $platformName, string $ownershipTypeName): OwnershipCopy
    {
        $game = Game::create([
            'title' => $title,
            'normalized_title' => strtolower($title),
        ]);
        $libraryGame = LibraryGame::create([
            'user_id' => $user->id,
            'game_id' => $game->id,
            'platform_id' => Platform::where('name', $platformName)->firstOrFail()->id,
            'status_id' => Status::where('name', 'Not Played')->firstOrFail()->id,
            'playtime_hours' => 0,
        ]);

        return $libraryGame->ownershipCopies()->create([
            'ownership_type_id' => OwnershipType::where('name', $ownershipTypeName)->firstOrFail()->id,
        ])->load('libraryGame');
    }

    private function createSnapshotRun(int $year): SnapshotRun
    {
        return SnapshotRun::create([
            'user_id' => $this->user->id,
            'year' => $year,
            'status' => 'draft',
        ]);
    }

    private function insertSnapshotGame(SnapshotRun $snapshot, LibraryGame $libraryGame): void
    {
        DB::table('library_game_snapshots')->insert([
            'snapshot_run_id' => $snapshot->id,
            'library_game_id' => $libraryGame->id,
            'game_id' => $libraryGame->game_id,
            'platform_id' => $libraryGame->platform_id,
            'status_id' => $libraryGame->status_id,
            'playtime_hours' => $libraryGame->playtime_hours,
            'earned_achievements' => $libraryGame->earned_achievements,
            'total_achievements' => $libraryGame->game->total_achievements,
            'first_played_at' => $libraryGame->first_played_at,
            'last_played_at' => $libraryGame->last_played_at,
            'completed_at' => $libraryGame->completed_at,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
