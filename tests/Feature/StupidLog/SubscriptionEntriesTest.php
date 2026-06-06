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

class SubscriptionEntriesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_subscriptions_page_returns_entries_types_and_selectable_ownership_copies(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Library Game', 'Xbox', 'Game Pass');
        $entry = $this->createSubscription('Game Pass');
        $entry->ownershipCopies()->sync([$copy->id]);

        $page = $this->get('/subscriptions')->assertOk()->viewData('page');

        $this->assertSame('Subscriptions', $page['component']);
        $this->assertSame($entry->id, $page['props']['subscriptionEntries'][0]['id']);
        $this->assertSame($copy->id, $page['props']['ownershipCopies'][0]['id']);
        $this->assertTrue(collect($page['props']['subscriptionOwnershipTypes'])->contains('name', 'Game Pass'));
    }

    public function test_subscriptions_page_exposes_yearly_locks_and_closed_date_boundary(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Locked Library Game', 'Xbox', 'Game Pass');
        $entry = $this->createSubscription('Game Pass');
        $entry->ownershipCopies()->sync([$copy->id]);
        app(SubscriptionYearAllocationService::class)->synchronizeUnlockedYears($entry->refresh());
        $snapshot = SnapshotRun::create([
            'user_id' => $this->user->id,
            'year' => 2026,
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);
        $entry->years()->update([
            'is_locked' => true,
            'locked_by_snapshot_run_id' => $snapshot->id,
        ]);

        $page = $this->get('/subscriptions')->assertOk()->viewData('page');
        $payload = $page['props']['subscriptionEntries'][0];

        $this->assertTrue($payload['has_locked_years']);
        $this->assertSame([$copy->id], $payload['locked_ownership_copy_ids']);
        $this->assertTrue($payload['years'][0]['is_locked']);
        $this->assertSame(2026, $payload['years'][0]['locked_by_snapshot_year']);
        $this->assertSame($copy->id, $payload['years'][0]['allocations'][0]['ownership_copy_id']);
        $this->assertSame(2026, $page['props']['closedFinancialYear']);
        $this->assertSame('2027-01-01', $page['props']['firstEditableDate']);
    }

    public function test_can_create_subscription_entry_with_required_fields(): void
    {
        $gamePass = OwnershipType::where('name', 'Game Pass')->firstOrFail();

        $this->post('/subscriptions', [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 12.99,
            'started_at' => '2026-01-01',
            'finished_at' => '2026-01-31',
        ])->assertRedirect();

        $entry = SubscriptionEntry::firstOrFail();

        $this->assertSame($this->user->id, $entry->user_id);
        $this->assertSame($gamePass->id, $entry->ownership_type_id);
        $this->assertSame('12.99', $entry->amount_paid);
        $this->assertSame('2026-01-01', $entry->started_at->format('Y-m-d'));
        $this->assertSame('2026-01-31', $entry->finished_at->format('Y-m-d'));
    }

    public function test_subscription_entry_rejects_non_subscription_type_and_zero_amount(): void
    {
        $digital = OwnershipType::where('name', 'Digital')->firstOrFail();
        $gamePass = OwnershipType::where('name', 'Game Pass')->firstOrFail();

        $this->post('/subscriptions', [
            'ownership_type_id' => $digital->id,
            'amount_paid' => 12.99,
            'started_at' => '2026-01-01',
            'finished_at' => '2026-01-31',
        ])->assertSessionHasErrors('ownership_type_id');

        $this->post('/subscriptions', [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 0,
            'started_at' => '2026-01-01',
            'finished_at' => '2026-01-31',
        ])->assertSessionHasErrors('amount_paid');
    }

    public function test_can_attach_matching_ownership_copies_for_same_user(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Game Pass Game', 'Xbox', 'Game Pass');
        $entry = $this->createSubscription('Game Pass');

        $this->patch("/subscriptions/{$entry->id}/ownership-copies", [
            'ownership_copy_ids' => [$copy->id],
        ])->assertRedirect();

        $this->assertDatabaseHas('subscription_entry_ownership_copies', [
            'subscription_entry_id' => $entry->id,
            'ownership_copy_id' => $copy->id,
        ]);
    }

    public function test_rejects_ownership_copies_from_different_type_or_user(): void
    {
        $entry = $this->createSubscription('Game Pass');
        $wrongTypeCopy = $this->createOwnershipCopy($this->user, 'EA Game', 'Xbox', 'EA Play');
        $otherUser = User::factory()->create();
        $otherUserCopy = $this->createOwnershipCopy($otherUser, 'Other User Game', 'Xbox', 'Game Pass');

        $this->patch("/subscriptions/{$entry->id}/ownership-copies", [
            'ownership_copy_ids' => [$wrongTypeCopy->id],
        ])->assertSessionHasErrors('ownership_copy_ids');

        $this->patch("/subscriptions/{$entry->id}/ownership-copies", [
            'ownership_copy_ids' => [$otherUserCopy->id],
        ])->assertSessionHasErrors('ownership_copy_ids');
    }

    public function test_updating_subscription_ownership_type_clears_selected_copies(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Game Pass Game', 'Xbox', 'Game Pass');
        $entry = $this->createSubscription('Game Pass');
        $entry->ownershipCopies()->sync([$copy->id]);
        $eaPlay = OwnershipType::where('name', 'EA Play')->firstOrFail();

        $this->patch("/subscriptions/{$entry->id}", [
            'ownership_type_id' => $eaPlay->id,
            'amount_paid' => 20,
            'started_at' => '2026-02-01',
            'finished_at' => '2026-02-28',
        ])->assertRedirect();

        $this->assertDatabaseMissing('subscription_entry_ownership_copies', [
            'subscription_entry_id' => $entry->id,
            'ownership_copy_id' => $copy->id,
        ]);
    }

    public function test_delete_subscription_removes_pivot_rows(): void
    {
        $copy = $this->createOwnershipCopy($this->user, 'Game Pass Game', 'Xbox', 'Game Pass');
        $entry = $this->createSubscription('Game Pass');
        $entry->ownershipCopies()->sync([$copy->id]);

        $this->delete("/subscriptions/{$entry->id}")->assertRedirect();

        $this->assertDatabaseMissing('subscription_entries', ['id' => $entry->id]);
        $this->assertDatabaseMissing('subscription_entry_ownership_copies', [
            'subscription_entry_id' => $entry->id,
            'ownership_copy_id' => $copy->id,
        ]);
    }

    public function test_update_and_delete_reject_another_users_subscription(): void
    {
        $otherUser = User::factory()->create();
        $entry = $this->createSubscription('Game Pass', $otherUser);
        $gamePass = OwnershipType::where('name', 'Game Pass')->firstOrFail();

        $this->patch("/subscriptions/{$entry->id}", [
            'ownership_type_id' => $gamePass->id,
            'amount_paid' => 20,
            'started_at' => '2026-02-01',
            'finished_at' => '2026-02-28',
        ])->assertForbidden();

        $this->delete("/subscriptions/{$entry->id}")->assertForbidden();
    }

    private function createSubscription(string $ownershipTypeName, ?User $user = null): SubscriptionEntry
    {
        return SubscriptionEntry::create([
            'user_id' => ($user ?? $this->user)->id,
            'ownership_type_id' => OwnershipType::where('name', $ownershipTypeName)->firstOrFail()->id,
            'amount_paid' => 15,
            'started_at' => '2026-01-01',
            'finished_at' => '2026-01-31',
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
        ]);
    }
}
