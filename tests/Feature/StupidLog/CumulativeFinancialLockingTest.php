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
use App\Services\SnapshotService;
use App\Services\SubscriptionYearAllocationService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CumulativeFinancialLockingTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_confirming_snapshot_locks_all_prior_financial_rows_and_deletes_older_drafts(): void
    {
        $copy = $this->createOwnershipCopy('Cumulative Lock Game');
        $subscription = $this->createSubscription($copy, 30, '2025-01-01', '2027-12-31');
        $iap2025 = $this->createIap($copy->libraryGame, 5, '2025-06-01');
        $iap2026 = $this->createIap($copy->libraryGame, 6, '2026-06-01');
        $iap2027 = $this->createIap($copy->libraryGame, 7, '2027-06-01');
        $snapshots = app(SnapshotService::class);
        $draft2025 = $snapshots->createDraft($this->user, 2025);
        $draft2026 = $snapshots->createDraft($this->user, 2026);
        $draft2027 = $snapshots->createDraft($this->user, 2027);

        $snapshots->confirm($draft2026);

        $year2025 = $subscription->years()->where('year', 2025)->firstOrFail();
        $year2026 = $subscription->years()->where('year', 2026)->firstOrFail();
        $year2027 = $subscription->years()->where('year', 2027)->firstOrFail();

        $this->assertTrue($year2025->is_locked);
        $this->assertTrue($year2026->is_locked);
        $this->assertFalse($year2027->is_locked);
        $this->assertSame($draft2026->id, $year2025->locked_by_snapshot_run_id);
        $this->assertSame($draft2026->id, $year2026->locked_by_snapshot_run_id);
        $this->assertTrue($iap2025->refresh()->is_locked);
        $this->assertTrue($iap2026->refresh()->is_locked);
        $this->assertFalse($iap2027->refresh()->is_locked);
        $this->assertDatabaseMissing('snapshot_runs', ['id' => $draft2025->id]);
        $this->assertDatabaseHas('snapshot_runs', ['id' => $draft2027->id, 'status' => 'draft']);
    }

    public function test_closed_year_blocks_iap_creation_and_moving_purchase_date_backward(): void
    {
        $copy = $this->createOwnershipCopy('Closed IAP Game');
        SnapshotRun::create([
            'user_id' => $this->user->id,
            'year' => 2025,
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);

        $this->post("/games/{$copy->library_game_id}/in-app-purchases", [
            'title' => 'Closed Pack',
            'amount_paid' => 5,
            'purchased_at' => '2025-06-01',
        ])->assertSessionHasErrors([
            'purchased_at' => '2025 and earlier are locked by confirmed snapshots.',
        ]);

        $purchase = $this->createIap($copy->libraryGame, 7, '2026-06-01');

        $this->patch("/in-app-purchases/{$purchase->id}", [
            'title' => 'Moved Pack',
            'amount_paid' => 7,
            'purchased_at' => '2025-12-31',
        ])->assertSessionHasErrors('purchased_at');
        $this->assertSame('2026-06-01', $purchase->refresh()->purchased_at->toDateString());
    }

    public function test_locked_iap_cannot_be_updated_or_deleted(): void
    {
        $copy = $this->createOwnershipCopy('Locked IAP Game');
        $purchase = $this->createIap($copy->libraryGame, 5, '2026-06-01');
        $purchase->update([
            'is_locked' => true,
            'locked_at' => now(),
            'locked_reason' => 'cumulative_snapshot',
        ]);

        $this->patch("/in-app-purchases/{$purchase->id}", [
            'title' => 'Changed Pack',
            'amount_paid' => 8,
            'purchased_at' => '2027-01-01',
        ])->assertSessionHasErrors('in_app_purchase');

        $this->delete("/in-app-purchases/{$purchase->id}")
            ->assertSessionHasErrors('in_app_purchase');
        $this->assertDatabaseHas('in_app_purchases', ['id' => $purchase->id]);
    }

    public function test_closed_snapshot_year_cannot_be_created_or_confirmed(): void
    {
        SnapshotRun::create([
            'user_id' => $this->user->id,
            'year' => 2026,
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);

        $this->post('/snapshots', ['year' => 2025])
            ->assertSessionHasErrors('year');

        $closedDraft = SnapshotRun::create([
            'user_id' => $this->user->id,
            'year' => 2025,
            'status' => 'draft',
        ]);

        $this->expectException(ValidationException::class);
        app(SnapshotService::class)->confirm($closedDraft);
    }

    public function test_deleting_confirmed_snapshot_reassigns_then_unlocks_financial_rows(): void
    {
        $copy = $this->createOwnershipCopy('Reassigned Lock Game');
        $subscription = $this->createSubscription($copy, 20, '2026-01-01', '2027-12-31');
        $iap = $this->createIap($copy->libraryGame, 5, '2026-06-01');
        $snapshots = app(SnapshotService::class);
        $snapshot2026 = $snapshots->createDraft($this->user, 2026);
        $snapshot2027 = $snapshots->createDraft($this->user, 2027);
        $snapshots->confirm($snapshot2026);
        $snapshots->confirm($snapshot2027);

        $year2026 = $subscription->years()->where('year', 2026)->firstOrFail();
        $this->assertSame($snapshot2026->id, $year2026->locked_by_snapshot_run_id);
        $this->assertSame($snapshot2026->id, $iap->refresh()->locked_by_snapshot_run_id);

        $this->delete("/snapshots/{$snapshot2026->id}")->assertRedirect('/snapshots');

        $this->assertSame($snapshot2027->id, $year2026->refresh()->locked_by_snapshot_run_id);
        $this->assertSame($snapshot2027->id, $iap->refresh()->locked_by_snapshot_run_id);
        $this->assertTrue($year2026->is_locked);

        $this->delete("/snapshots/{$snapshot2027->id}")->assertRedirect('/snapshots');

        $this->assertFalse($year2026->refresh()->is_locked);
        $this->assertNull($year2026->locked_by_snapshot_run_id);
        $this->assertFalse($iap->refresh()->is_locked);
        $this->assertNull($iap->locked_by_snapshot_run_id);
    }

    private function createSubscription(
        OwnershipCopy $copy,
        float $amount,
        string $startedAt,
        string $finishedAt,
    ): SubscriptionEntry {
        $subscription = SubscriptionEntry::create([
            'user_id' => $this->user->id,
            'ownership_type_id' => OwnershipType::where('name', 'Game Pass')->firstOrFail()->id,
            'amount_paid' => $amount,
            'started_at' => $startedAt,
            'finished_at' => $finishedAt,
        ]);
        $subscription->ownershipCopies()->sync([$copy->id]);
        app(SubscriptionYearAllocationService::class)->synchronizeUnlockedYears($subscription);

        return $subscription;
    }

    private function createIap(LibraryGame $libraryGame, float $amount, string $date)
    {
        return $libraryGame->inAppPurchases()->create([
            'title' => 'Currency Pack',
            'amount_paid' => $amount,
            'purchased_at' => $date,
        ]);
    }

    private function createOwnershipCopy(string $title): OwnershipCopy
    {
        $game = Game::create([
            'title' => $title,
            'normalized_title' => strtolower($title),
        ]);
        $libraryGame = LibraryGame::create([
            'user_id' => $this->user->id,
            'game_id' => $game->id,
            'platform_id' => Platform::where('name', 'Xbox')->firstOrFail()->id,
            'status_id' => Status::where('name', 'Not Played')->firstOrFail()->id,
            'playtime_hours' => 0,
        ]);

        return $libraryGame->ownershipCopies()->create([
            'ownership_type_id' => OwnershipType::where('name', 'Game Pass')->firstOrFail()->id,
        ])->load('libraryGame');
    }
}
