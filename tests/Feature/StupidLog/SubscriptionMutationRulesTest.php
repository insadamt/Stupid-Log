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
use App\Services\SubscriptionYearAllocationService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionMutationRulesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_subscription_routes_generate_and_regenerate_unlocked_years(): void
    {
        $copy = $this->createOwnershipCopy('Generated Allocation Game', 'Game Pass');
        $gamePass = OwnershipType::where('name', 'Game Pass')->firstOrFail();

        $this->post('/subscriptions', [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 32,
            'started_at' => '2025-12-12',
            'finished_at' => '2026-01-12',
        ])->assertRedirect();

        $subscription = SubscriptionEntry::firstOrFail();
        $this->patch("/subscriptions/{$subscription->id}/ownership-copies", [
            'ownership_copy_ids' => [$copy->id],
        ])->assertRedirect();

        $this->assertSame(
            ['20.000000', '12.000000'],
            $subscription->years()->orderBy('year')->pluck('amount_allocated')->all(),
        );
        $this->assertSame(
            [$copy->id],
            $subscription->years()->where('year', 2026)->firstOrFail()
                ->ownershipCopyAllocations()
                ->pluck('ownership_copy_id')
                ->all(),
        );

        $this->patch("/subscriptions/{$subscription->id}", [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 64,
            'started_at' => '2026-01-01',
            'finished_at' => '2027-12-31',
        ])->assertRedirect();

        $this->assertDatabaseMissing('subscription_entry_years', [
            'subscription_entry_id' => $subscription->id,
            'year' => 2025,
        ]);
        $this->assertEqualsCanonicalizing(
            [$copy->id],
            $subscription->years()->where('year', 2027)->firstOrFail()
                ->ownershipCopyAllocations()
                ->pluck('ownership_copy_id')
                ->all(),
        );
    }

    public function test_closed_year_rejects_subscription_creation_and_date_changes(): void
    {
        $gamePass = OwnershipType::where('name', 'Game Pass')->firstOrFail();
        SnapshotRun::create([
            'user_id' => $this->user->id,
            'year' => 2025,
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);

        $this->post('/subscriptions', [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 12,
            'started_at' => '2025-12-20',
            'finished_at' => '2026-01-20',
        ])->assertSessionHasErrors([
            'started_at' => '2025 and earlier are locked by confirmed snapshots.',
        ]);

        $subscription = $this->createSubscription(12, '2026-01-01', '2026-01-31');
        app(SubscriptionYearAllocationService::class)->synchronizeUnlockedYears($subscription);

        $this->patch("/subscriptions/{$subscription->id}", [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 12,
            'started_at' => '2025-12-20',
            'finished_at' => '2026-01-20',
        ])->assertSessionHasErrors('started_at');
    }

    public function test_locked_year_blocks_core_changes_and_subscription_deletion(): void
    {
        $subscription = $this->createSubscription(12, '2026-01-01', '2026-12-31');
        app(SubscriptionYearAllocationService::class)->synchronizeUnlockedYears($subscription);
        $subscription->years()->update(['is_locked' => true]);
        $gamePass = OwnershipType::where('name', 'Game Pass')->firstOrFail();

        $this->patch("/subscriptions/{$subscription->id}", [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 20,
            'started_at' => '2026-01-01',
            'finished_at' => '2026-12-31',
        ])->assertSessionHasErrors('subscription');

        $this->delete("/subscriptions/{$subscription->id}")
            ->assertSessionHasErrors('subscription');
        $this->assertDatabaseHas('subscription_entries', ['id' => $subscription->id]);
    }

    public function test_duplicate_copy_selection_is_rejected(): void
    {
        $copy = $this->createOwnershipCopy('Duplicate Selection Game', 'Game Pass');
        $subscription = $this->createSubscription(12, '2026-01-01', '2026-12-31');

        $this->patch("/subscriptions/{$subscription->id}/ownership-copies", [
            'ownership_copy_ids' => [$copy->id, $copy->id],
        ])->assertSessionHasErrors('ownership_copy_ids.0');
    }

    public function test_locked_copy_cannot_be_removed_but_unlocked_copy_can_be_removed(): void
    {
        $lockedCopy = $this->createOwnershipCopy('Locked Selected Game', 'Game Pass');
        $unlockedCopy = $this->createOwnershipCopy('Unlocked Selected Game', 'Game Pass');
        $subscription = $this->createSubscription(30, '2026-01-01', '2027-12-31');
        $subscription->ownershipCopies()->sync([$lockedCopy->id]);
        app(SubscriptionYearAllocationService::class)->synchronizeUnlockedYears($subscription);
        $subscription->years()->where('year', 2026)->update(['is_locked' => true]);

        $this->patch("/subscriptions/{$subscription->id}/ownership-copies", [
            'ownership_copy_ids' => [$lockedCopy->id, $unlockedCopy->id],
        ])->assertRedirect();

        $this->patch("/subscriptions/{$subscription->id}/ownership-copies", [
            'ownership_copy_ids' => [$unlockedCopy->id],
        ])->assertSessionHasErrors('ownership_copy_ids');

        $this->patch("/subscriptions/{$subscription->id}/ownership-copies", [
            'ownership_copy_ids' => [$lockedCopy->id],
        ])->assertRedirect();

        $year2027 = $subscription->years()->where('year', 2027)->firstOrFail();
        $this->assertSame(
            [$lockedCopy->id],
            $year2027->ownershipCopyAllocations()->pluck('ownership_copy_id')->all(),
        );
        $this->assertSame(
            $year2027->amount_allocated,
            $year2027->ownershipCopyAllocations()->firstOrFail()->allocated_amount,
        );
    }

    public function test_parent_deletions_cannot_remove_locked_financial_records(): void
    {
        $lockedCopy = $this->createOwnershipCopy('Locked Parent Game', 'Game Pass');
        $this->createAdditionalCopy($lockedCopy->libraryGame);
        $subscription = $this->createSubscription(12, '2026-01-01', '2026-12-31');
        $subscription->ownershipCopies()->sync([$lockedCopy->id]);
        app(SubscriptionYearAllocationService::class)->synchronizeUnlockedYears($subscription);
        $subscription->years()->update(['is_locked' => true]);

        $this->delete("/ownership-copies/{$lockedCopy->id}")
            ->assertSessionHasErrors('ownership_copy');
        $this->delete("/games/{$lockedCopy->library_game_id}")
            ->assertSessionHasErrors('library_game');

        $iapGameCopy = $this->createOwnershipCopy('Locked IAP Parent Game', 'Digital');
        $iapGameCopy->libraryGame->inAppPurchases()->create([
            'title' => 'Locked Pack',
            'amount_paid' => 5,
            'purchased_at' => '2026-06-01',
            'is_locked' => true,
        ]);

        $this->delete("/games/{$iapGameCopy->library_game_id}")
            ->assertSessionHasErrors('library_game');
    }

    public function test_unlocked_parent_deletions_recalculate_generated_allocations(): void
    {
        $deletableCopy = $this->createOwnershipCopy('Deletable Copy Game', 'Game Pass');
        $this->createAdditionalCopy($deletableCopy->libraryGame);
        $copySubscription = $this->createSubscription(12, '2026-01-01', '2026-12-31');
        $copySubscription->ownershipCopies()->sync([$deletableCopy->id]);
        app(SubscriptionYearAllocationService::class)->synchronizeUnlockedYears($copySubscription);

        $this->delete("/ownership-copies/{$deletableCopy->id}")->assertRedirect();

        $this->assertCount(
            0,
            $copySubscription->years()->firstOrFail()->ownershipCopyAllocations,
        );

        $deletedGameCopy = $this->createOwnershipCopy('Deleted Selected Game', 'Game Pass');
        $remainingCopy = $this->createOwnershipCopy('Remaining Selected Game', 'Game Pass');
        $gameSubscription = $this->createSubscription(30, '2027-01-01', '2027-12-31');
        $gameSubscription->ownershipCopies()->sync([$deletedGameCopy->id, $remainingCopy->id]);
        app(SubscriptionYearAllocationService::class)->synchronizeUnlockedYears($gameSubscription);

        $this->delete("/games/{$deletedGameCopy->library_game_id}")
            ->assertRedirect('/library');

        $remainingAllocation = $gameSubscription->years()
            ->firstOrFail()
            ->ownershipCopyAllocations()
            ->firstOrFail();
        $this->assertSame($remainingCopy->id, $remainingAllocation->ownership_copy_id);
        $this->assertSame('30.000000', $remainingAllocation->allocated_amount);
    }

    private function createSubscription(
        float $amount,
        string $startedAt,
        string $finishedAt,
    ): SubscriptionEntry {
        return SubscriptionEntry::create([
            'user_id' => $this->user->id,
            'ownership_type_id' => OwnershipType::where('name', 'Game Pass')->firstOrFail()->id,
            'amount_paid' => $amount,
            'started_at' => $startedAt,
            'finished_at' => $finishedAt,
        ]);
    }

    private function createOwnershipCopy(string $title, string $ownershipType): OwnershipCopy
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
            'ownership_type_id' => OwnershipType::where('name', $ownershipType)->firstOrFail()->id,
        ])->load('libraryGame');
    }

    private function createAdditionalCopy(LibraryGame $libraryGame): OwnershipCopy
    {
        return $libraryGame->ownershipCopies()->create([
            'ownership_type_id' => OwnershipType::where('name', 'Family Sharing')->firstOrFail()->id,
        ]);
    }
}
