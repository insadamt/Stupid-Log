<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\SnapshotRun;
use App\Models\StupidLog\Status;
use App\Models\StupidLog\SubscriptionEntry;
use App\Models\User;
use App\Services\StatsService;
use App\Services\SubscriptionYearAllocationService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class StatsFinancialValuesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_live_purchased_value_includes_copy_dlc_subscription_and_iap_components(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Complete Value Game', 'Xbox', 'Digital', 60, 20);
        $this->addOwnedDlc($copy->libraryGame, 30, 10);
        $this->addIap($copy->libraryGame, 5, '2026-06-01');
        $subscription = $this->createSubscription('Game Pass', 15);
        $subscription->ownershipCopies()->sync([$copy->id]);
        $this->generateYearlyAllocations($subscription);

        $stats = app(StatsService::class)->live($this->user);

        $this->assertSame(90.0, $stats['base_value']);
        $this->assertSame(50.0, $stats['purchased_value']);
        $this->assertSame(60.0, $stats['copy_base_value']);
        $this->assertSame(20.0, $stats['copy_purchased_value']);
        $this->assertSame(30.0, $stats['dlc_base_value']);
        $this->assertSame(10.0, $stats['dlc_purchased_value']);
        $this->assertSame(15.0, $stats['subscription_allocated_value']);
        $this->assertSame(0.0, $stats['subscription_unallocated_value']);
        $this->assertSame(15.0, $stats['subscription_total_value']);
        $this->assertSame(5.0, $stats['in_app_purchase_allocated_value']);
        $this->assertSame(0.0, $stats['in_app_purchase_unallocated_value']);
        $this->assertSame(5.0, $stats['in_app_purchase_total_value']);
        $this->assertSame(5.0, $stats['in_app_purchase_value']);
    }

    public function test_live_breakdowns_include_financial_components_under_platform_and_ownership_type(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Breakdown Game', 'Xbox', 'Game Pass');
        $this->addIap($copy->libraryGame, 6, '2026-06-01');
        $subscription = $this->createSubscription('Game Pass', 24);
        $subscription->ownershipCopies()->sync([$copy->id]);
        $this->generateYearlyAllocations($subscription);

        $stats = app(StatsService::class)->live($this->user);
        $platform = collect($stats['breakdowns']['platforms'])->firstWhere('label', 'Xbox');
        $ownership = collect($stats['breakdowns']['ownership_types'])->firstWhere('label', 'Game Pass');

        $this->assertSame(24.0, $platform['subscription_allocated_value']);
        $this->assertSame(6.0, $platform['in_app_purchase_value']);
        $this->assertSame(30.0, $platform['purchased_value']);
        $this->assertSame(24.0, $ownership['subscription_allocated_value']);
        $this->assertSame(24.0, $ownership['purchased_value']);
    }

    public function test_snapshot_stats_use_frozen_snapshot_mapping_for_financial_values(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Frozen Mapping Game', 'Xbox', 'Game Pass');
        $steam = Platform::where('name', 'Steam')->firstOrFail();
        $subscription = $this->createSubscription('Game Pass', 12);
        $subscription->ownershipCopies()->sync([$copy->id]);
        $this->generateYearlyAllocations($subscription);
        $this->addIap($copy->libraryGame, 8, '2026-06-01');
        $snapshot = $this->createSnapshotRun(2026);
        $this->insertSnapshotGame($snapshot, $copy->libraryGame, $steam->id);

        $summary = app(StatsService::class)->refreshSnapshotSummary($snapshot);
        $platform = collect($summary['breakdowns']['platforms'])->firstWhere('label', 'Steam');

        $this->assertSame(20.0, $summary['purchased_value']);
        $this->assertSame(12.0, $summary['subscription_allocated_value']);
        $this->assertSame(8.0, $summary['in_app_purchase_value']);
        $this->assertSame(20.0, $platform['purchased_value']);
        $this->assertSame(12.0, $platform['subscription_allocated_value']);
        $this->assertNull(collect($summary['breakdowns']['platforms'])->firstWhere('label', 'Xbox'));
    }

    public function test_archive_biggest_paid_price_uses_full_purchased_value_and_returns_components(): void
    {
        $directCopy = $this->createOwnershipCopy($this->user, 'Direct Paid Game', 'Steam', 'Digital', 60, 30);
        $subscriptionCopy = $this->createOwnershipCopy($this->user, 'Subscription Paid Game', 'Xbox', 'Game Pass');
        $this->addIap($subscriptionCopy->libraryGame, 6, '2026-06-01');
        $subscription = $this->createSubscription('Game Pass', 40);
        $subscription->ownershipCopies()->sync([$subscriptionCopy->id]);
        $this->generateYearlyAllocations($subscription);

        $archive = app(StatsService::class)->live($this->user)['archive']['biggest_paid_price'];

        $this->assertSame($subscriptionCopy->library_game_id, $archive[0]['library_game_id']);
        $this->assertSame(40.0, $archive[0]['subscription_allocated_value']);
        $this->assertSame(6.0, $archive[0]['in_app_purchase_value']);
        $this->assertSame(46.0, $archive[0]['purchased_value']);
        $this->assertSame(30.0, $archive[1]['purchased_value']);
        $this->assertSame($directCopy->library_game_id, $archive[1]['library_game_id']);
    }

    public function test_financial_component_fields_return_zero_without_subscription_or_iap(): void
    {
        $this->createOwnershipCopy($this->user, 'Zero Component Game', 'Steam', 'Digital', 20, 10);

        $stats = app(StatsService::class)->live($this->user);
        $platform = $stats['breakdowns']['platforms'][0];
        $ownership = $stats['breakdowns']['ownership_types'][0];
        $archive = $stats['archive']['biggest_paid_price'][0];

        $this->assertSame(0.0, $stats['subscription_allocated_value']);
        $this->assertSame(0.0, $stats['subscription_unallocated_value']);
        $this->assertSame(0.0, $stats['subscription_total_value']);
        $this->assertSame(0.0, $stats['in_app_purchase_allocated_value']);
        $this->assertSame(0.0, $stats['in_app_purchase_unallocated_value']);
        $this->assertSame(0.0, $stats['in_app_purchase_total_value']);
        $this->assertSame(0.0, $stats['in_app_purchase_value']);
        $this->assertSame(0.0, $platform['subscription_allocated_value']);
        $this->assertSame(0.0, $platform['in_app_purchase_value']);
        $this->assertSame(0.0, $ownership['subscription_allocated_value']);
        $this->assertSame(0.0, $archive['subscription_allocated_value']);
        $this->assertSame(0.0, $archive['in_app_purchase_value']);
    }

    public function test_unallocated_financial_value_is_explained_without_fake_game_rows(): void
    {
        $visibleCopy = $this->createOwnershipCopy($this->user, 'Visible Financial Game', 'Xbox', 'Game Pass');
        $hiddenCopy = $this->createOwnershipCopy($this->user, 'Hidden Financial Game', 'Xbox', 'Game Pass');
        $subscription = $this->createSubscription('Game Pass', 30);
        $subscription->ownershipCopies()->sync([$visibleCopy->id, $hiddenCopy->id]);
        $this->generateYearlyAllocations($subscription);
        $this->addIap($hiddenCopy->libraryGame, 9, '2026-06-01');
        $snapshot = $this->createSnapshotRun(2026);
        $this->insertSnapshotGame($snapshot, $visibleCopy->libraryGame, $visibleCopy->libraryGame->platform_id);

        $summary = app(StatsService::class)->refreshSnapshotSummary($snapshot);
        $unallocated = collect($summary['breakdowns']['platforms'])
            ->firstWhere('label', 'Unallocated financial');
        $ownership = collect($summary['breakdowns']['ownership_types'])
            ->firstWhere('label', 'Game Pass');

        $this->assertSame(15.0, $summary['subscription_allocated_value']);
        $this->assertSame(15.0, $summary['subscription_unallocated_value']);
        $this->assertSame(30.0, $summary['subscription_total_value']);
        $this->assertSame(0.0, $summary['in_app_purchase_allocated_value']);
        $this->assertSame(9.0, $summary['in_app_purchase_unallocated_value']);
        $this->assertSame(39.0, $summary['purchased_value']);
        $this->assertNull($unallocated['platform_id']);
        $this->assertSame(15.0, $unallocated['subscription_unallocated_value']);
        $this->assertSame(9.0, $unallocated['in_app_purchase_unallocated_value']);
        $this->assertSame(24.0, $unallocated['purchased_value']);
        $this->assertSame(15.0, $ownership['subscription_allocated_value']);
        $this->assertSame(15.0, $ownership['subscription_unallocated_value']);
        $this->assertSame(30.0, $ownership['subscription_total_value']);
        $this->assertSame(24.0, $summary['archive']['unallocated_financial']['total_unallocated_value']);
        $this->assertCount(1, $summary['archive']['biggest_paid_price']);
    }

    public function test_snapshot_financial_totals_are_cumulative_and_use_stored_year_values(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Cumulative Financial Game', 'Xbox', 'Game Pass');
        $subscription = SubscriptionEntry::create([
            'user_id' => $this->user->id,
            'ownership_type_id' => OwnershipType::where('name', 'Game Pass')->firstOrFail()->id,
            'amount_paid' => 32,
            'started_at' => '2025-12-12',
            'finished_at' => '2026-01-12',
        ]);
        $subscription->ownershipCopies()->sync([$copy->id]);
        $this->generateYearlyAllocations($subscription);
        $subscription->years()->where('year', 2025)->update([
            'amount_allocated' => '21.000000',
            'is_locked' => true,
        ]);
        $subscription->years()->where('year', 2025)->firstOrFail()
            ->ownershipCopyAllocations()
            ->update(['allocated_amount' => '21.000000']);
        $this->addIap($copy->libraryGame, 4, '2025-06-01');
        $this->addIap($copy->libraryGame, 6, '2026-06-01');
        $snapshot = $this->createSnapshotRun(2026);
        $this->insertSnapshotGame($snapshot, $copy->libraryGame, $copy->libraryGame->platform_id);

        $summary = app(StatsService::class)->refreshSnapshotSummary($snapshot);

        $this->assertSame(33.0, $summary['subscription_total_value']);
        $this->assertSame(10.0, $summary['in_app_purchase_total_value']);
        $this->assertSame(43.0, $summary['purchased_value']);
    }

    private function createOwnershipCopy(User $user, string $title, string $platformName, string $ownershipTypeName, float $basePrice = 0, float $paidPrice = 0): OwnershipCopy
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
            'base_price' => $basePrice,
            'purchased_price' => $paidPrice,
        ])->load('libraryGame.game');
    }

    private function createSubscription(string $ownershipTypeName, float $amount): SubscriptionEntry
    {
        return SubscriptionEntry::create([
            'user_id' => $this->user->id,
            'ownership_type_id' => OwnershipType::where('name', $ownershipTypeName)->firstOrFail()->id,
            'amount_paid' => $amount,
            'started_at' => '2026-01-01',
            'finished_at' => '2026-12-31',
        ]);
    }

    private function generateYearlyAllocations(SubscriptionEntry $subscription): void
    {
        app(SubscriptionYearAllocationService::class)
            ->synchronizeUnlockedYears($subscription->refresh());
    }

    private function addIap(LibraryGame $libraryGame, float $amount, string $purchasedAt): void
    {
        $libraryGame->inAppPurchases()->create([
            'title' => 'Currency Pack',
            'amount_paid' => $amount,
            'purchased_at' => $purchasedAt,
        ]);
    }

    private function addOwnedDlc(LibraryGame $libraryGame, float $basePrice, float $paidPrice): void
    {
        $dlc = Dlc::create([
            'game_id' => $libraryGame->game_id,
            'title' => 'Expansion',
            'base_price' => $basePrice,
        ]);

        $libraryGame->ownedDlcs()->create([
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Owned',
            'purchased_price' => $paidPrice,
        ]);
    }

    private function createSnapshotRun(int $year): SnapshotRun
    {
        return SnapshotRun::create([
            'user_id' => $this->user->id,
            'year' => $year,
            'status' => 'draft',
        ]);
    }

    private function insertSnapshotGame(SnapshotRun $snapshot, LibraryGame $libraryGame, int $platformId): void
    {
        DB::table('library_game_snapshots')->insert([
            'snapshot_run_id' => $snapshot->id,
            'library_game_id' => $libraryGame->id,
            'game_id' => $libraryGame->game_id,
            'platform_id' => $platformId,
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
