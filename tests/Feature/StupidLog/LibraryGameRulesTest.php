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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
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

    public function test_store_library_game_request_rejects_invalid_payload_shape(): void
    {
        $this->postJson('/library-games', [
            'game' => ['title' => 'A'],
            'platform_id' => 'not-an-id',
            'device_ids' => [],
            'ownership_copies' => [],
            'progress' => [
                'playtime_hours' => -1,
                'earned_achievements' => -1,
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'platform_id',
                'device_ids',
                'ownership_copies',
                'progress.status_id',
                'progress.playtime_hours',
                'progress.earned_achievements',
            ]);
    }

    public function test_game_cover_upload_stores_public_image_and_returns_path_for_wizard_payload(): void
    {
        Storage::fake('public');

        $response = $this->postJson('/library-games/cover', [
            'cover' => UploadedFile::fake()->createWithContent(
                'cover.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=')
            ),
        ])->assertCreated()
            ->assertJsonStructure(['path', 'url'])
            ->assertJsonPath('path', fn (string $path) => str_starts_with($path, 'covers/games/'));

        $path = $response->json('path');

        Storage::disk('public')->assertExists($path);
    }

    public function test_game_cover_upload_rejects_non_images(): void
    {
        Storage::fake('public');

        $this->postJson('/library-games/cover', [
            'cover' => UploadedFile::fake()->create('cover.txt', 10, 'text/plain'),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['cover']);
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

    public function test_earned_achievements_cannot_exceed_submitted_total_achievements(): void
    {
        $creator = app(LibraryGameCreator::class);

        $this->expectException(ValidationException::class);
        $creator->create($this->user, $this->payload([
            'game' => [
                'title' => 'Submitted Achievement Total',
                'source' => 'manual',
                'total_achievements' => 3,
                'create_duplicate_anyway' => true,
            ],
            'progress' => [
                'status_id' => Status::where('name', 'In Progress')->firstOrFail()->id,
                'playtime_hours' => 1,
                'earned_achievements' => 4,
            ],
        ]));
    }

    public function test_ownership_copies_can_be_added_updated_and_deleted_after_game_creation(): void
    {
        $libraryGame = app(LibraryGameCreator::class)->create($this->user, $this->payload());
        $familySharing = OwnershipType::where('name', 'Family Sharing')->firstOrFail();

        $this->post("/games/{$libraryGame->id}/ownership-copies", [
            'ownership_type_id' => $familySharing->id,
            'edition_name' => 'Shared copy',
            'base_price' => 30,
            'purchased_price' => 0,
            'purchased_at' => '2026-05-23',
        ])->assertRedirect();

        $copy = $libraryGame->ownershipCopies()->where('ownership_type_id', $familySharing->id)->firstOrFail();

        $this->assertDatabaseHas('ownership_copies', [
            'id' => $copy->id,
            'edition_name' => 'Shared copy',
            'base_price' => 30,
            'purchased_price' => 0,
        ]);

        $eaPlay = OwnershipType::where('name', 'EA Play')->firstOrFail();

        $this->patch("/ownership-copies/{$copy->id}", [
            'ownership_type_id' => $eaPlay->id,
            'edition_name' => 'Subscription',
            'base_price' => 40,
            'purchased_price' => 5,
        ])->assertRedirect();

        $this->assertDatabaseHas('ownership_copies', [
            'id' => $copy->id,
            'ownership_type_id' => $eaPlay->id,
            'edition_name' => 'Subscription',
            'base_price' => 40,
            'purchased_price' => 5,
        ]);

        $this->delete("/ownership-copies/{$copy->id}")->assertRedirect();

        $this->assertDatabaseMissing('ownership_copies', ['id' => $copy->id]);
    }

    public function test_ownership_copy_editing_enforces_platform_duplicate_physical_and_last_copy_rules(): void
    {
        $libraryGame = app(LibraryGameCreator::class)->create($this->user, $this->payload([], 'Xbox', 'Xbox Series X|S', 'Digital'));
        $digitalCopy = $libraryGame->ownershipCopies()->firstOrFail();
        $psPlus = OwnershipType::where('name', 'PS Plus')->firstOrFail();
        $physical = OwnershipType::where('name', 'Physical')->firstOrFail();

        $this->post("/games/{$libraryGame->id}/ownership-copies", [
            'ownership_type_id' => $psPlus->id,
        ])->assertSessionHasErrors('ownership_type_id');

        $this->post("/games/{$libraryGame->id}/ownership-copies", [
            'ownership_type_id' => $digitalCopy->ownership_type_id,
        ])->assertSessionHasErrors('ownership_type_id');

        $this->post("/games/{$libraryGame->id}/ownership-copies", [
            'ownership_type_id' => $physical->id,
        ])->assertSessionHasErrors('physical_status_id');

        $this->delete("/ownership-copies/{$digitalCopy->id}")
            ->assertSessionHasErrors('ownership_copy');
    }

    public function test_library_game_can_be_updated_and_deleted_from_details_page(): void
    {
        $libraryGame = app(LibraryGameCreator::class)->create($this->user, $this->payload([
            'game' => [
                'title' => 'Old Game',
                'source' => 'manual',
                'total_achievements' => 10,
                'create_duplicate_anyway' => true,
            ],
        ]));
        $inProgress = Status::where('name', 'In Progress')->firstOrFail();

        $this->patch("/games/{$libraryGame->id}", [
            'game' => [
                'title' => 'New Game',
                'publisher' => 'New Studio',
                'description' => 'Updated details.',
                'base_price_default' => 25,
                'total_achievements' => 12,
            ],
            'progress' => [
                'status_id' => $inProgress->id,
                'playtime_hours' => 6.5,
                'earned_achievements' => 5,
            ],
        ])->assertRedirect();

        $this->assertDatabaseHas('games', [
            'id' => $libraryGame->game_id,
            'title' => 'New Game',
            'normalized_title' => 'new game',
            'publisher' => 'New Studio',
            'description' => 'Updated details.',
            'base_price_default' => 25,
            'total_achievements' => 12,
        ]);
        $this->assertDatabaseHas('library_games', [
            'id' => $libraryGame->id,
            'status_id' => $inProgress->id,
            'playtime_hours' => 6.5,
            'earned_achievements' => 5,
        ]);

        $this->delete("/games/{$libraryGame->id}")->assertRedirect('/library');
        $this->assertDatabaseMissing('library_games', ['id' => $libraryGame->id]);
    }

    public function test_platform_and_devices_can_be_updated_when_ownership_remains_compatible(): void
    {
        $libraryGame = app(LibraryGameCreator::class)->create($this->user, $this->payload([], 'Steam', 'PC', 'Digital'));
        $gog = Platform::where('name', 'GOG')->firstOrFail();
        $pc = Device::where('name', 'PC')->firstOrFail();

        $this->patch("/games/{$libraryGame->id}/platform-devices", [
            'platform_id' => $gog->id,
            'device_ids' => [$pc->id],
        ])->assertRedirect();

        $this->assertDatabaseHas('library_games', [
            'id' => $libraryGame->id,
            'platform_id' => $gog->id,
        ]);
        $this->assertDatabaseHas('library_game_device', [
            'library_game_id' => $libraryGame->id,
            'device_id' => $pc->id,
        ]);
    }

    public function test_platform_device_editing_rejects_invalid_devices_duplicate_platforms_and_incompatible_ownership(): void
    {
        $creator = app(LibraryGameCreator::class);
        $libraryGame = $creator->create($this->user, $this->payload([], 'Steam', 'PC', 'Digital'));
        $xboxPayload = $this->payload([
            'game' => [
                'title' => $libraryGame->game->title,
                'source' => 'manual',
                'external_ids' => [],
                'create_duplicate_anyway' => true,
            ],
        ], 'Xbox', 'Xbox Series X|S', 'Digital');
        $existingXbox = $creator->create($this->user, $xboxPayload);
        $existingXbox->update(['game_id' => $libraryGame->game_id]);

        $xbox = Platform::where('name', 'Xbox')->firstOrFail();
        $ps5 = Device::where('name', 'PS5')->firstOrFail();
        $pc = Device::where('name', 'PC')->firstOrFail();

        $this->patch("/games/{$libraryGame->id}/platform-devices", [
            'platform_id' => $xbox->id,
            'device_ids' => [$ps5->id],
        ])->assertSessionHasErrors('device_ids');

        $this->patch("/games/{$libraryGame->id}/platform-devices", [
            'platform_id' => $xbox->id,
            'device_ids' => [$pc->id],
        ])->assertSessionHasErrors('platform_id');

        $retro = $creator->create($this->user, $this->payload([], 'RetroAchievements', 'NES / Famicom', 'Emulation'));
        $gog = Platform::where('name', 'GOG')->firstOrFail();

        $this->patch("/games/{$retro->id}/platform-devices", [
            'platform_id' => $gog->id,
            'device_ids' => [$pc->id],
        ])->assertSessionHasErrors('platform_id');
    }

    public function test_dlc_ownership_can_be_marked_updated_and_removed_from_details_page(): void
    {
        $libraryGame = app(LibraryGameCreator::class)->create($this->user, $this->payload());
        $dlc = Dlc::create([
            'game_id' => $libraryGame->game_id,
            'title' => 'Expansion Pack',
            'base_price' => 15,
        ]);

        $this->post("/games/{$libraryGame->id}/owned-dlcs", [
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Owned',
            'purchased_price' => 7.5,
            'purchased_at' => '2026-05-23',
        ])->assertRedirect();

        $ownedDlc = $libraryGame->ownedDlcs()->where('dlc_id', $dlc->id)->firstOrFail();

        $this->assertDatabaseHas('owned_dlcs', [
            'id' => $ownedDlc->id,
            'library_game_id' => $libraryGame->id,
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Owned',
            'purchased_price' => 7.5,
        ]);
        $this->assertSame('2026-05-23', $ownedDlc->refresh()->purchased_at->format('Y-m-d'));

        $this->patch("/owned-dlcs/{$ownedDlc->id}", [
            'acquisition_type' => 'Edition Included',
            'purchased_price' => 99,
        ])->assertRedirect();

        $this->assertDatabaseHas('owned_dlcs', [
            'id' => $ownedDlc->id,
            'acquisition_type' => 'Edition Included',
            'purchased_price' => 0,
        ]);

        $this->delete("/owned-dlcs/{$ownedDlc->id}")->assertRedirect();

        $this->assertDatabaseMissing('owned_dlcs', ['id' => $ownedDlc->id]);
    }

    public function test_dlc_catalog_can_be_refreshed_from_steam_after_game_creation(): void
    {
        Http::fake([
            'store.steampowered.com/api/appdetails*' => function ($request) {
                parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);
                $appIds = explode(',', $query['appids'] ?? '');

                if ($appIds === ['100']) {
                    return Http::response([
                        '100' => [
                            'success' => true,
                            'data' => [
                                'name' => 'Steam Game',
                                'dlc' => [300],
                            ],
                        ],
                    ]);
                }

                return Http::response([
                    '300' => [
                        'success' => true,
                        'data' => [
                            'name' => 'New Expansion',
                            'header_image' => 'https://cdn.example.test/300.jpg',
                            'price_overview' => ['initial' => 1499],
                        ],
                    ],
                ]);
            },
        ]);

        $libraryGame = app(LibraryGameCreator::class)->create($this->user, $this->payload());
        $steam = Provider::where('key', 'steam')->firstOrFail();

        ExternalGameId::create([
            'game_id' => $libraryGame->game_id,
            'provider_id' => $steam->id,
            'external_id' => '100',
            'url' => 'https://store.steampowered.com/app/100',
        ]);

        $this->post("/games/{$libraryGame->id}/dlcs/refresh")->assertRedirect();

        $this->assertDatabaseHas('dlcs', [
            'game_id' => $libraryGame->game_id,
            'steam_app_id' => '300',
            'title' => 'New Expansion',
            'base_price' => 14.99,
        ]);
    }

    public function test_dlc_ownership_rejects_wrong_game_duplicate_and_invalid_acquisition_type(): void
    {
        $creator = app(LibraryGameCreator::class);
        $libraryGame = $creator->create($this->user, $this->payload());
        $otherGame = Game::create([
            'title' => 'Other Game',
            'normalized_title' => 'other game',
        ]);
        $wrongDlc = Dlc::create([
            'game_id' => $otherGame->id,
            'title' => 'Wrong DLC',
        ]);
        $dlc = Dlc::create([
            'game_id' => $libraryGame->game_id,
            'title' => 'Valid DLC',
        ]);

        $this->post("/games/{$libraryGame->id}/owned-dlcs", [
            'dlc_id' => $wrongDlc->id,
            'acquisition_type' => 'Owned',
        ])->assertSessionHasErrors('dlc_id');

        $this->post("/games/{$libraryGame->id}/owned-dlcs", [
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Invalid',
        ])->assertSessionHasErrors('acquisition_type');

        $this->post("/games/{$libraryGame->id}/owned-dlcs", [
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Owned',
        ])->assertRedirect();

        $this->post("/games/{$libraryGame->id}/owned-dlcs", [
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Owned',
        ])->assertSessionHasErrors('dlc_id');
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

        $year = (int) now()->format('Y');
        $snapshot = app(SnapshotService::class)->createDraft($this->user, $year);
        $this->assertNull(app(StatsService::class)->confirmedYear($this->user, $year));
        app(SnapshotService::class)->confirm($snapshot);
        $confirmed = app(StatsService::class)->confirmedYear($this->user, $year);
        $this->assertSame(1, $confirmed['library_games']);
        $this->assertSame(1, $confirmed['unique_titles']);
        $this->assertSame(1, $confirmed['ownership_copies']);
        $this->assertSame(1, $confirmed['owned_dlcs']);
        $this->assertSame(50.0, $confirmed['base_value']);
        $this->assertSame(5.0, $confirmed['purchased_value']);
        $this->assertSame('Steam', $confirmed['breakdowns']['platforms'][0]['label']);
    }

    public function test_snapshot_drafts_keep_multiple_previews_and_only_one_snapshot_can_be_confirmed_per_year(): void
    {
        $creator = app(LibraryGameCreator::class);
        $creator->create($this->user, $this->payload());

        $snapshots = app(SnapshotService::class);
        $year = (int) now()->format('Y');
        $firstDraft = $snapshots->createDraft($this->user, $year);
        $secondDraft = $snapshots->createDraft($this->user, $year);

        $this->assertDatabaseHas('snapshot_runs', ['id' => $firstDraft->id]);
        $this->assertSame(2, SnapshotRun::where('user_id', $this->user->id)->where('year', $year)->where('status', 'draft')->count());
        $this->assertSame(1, DB::table('library_game_snapshots')->where('snapshot_run_id', $firstDraft->id)->count());
        $this->assertSame(1, DB::table('library_game_snapshots')->where('snapshot_run_id', $secondDraft->id)->count());

        $snapshots->confirm($secondDraft);
        $this->assertSame('confirmed', $secondDraft->refresh()->status);

        try {
            $snapshots->createDraft($this->user, $year);
            $this->fail('Drafting a locked confirmed year should be blocked.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }

        $this->assertSame(1, SnapshotRun::where('user_id', $this->user->id)->where('year', $year)->where('status', 'confirmed')->count());
    }

    public function test_snapshot_drafts_copy_current_library_stats_for_the_selected_archive_year(): void
    {
        $pastYear = (int) now()->format('Y') - 1;

        app(LibraryGameCreator::class)->create($this->user, $this->payload([
            'game' => [
                'title' => 'Past Owned Game',
                'source' => 'manual',
                'create_duplicate_anyway' => true,
            ],
            'ownership_copies' => [[
                'ownership_type_id' => OwnershipType::where('name', 'Digital')->firstOrFail()->id,
                'base_price' => 20,
                'purchased_price' => 10,
                'purchased_at' => "{$pastYear}-06-01",
            ]],
        ]));

        app(LibraryGameCreator::class)->create($this->user, $this->payload([
            'game' => [
                'title' => 'Past Played Current Copy Game',
                'source' => 'manual',
                'total_achievements' => 10,
                'create_duplicate_anyway' => true,
            ],
            'ownership_copies' => [[
                'ownership_type_id' => OwnershipType::where('name', 'Digital')->firstOrFail()->id,
                'base_price' => 60,
                'purchased_price' => 30,
            ]],
            'progress' => [
                'status_id' => Status::where('name', 'In Progress')->firstOrFail()->id,
                'playtime_hours' => 33.5,
                'earned_achievements' => 4,
                'first_played_at' => "{$pastYear}-03-01",
            ],
        ]));

        app(LibraryGameCreator::class)->create($this->user, $this->payload([
            'game' => [
                'title' => 'Current Only Game',
                'source' => 'manual',
                'create_duplicate_anyway' => true,
            ],
        ]));

        $snapshot = app(SnapshotService::class)->createDraft($this->user, $pastYear);
        $summary = app(StatsService::class)->snapshotSummary($snapshot);

        $this->assertSame(3, $summary['library_games']);
        $this->assertSame(3, $summary['ownership_copies']);
        $this->assertSame(100.0, $summary['base_value']);
        $this->assertSame(33.5, $summary['playtime_hours']);
        $this->assertSame(4, $summary['earned_achievements']);
        $this->assertSame('Steam', $summary['breakdowns']['platforms'][0]['label']);
    }

    public function test_snapshot_pages_receive_summary_and_detail_payloads(): void
    {
        app(LibraryGameCreator::class)->create($this->user, $this->payload([
            'game' => [
                'title' => 'Snapshot Game',
                'source' => 'manual',
                'total_achievements' => 12,
                'create_duplicate_anyway' => true,
            ],
            'progress' => [
                'status_id' => Status::where('name', 'Completed')->firstOrFail()->id,
                'playtime_hours' => 18.5,
                'earned_achievements' => 6,
            ],
        ]));

        $year = (int) now()->format('Y');
        $snapshot = app(SnapshotService::class)->createDraft($this->user, $year);
        app(SnapshotService::class)->confirm($snapshot);

        $snapshotsPage = $this->get('/snapshots')->assertOk()->viewData('page');

        $this->assertSame('Snapshots', $snapshotsPage['component']);
        $this->assertSame($snapshot->id, $snapshotsPage['props']['snapshots'][0]['snapshot_id']);
        $this->assertSame(1, $snapshotsPage['props']['snapshots'][0]['library_games']);
        $this->assertSame(1, $snapshotsPage['props']['snapshots'][0]['completed']);
        $this->assertSame($snapshot->id, $snapshotsPage['props']['confirmedCurrentYear']['snapshot_id']);

        $detailsPage = $this->get("/snapshots/{$snapshot->id}")->assertOk()->viewData('page');

        $this->assertSame('Snapshots', $detailsPage['component']);
        $this->assertSame($snapshot->id, $detailsPage['props']['selectedSnapshot']['snapshot_id']);
        $this->assertSame('Snapshot Game', $detailsPage['props']['selectedSnapshot']['games'][0]['title']);
        $this->assertSame('Steam', $detailsPage['props']['selectedSnapshot']['games'][0]['platform']);
    }

    public function test_snapshot_routes_can_create_selected_years_and_delete_runs(): void
    {
        app(LibraryGameCreator::class)->create($this->user, $this->payload());
        $year = (int) now()->format('Y');

        $this->post('/snapshots', ['year' => $year])->assertRedirect();

        $snapshot = SnapshotRun::where('user_id', $this->user->id)
            ->where('year', $year)
            ->where('status', 'draft')
            ->firstOrFail();

        $this->assertSame(1, DB::table('library_game_snapshots')->where('snapshot_run_id', $snapshot->id)->count());

        $this->delete("/snapshots/{$snapshot->id}")->assertRedirect('/snapshots');

        $this->assertDatabaseMissing('snapshot_runs', ['id' => $snapshot->id]);
        $this->assertSame(0, DB::table('library_game_snapshots')->where('snapshot_run_id', $snapshot->id)->count());

        $this->post('/snapshots', ['year' => $year + 1])->assertRedirect();
        $this->assertDatabaseHas('snapshot_runs', ['year' => $year + 1, 'status' => 'draft']);
    }

    public function test_snapshot_best_games_are_limited_to_completed_games_for_that_year_and_unique_by_global_game(): void
    {
        $year = (int) now()->format('Y');
        $nextYear = $year + 1;
        $completed = Status::where('name', 'Completed')->firstOrFail();
        $inProgress = Status::where('name', 'In Progress')->firstOrFail();
        $creator = app(LibraryGameCreator::class);

        $bestSteam = $creator->create($this->user, $this->payload([
            'game' => [
                'title' => 'Little Nightmares',
                'source' => 'manual',
                'total_achievements' => 10,
                'create_duplicate_anyway' => true,
            ],
            'progress' => [
                'status_id' => $completed->id,
                'playtime_hours' => 8,
                'earned_achievements' => 4,
                'completed_at' => "{$year}-04-12",
            ],
        ]));

        $notEligible = $creator->create($this->user, $this->payload([
            'game' => [
                'title' => 'Unfinished Game',
                'source' => 'manual',
                'total_achievements' => 10,
                'create_duplicate_anyway' => true,
            ],
            'progress' => [
                'status_id' => $inProgress->id,
                'playtime_hours' => 4,
                'earned_achievements' => 1,
            ],
        ]));

        $bestXbox = $creator->create($this->user, $this->payload([
            'game' => [
                'title' => 'Little Nightmares Xbox',
                'source' => 'manual',
                'total_achievements' => 10,
                'create_duplicate_anyway' => true,
            ],
            'progress' => [
                'status_id' => $completed->id,
                'playtime_hours' => 9,
                'earned_achievements' => 5,
                'completed_at' => "{$nextYear}-01-08",
            ],
        ], 'Xbox', 'Xbox Series X|S', 'Digital'));
        $bestXbox->update(['game_id' => $bestSteam->game_id]);

        $snapshot = app(SnapshotService::class)->createDraft($this->user, $year);
        $eligible = collect(app(SnapshotService::class)->eligibleBestGames($snapshot));

        $this->assertTrue($eligible->contains('library_game_id', $bestSteam->id));
        $this->assertFalse($eligible->contains('library_game_id', $notEligible->id));

        $this->patch("/snapshots/{$snapshot->id}/best-games", [
            'library_game_ids' => [$bestSteam->id],
        ])->assertRedirect();

        $this->assertDatabaseHas('snapshot_best_games', [
            'snapshot_run_id' => $snapshot->id,
            'library_game_id' => $bestSteam->id,
            'game_id' => $bestSteam->game_id,
            'rank' => 1,
        ]);

        app(SnapshotService::class)->confirm($snapshot);

        $this->patch("/snapshots/{$snapshot->id}/best-games", [
            'library_game_ids' => [],
        ])->assertSessionHasErrors('best_games');

        $nextSnapshot = app(SnapshotService::class)->createDraft($this->user, $nextYear);
        $nextEligible = collect(app(SnapshotService::class)->eligibleBestGames($nextSnapshot));

        $this->assertFalse($nextEligible->contains('library_game_id', $bestXbox->id));
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
