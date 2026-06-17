<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Device;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\PhysicalStatus;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Status;
use App\Models\User;
use App\Services\LibraryGameCreator;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomeWidgetsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_random_home_game_only_uses_unfinished_statuses(): void
    {
        $this->createLibraryGame('Finished Game', 'Completed');
        $this->createLibraryGame('Perfect Game', '100%');
        $this->createLibraryGame('Eligible Game', 'Dropped');

        $this->getJson('/home/random-game')
            ->assertOk()
            ->assertJsonPath('game.title', 'Eligible Game')
            ->assertJsonPath('game.status', 'Dropped');
    }

    public function test_random_home_game_returns_null_without_unfinished_games(): void
    {
        $this->createLibraryGame('Finished Game', 'Completed');
        $this->createLibraryGame('Perfect Game', '100%');

        $this->getJson('/home/random-game')
            ->assertOk()
            ->assertJsonPath('game', null);
    }

    private function createLibraryGame(string $title, string $status): void
    {
        app(LibraryGameCreator::class)->create($this->user, $this->payload($title, $status));
    }

    private function payload(string $title, string $status): array
    {
        $platform = Platform::where('name', 'Steam')->firstOrFail();
        $device = Device::where('name', 'PC')->firstOrFail();
        $ownership = OwnershipType::where('name', 'Digital')->firstOrFail();
        $statusModel = Status::where('name', $status)->firstOrFail();

        return [
            'game' => [
                'title' => $title,
                'source' => 'manual',
                'total_achievements' => $status === '100%' ? 10 : 0,
                'create_duplicate_anyway' => true,
            ],
            'platform_id' => $platform->id,
            'device_ids' => [$device->id],
            'ownership_copies' => [[
                'ownership_type_id' => $ownership->id,
                'physical_status_id' => PhysicalStatus::where('name', 'Complete')->firstOrFail()->id,
                'base_price' => 20,
                'purchased_price' => 10,
            ]],
            'progress' => [
                'status_id' => $statusModel->id,
                'playtime_hours' => 0,
                'earned_achievements' => $status === '100%' ? 10 : 0,
            ],
        ];
    }
}
