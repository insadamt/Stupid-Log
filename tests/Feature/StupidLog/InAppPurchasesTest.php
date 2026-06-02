<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Game;
use App\Models\StupidLog\InAppPurchase;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Status;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InAppPurchasesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_can_add_edit_and_delete_in_app_purchase_for_library_game(): void
    {
        $libraryGame = $this->createLibraryGame($this->user, 'IAP Game');

        $this->post("/games/{$libraryGame->id}/in-app-purchases", [
            'title' => 'Coin Pack',
            'amount_paid' => 4.99,
            'purchased_at' => '2026-03-01',
        ])->assertRedirect();

        $purchase = InAppPurchase::firstOrFail();

        $this->assertSame($libraryGame->id, $purchase->library_game_id);
        $this->assertSame('Coin Pack', $purchase->title);
        $this->assertSame('4.99', $purchase->amount_paid);
        $this->assertSame('2026-03-01', $purchase->purchased_at->format('Y-m-d'));

        $this->patch("/in-app-purchases/{$purchase->id}", [
            'title' => 'Expansion Currency',
            'amount_paid' => 7.5,
            'purchased_at' => '2026-03-02',
        ])->assertRedirect();

        $purchase->refresh();

        $this->assertSame('Expansion Currency', $purchase->title);
        $this->assertSame('7.50', $purchase->amount_paid);
        $this->assertSame('2026-03-02', $purchase->purchased_at->format('Y-m-d'));

        $this->delete("/in-app-purchases/{$purchase->id}")->assertRedirect();

        $this->assertDatabaseMissing('in_app_purchases', ['id' => $purchase->id]);
    }

    public function test_in_app_purchase_requires_title_amount_and_purchase_date(): void
    {
        $libraryGame = $this->createLibraryGame($this->user, 'Validation Game');

        $this->post("/games/{$libraryGame->id}/in-app-purchases", [
            'title' => '',
            'amount_paid' => null,
            'purchased_at' => null,
        ])->assertSessionHasErrors(['title', 'amount_paid', 'purchased_at']);
    }

    public function test_in_app_purchase_rejects_zero_amount(): void
    {
        $libraryGame = $this->createLibraryGame($this->user, 'Zero Amount Game');

        $this->post("/games/{$libraryGame->id}/in-app-purchases", [
            'title' => 'Free Pack',
            'amount_paid' => 0,
            'purchased_at' => '2026-03-01',
        ])->assertSessionHasErrors('amount_paid');
    }

    public function test_in_app_purchase_rejects_library_game_from_another_user(): void
    {
        $otherUser = User::factory()->create();
        $libraryGame = $this->createLibraryGame($otherUser, 'Other User Game');

        $this->post("/games/{$libraryGame->id}/in-app-purchases", [
            'title' => 'Coin Pack',
            'amount_paid' => 4.99,
            'purchased_at' => '2026-03-01',
        ])->assertForbidden();
    }

    public function test_in_app_purchase_update_and_delete_reject_another_users_purchase(): void
    {
        $otherUser = User::factory()->create();
        $libraryGame = $this->createLibraryGame($otherUser, 'Other User Purchase');
        $purchase = $libraryGame->inAppPurchases()->create([
            'title' => 'Coin Pack',
            'amount_paid' => 4.99,
            'purchased_at' => '2026-03-01',
        ]);

        $this->patch("/in-app-purchases/{$purchase->id}", [
            'title' => 'Edited Pack',
            'amount_paid' => 5.99,
            'purchased_at' => '2026-03-02',
        ])->assertForbidden();

        $this->delete("/in-app-purchases/{$purchase->id}")->assertForbidden();
    }

    private function createLibraryGame(User $user, string $title): LibraryGame
    {
        $game = Game::create([
            'title' => $title,
            'normalized_title' => strtolower($title),
        ]);

        return LibraryGame::create([
            'user_id' => $user->id,
            'game_id' => $game->id,
            'platform_id' => Platform::where('name', 'Steam')->firstOrFail()->id,
            'status_id' => Status::where('name', 'Not Played')->firstOrFail()->id,
            'playtime_hours' => 0,
        ]);
    }
}
