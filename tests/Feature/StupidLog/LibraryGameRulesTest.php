<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Device;
use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\ExternalGameId;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\PhysicalStatus;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\SnapshotRun;
use App\Models\StupidLog\Status;
use App\Models\User;
use App\Services\DuplicateDetectionService;
use App\Services\LibraryGameCreator;
use App\Services\SnapshotService;
use App\Services\StatsService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class LibraryGameRulesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_seeders_are_idempotent(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(1, Platform::where('name', 'Steam')->count());
        $this->assertSame(1, Device::where('name', 'Xbox Series X|S')->count());
        $this->assertDatabaseHas('ownership_types', ['name' => 'Family Sharing']);
        $this->assertDatabaseHas('devices', ['name' => 'Pokemon Mini']);
        $this->assertDatabaseHas('platform_device', [
            'platform_id' => Platform::where('name', 'Steam')->first()->id,
            'device_id' => Device::where('name', 'PC')->first()->id,
        ]);
    }

    public function test_duplicate_detection_reuses_external_ids_and_flags_manual_matches(): void
    {
        $game = Game::create([
            'title' => 'Forza Horizon 6',
            'normalized_title' => 'forza horizon 6',
            'release_date' => '2026-10-10',
        ]);

        ExternalGameId::create([
            'game_id' => $game->id,
            'provider_id' => Provider::where('key', 'igdb')->first()->id,
            'external_id' => 'igdb-1',
        ]);

        ExternalGameId::create([
            'game_id' => $game->id,
            'provider_id' => Provider::where('key', 'steam')->first()->id,
            'external_id' => '999',
        ]);

        $duplicates = app(DuplicateDetectionService::class);

        $this->assertTrue($game->is($duplicates->findByExternalId('igdb', 'igdb-1')));
        $this->assertTrue($game->is($duplicates->findByExternalId('steam', '999')));
        $this->assertCount(1, $duplicates->possibleManualDuplicates('FORZA horizon 6', '2026-01-01'));
    }

    public function test_same_game_on_different_platforms_is_allowed_but_same_platform_is_blocked(): void
    {
        $creator = app(LibraryGameCreator::class);
        $gameData = ['title' => 'Elden Ring', 'source' => 'manual', 'external_ids' => ['igdb' => 'elden-igdb'], 'create_duplicate_anyway' => true];

        $steam = $this->payload(['game' => $gameData], 'Steam', 'PC', 'Digital');
        $created = $creator->create($this->user, $steam);

        try {
            $creator->create($this->user, $steam);
            $this->fail('Same game on the same platform should be blocked.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }

        $xbox = $this->payload(['game' => $gameData], 'Xbox', 'Xbox Series X|S', 'Digital');

        try {
            $creator->create($this->user, $xbox);
        } catch (ValidationException) {
            $this->fail('Same global game should be allowed on a different platform.');
        }
    }

    public function test_devices_ownership_physical_status_and_100_percent_rules_are_validated(): void
    {
        $creator = app(LibraryGameCreator::class);

        $this->expectException(ValidationException::class);
        $creator->create($this->user, $this->payload([], 'Steam', 'Xbox Series X|S', 'Digital'));
    }

    public function test_physical_status_and_hundred_percent_validation(): void
    {
        $creator = app(LibraryGameCreator::class);

        try {
            $creator->create($this->user, $this->payload([], 'Xbox', 'Xbox Series X|S', 'Physical', false));
            $this->fail('Physical ownership should require physical status.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }

        $hundredStatus = Status::where('name', '100%')->first();
        $payload = $this->payload([
            'game' => [
                'title' => 'Achievement Game',
                'source' => 'manual',
                'total_achievements' => 10,
                'create_duplicate_anyway' => true,
            ],
            'progress' => [
                'status_id' => $hundredStatus->id,
                'playtime_hours' => 1,
                'earned_achievements' => 9,
            ],
        ], 'Steam', 'PC', 'Digital');

        $this->expectException(ValidationException::class);
        $creator->create($this->user, $payload);
    }

    public function test_dlc_pricing_stats_and_confirmed_snapshots_follow_v1_rules(): void
    {
        $creator = app(LibraryGameCreator::class);
        $steamProvider = Provider::where('key', 'steam')->first();
        $game = Game::create([
            'title' => 'DLC Game',
            'normalized_title' => 'dlc game',
            'total_achievements' => 10,
            'base_price_default' => 70,
        ]);
        $dlc = Dlc::create([
            'game_id' => $game->id,
            'steam_app_id' => 'dlc-1',
            'title' => 'Expansion',
            'base_price' => 20,
            'source_provider_id' => $steamProvider->id,
        ]);
        $game->externalIds()->create([
            'provider_id' => Provider::where('key', 'igdb')->first()->id,
            'external_id' => 'dlc-game',
        ]);

        $payload = $this->payload([
            'game' => ['title' => 'DLC Game', 'source' => 'igdb', 'external_ids' => ['igdb' => 'dlc-game']],
            'ownership_copies' => [[
                'ownership_type_id' => OwnershipType::where('name', 'Digital')->first()->id,
                'base_price' => 50,
                'purchased_price' => 5,
            ]],
            'owned_dlcs' => [[
                'dlc_id' => $dlc->id,
                'acquisition_type' => 'Edition Included',
                'purchased_price' => 999,
            ]],
        ], 'Steam', 'PC', 'Digital');

        $libraryGame = $creator->create($this->user, $payload);
        $stats = app(StatsService::class)->live($this->user);

        $this->assertSame(50.0, $stats['base_value']);
        $this->assertSame(5.0, $stats['purchased_value']);
        $this->assertDatabaseHas('owned_dlcs', [
            'library_game_id' => $libraryGame->id,
            'acquisition_type' => 'Edition Included',
            'purchased_price' => 0,
        ]);

        $snapshot = app(SnapshotService::class)->createDraft($this->user, 2026);
        $this->assertNull(app(StatsService::class)->confirmedYear($this->user, 2026));
        app(SnapshotService::class)->confirm($snapshot);
        $this->assertSame(1, app(StatsService::class)->confirmedYear($this->user, 2026)['library_games']);
    }

    public function test_snapshot_drafts_are_idempotent_and_only_one_snapshot_can_be_confirmed_per_year(): void
    {
        $creator = app(LibraryGameCreator::class);
        $creator->create($this->user, $this->payload());

        $snapshots = app(SnapshotService::class);
        $firstDraft = $snapshots->createDraft($this->user, 2026);
        $secondDraft = $snapshots->createDraft($this->user, 2026);

        $this->assertDatabaseMissing('snapshot_runs', ['id' => $firstDraft->id]);
        $this->assertSame(1, SnapshotRun::where('user_id', $this->user->id)->where('year', 2026)->where('status', 'draft')->count());
        $this->assertSame(1, DB::table('library_game_snapshots')->where('snapshot_run_id', $secondDraft->id)->count());

        $snapshots->confirm($secondDraft);
        $this->assertSame('confirmed', $secondDraft->refresh()->status);

        $thirdDraft = $snapshots->createDraft($this->user, 2026);

        try {
            $snapshots->confirm($thirdDraft);
            $this->fail('A second confirmed snapshot for the same year should be blocked.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }

        $this->assertSame(1, SnapshotRun::where('user_id', $this->user->id)->where('year', 2026)->where('status', 'confirmed')->count());
    }

    private function payload(array $overrides = [], string $platform = 'Steam', string $device = 'PC', string $ownership = 'Digital', bool $includePhysicalStatus = true): array
    {
        $platformModel = Platform::where('name', $platform)->firstOrFail();
        $deviceModel = Device::where('name', $device)->firstOrFail();
        $ownershipModel = OwnershipType::where('name', $ownership)->firstOrFail();
        $status = Status::where('name', 'Not Played')->firstOrFail();

        $payload = [
            'game' => [
                'title' => fake()->unique()->words(3, true),
                'source' => 'manual',
                'total_achievements' => 0,
                'create_duplicate_anyway' => true,
            ],
            'platform_id' => $platformModel->id,
            'device_ids' => [$deviceModel->id],
            'ownership_copies' => [[
                'ownership_type_id' => $ownershipModel->id,
                'physical_status_id' => $includePhysicalStatus ? PhysicalStatus::where('name', 'Complete')->first()->id : null,
                'base_price' => 20,
                'purchased_price' => 10,
            ]],
            'progress' => [
                'status_id' => $status->id,
                'playtime_hours' => 0,
                'earned_achievements' => 0,
            ],
        ];

        return array_replace_recursive($payload, $overrides);
    }
}
