<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Game;
use App\Models\StupidLog\InAppPurchase;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\SnapshotRun;
use App\Models\StupidLog\Status;
use App\Models\StupidLog\SubscriptionEntry;
use App\Models\StupidLog\SubscriptionEntryYear;
use App\Services\LegacyFinancialYearBackfillService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class YearlyFinancialSchemaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
    }

    public function test_yearly_financial_schema_and_model_casts_are_available(): void
    {
        $this->assertTrue(Schema::hasColumns('subscription_entry_years', [
            'subscription_entry_id',
            'year',
            'amount_allocated',
            'is_locked',
            'locked_at',
            'locked_by_snapshot_run_id',
            'locked_reason',
        ]));
        $this->assertTrue(Schema::hasColumns('subscription_entry_year_ownership_copies', [
            'subscription_entry_year_id',
            'ownership_copy_id',
            'allocated_amount',
        ]));
        $this->assertTrue(Schema::hasColumns('in_app_purchases', [
            'is_locked',
            'locked_at',
            'locked_by_snapshot_run_id',
            'locked_reason',
        ]));

        $year = new SubscriptionEntryYear([
            'year' => 2026,
            'amount_allocated' => '12.123456',
            'is_locked' => true,
        ]);
        $purchase = new InAppPurchase(['is_locked' => true]);

        $this->assertSame(2026, $year->year);
        $this->assertSame('12.123456', $year->amount_allocated);
        $this->assertTrue($year->is_locked);
        $this->assertTrue($purchase->is_locked);
    }

    public function test_legacy_backfill_generates_years_copy_allocations_and_cumulative_locks(): void
    {
        $user = \App\Models\User::firstOrFail();
        [$firstCopy, $secondCopy] = $this->createSubscriptionCopies();
        $subscription = SubscriptionEntry::create([
            'user_id' => $user->id,
            'ownership_type_id' => OwnershipType::where('name', 'Game Pass')->firstOrFail()->id,
            'amount_paid' => 32,
            'started_at' => '2025-12-12',
            'finished_at' => '2026-01-12',
        ]);
        $subscription->ownershipCopies()->sync([$firstCopy->id, $secondCopy->id]);
        $iap = $firstCopy->libraryGame->inAppPurchases()->create([
            'title' => 'Legacy Pack',
            'amount_paid' => 7,
            'purchased_at' => '2024-06-01',
        ]);
        $snapshot2025 = $this->createSnapshot($user->id, 2025, 'confirmed');
        $snapshot2026 = $this->createSnapshot($user->id, 2026, 'confirmed');
        $obsoleteDraft = $this->createSnapshot($user->id, 2025, 'draft');

        app(LegacyFinancialYearBackfillService::class)->run();

        $year2025 = $subscription->years()->where('year', 2025)->firstOrFail();
        $year2026 = $subscription->years()->where('year', 2026)->firstOrFail();

        $this->assertSame('20.000000', $year2025->amount_allocated);
        $this->assertSame('12.000000', $year2026->amount_allocated);
        $this->assertTrue($year2025->is_locked);
        $this->assertTrue($year2026->is_locked);
        $this->assertSame($snapshot2025->id, $year2025->locked_by_snapshot_run_id);
        $this->assertSame($snapshot2026->id, $year2026->locked_by_snapshot_run_id);
        $this->assertSame('cumulative_snapshot', $year2025->locked_reason);
        $this->assertEqualsCanonicalizing(
            ['10.000000', '10.000000'],
            $year2025->ownershipCopyAllocations()->pluck('allocated_amount')->all(),
        );
        $this->assertEqualsCanonicalizing(
            ['6.000000', '6.000000'],
            $year2026->ownershipCopyAllocations()->pluck('allocated_amount')->all(),
        );

        $iap->refresh();
        $this->assertTrue($iap->is_locked);
        $this->assertSame($snapshot2025->id, $iap->locked_by_snapshot_run_id);
        $this->assertDatabaseMissing('snapshot_runs', ['id' => $obsoleteDraft->id]);
        $this->assertNull($snapshot2025->refresh()->summary_json);
        $this->assertNull($snapshot2026->refresh()->summary_json);
    }

    public function test_subscription_year_is_unique_per_subscription_and_year(): void
    {
        $subscription = $this->createSubscription();
        $subscription->years()->create([
            'year' => 2026,
            'amount_allocated' => '10.000000',
        ]);

        $this->expectException(QueryException::class);

        $subscription->years()->create([
            'year' => 2026,
            'amount_allocated' => '20.000000',
        ]);
    }

    public function test_ownership_copy_is_unique_per_subscription_year(): void
    {
        [$copy] = $this->createSubscriptionCopies();
        $year = $this->createSubscription()->years()->create([
            'year' => 2026,
            'amount_allocated' => '10.000000',
        ]);
        $year->ownershipCopyAllocations()->create([
            'ownership_copy_id' => $copy->id,
            'allocated_amount' => '10.000000',
        ]);

        $this->expectException(QueryException::class);

        $year->ownershipCopyAllocations()->create([
            'ownership_copy_id' => $copy->id,
            'allocated_amount' => '10.000000',
        ]);
    }

    private function createSubscription(): SubscriptionEntry
    {
        return SubscriptionEntry::create([
            'user_id' => \App\Models\User::firstOrFail()->id,
            'ownership_type_id' => OwnershipType::where('name', 'Game Pass')->firstOrFail()->id,
            'amount_paid' => 10,
            'started_at' => '2026-01-01',
            'finished_at' => '2026-12-31',
        ]);
    }

    private function createSubscriptionCopies(): array
    {
        return [
            $this->createOwnershipCopy('First Legacy Game'),
            $this->createOwnershipCopy('Second Legacy Game'),
        ];
    }

    private function createOwnershipCopy(string $title): OwnershipCopy
    {
        $game = Game::create([
            'title' => $title,
            'normalized_title' => strtolower($title),
        ]);
        $libraryGame = LibraryGame::create([
            'user_id' => \App\Models\User::firstOrFail()->id,
            'game_id' => $game->id,
            'platform_id' => Platform::where('name', 'Xbox')->firstOrFail()->id,
            'status_id' => Status::where('name', 'Not Played')->firstOrFail()->id,
            'playtime_hours' => 0,
        ]);

        return $libraryGame->ownershipCopies()->create([
            'ownership_type_id' => OwnershipType::where('name', 'Game Pass')->firstOrFail()->id,
        ])->load('libraryGame');
    }

    private function createSnapshot(int $userId, int $year, string $status): SnapshotRun
    {
        return SnapshotRun::create([
            'user_id' => $userId,
            'year' => $year,
            'status' => $status,
            'confirmed_at' => $status === 'confirmed' ? now() : null,
            'summary_json' => ['purchased_value' => 99],
        ]);
    }
}
