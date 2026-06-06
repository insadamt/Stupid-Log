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
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class FinancialSnapshotRefreshTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_creating_updating_and_deleting_iap_refreshes_affected_snapshot_summaries(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'IAP Snapshot Game', 'Steam', 'Digital');
        $snapshot2026 = app(SnapshotService::class)->createDraft($this->user, 2026)->refresh();
        $snapshot2027 = app(SnapshotService::class)->createDraft($this->user, 2027)->refresh();

        $this->post("/games/{$copy->library_game_id}/in-app-purchases", [
            'title' => 'Coins',
            'amount_paid' => 8,
            'purchased_at' => '2026-06-01',
        ])->assertRedirect();

        $purchase = $copy->libraryGame->inAppPurchases()->firstOrFail();
        $this->assertEquals(8.0, $snapshot2026->refresh()->summary_json['in_app_purchase_value']);
        $this->assertEquals(8.0, $snapshot2027->refresh()->summary_json['in_app_purchase_value']);

        $this->patch("/in-app-purchases/{$purchase->id}", [
            'title' => 'Coins',
            'amount_paid' => 10,
            'purchased_at' => '2027-01-01',
        ])->assertRedirect();

        $this->assertEquals(0.0, $snapshot2026->refresh()->summary_json['in_app_purchase_value']);
        $this->assertEquals(10.0, $snapshot2027->refresh()->summary_json['in_app_purchase_value']);

        $this->delete("/in-app-purchases/{$purchase->id}")->assertRedirect();

        $this->assertEquals(0.0, $snapshot2027->refresh()->summary_json['in_app_purchase_value']);
    }

    public function test_subscription_create_update_selection_and_delete_refresh_affected_snapshots(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Subscription Snapshot Game', 'Xbox', 'Game Pass');
        $gamePass = OwnershipType::where('name', 'Game Pass')->firstOrFail();
        $eaPlay = OwnershipType::where('name', 'EA Play')->firstOrFail();
        $snapshot2025 = app(SnapshotService::class)->createDraft($this->user, 2025)->refresh();
        $snapshot2026 = app(SnapshotService::class)->createDraft($this->user, 2026)->refresh();

        $this->post('/subscriptions', [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 32,
            'started_at' => '2025-12-12',
            'finished_at' => '2026-01-12',
        ])->assertRedirect();

        $entry = SubscriptionEntry::firstOrFail();
        $this->patch("/subscriptions/{$entry->id}/ownership-copies", [
            'ownership_copy_ids' => [$copy->id],
        ])->assertRedirect();

        $this->assertEquals(20.0, $snapshot2025->refresh()->summary_json['subscription_allocated_value']);
        $this->assertEquals(32.0, $snapshot2026->refresh()->summary_json['subscription_allocated_value']);

        $this->patch("/subscriptions/{$entry->id}", [
            'ownership_type_id' => $eaPlay->id,
            'amount_paid' => 10,
            'started_at' => '2026-02-01',
            'finished_at' => '2026-02-28',
        ])->assertRedirect();

        $this->assertEquals(0.0, $snapshot2025->refresh()->summary_json['subscription_allocated_value']);
        $this->assertEquals(0.0, $snapshot2026->refresh()->summary_json['subscription_allocated_value']);

        $this->delete("/subscriptions/{$entry->id}")->assertRedirect();

        $this->assertEquals(0.0, $snapshot2026->refresh()->summary_json['subscription_allocated_value']);
    }

    public function test_updating_subscription_dates_into_previous_year_refreshes_both_snapshot_summaries(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Cross Year Subscription Game', 'Xbox', 'Game Pass');
        $gamePass = OwnershipType::where('name', 'Game Pass')->firstOrFail();
        $snapshot2026 = app(SnapshotService::class)->createDraft($this->user, 2026)->refresh();
        $snapshot2027 = app(SnapshotService::class)->createDraft($this->user, 2027)->refresh();

        $this->post('/subscriptions', [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 32,
            'started_at' => '2027-01-01',
            'finished_at' => '2027-01-20',
        ])->assertRedirect();

        $entry = SubscriptionEntry::firstOrFail();
        $this->patch("/subscriptions/{$entry->id}/ownership-copies", [
            'ownership_copy_ids' => [$copy->id],
        ])->assertRedirect();

        $this->assertEquals(0.0, $snapshot2026->refresh()->summary_json['subscription_allocated_value']);
        $this->assertEquals(32.0, $snapshot2027->refresh()->summary_json['subscription_allocated_value']);

        $this->patch("/subscriptions/{$entry->id}", [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 32,
            'started_at' => '2026-12-20',
            'finished_at' => '2027-01-20',
        ])->assertRedirect();

        $this->assertEquals(12.0, $snapshot2026->refresh()->summary_json['subscription_allocated_value']);
        $this->assertEquals(32.0, $snapshot2027->refresh()->summary_json['subscription_allocated_value']);
    }

    public function test_deleting_attached_ownership_copy_refreshes_subscription_snapshot_summaries(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Deletable Subscription Game', 'Xbox', 'Game Pass');
        $extraCopy = $this->createOwnershipCopyForLibraryGame($copy->libraryGame, 'Family Sharing');
        $subscription = $this->createSubscription('Game Pass', 12);
        $subscription->ownershipCopies()->sync([$copy->id]);
        app(SubscriptionYearAllocationService::class)->synchronizeUnlockedYears($subscription->refresh());
        $snapshot = app(SnapshotService::class)->createDraft($this->user, 2026)->refresh();

        $this->assertEquals(12.0, $snapshot->summary_json['subscription_allocated_value']);

        $this->delete("/ownership-copies/{$copy->id}")->assertRedirect();

        $this->assertDatabaseMissing('ownership_copies', ['id' => $copy->id]);
        $this->assertDatabaseHas('ownership_copies', ['id' => $extraCopy->id]);
        $this->assertEquals(0.0, $snapshot->refresh()->summary_json['subscription_allocated_value']);
        $this->assertEquals(12.0, $snapshot->summary_json['subscription_unallocated_value']);
        $this->assertEquals(12.0, $snapshot->summary_json['subscription_total_value']);
        $this->assertEquals(12.0, $snapshot->summary_json['purchased_value']);
    }

    public function test_changing_ownership_type_is_blocked_when_copy_is_attached_to_subscription(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Guarded Subscription Game', 'Xbox', 'Game Pass');
        $subscription = $this->createSubscription('Game Pass', 12);
        $subscription->ownershipCopies()->sync([$copy->id]);
        $familySharing = OwnershipType::where('name', 'Family Sharing')->firstOrFail();

        $this->patch("/ownership-copies/{$copy->id}", [
            'ownership_type_id' => $familySharing->id,
        ])->assertSessionHasErrors([
            'ownership_type_id' => 'This ownership copy is used by subscription entries. Remove it from those subscriptions before changing ownership type.',
        ]);
    }

    public function test_no_financial_snapshot_tables_are_created(): void
    {
        $this->assertFalse(Schema::hasTable('subscription_entry_snapshots'));
        $this->assertFalse(Schema::hasTable('in_app_purchase_snapshots'));
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

        return $this->createOwnershipCopyForLibraryGame($libraryGame, $ownershipTypeName);
    }

    private function createOwnershipCopyForLibraryGame(LibraryGame $libraryGame, string $ownershipTypeName): OwnershipCopy
    {
        return $libraryGame->ownershipCopies()->create([
            'ownership_type_id' => OwnershipType::where('name', $ownershipTypeName)->firstOrFail()->id,
        ])->load('libraryGame');
    }
}
