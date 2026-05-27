<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Device;
use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\ExternalGameId;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderImportDraft;
use App\Models\StupidLog\Status;
use App\Models\User;
use App\Services\LibraryGameCreator;
use App\Services\SteamEnrichmentService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SteamEnrichmentTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_steam_enrichment_stores_achievements_price_and_dlc_catalog_idempotently(): void
    {
        Http::fake($this->steamResponses());

        $game = Game::create([
            'title' => 'Steam Game',
            'normalized_title' => 'steam game',
        ]);

        $service = app(SteamEnrichmentService::class);
        $this->assertSame([], $service->enrich($game, '100', $this->user));
        $this->assertSame([], $service->enrich($game->refresh(), '100', $this->user));

        $game->refresh();

        $this->assertSame(3, $game->total_achievements);
        $this->assertSame('steam', $game->total_achievements_source);
        $this->assertSame('59.99', (string) $game->base_price_default);
        $this->assertSame('steam', $game->base_price_source);
        $this->assertSame(2, Dlc::where('game_id', $game->id)->count());
        $this->assertSame(1, Dlc::where('steam_app_id', '200')->count());
        $this->assertSame(1, Dlc::where('steam_app_id', '201')->count());
        $this->assertSame(1, ExternalGameId::where('external_id', '100')->where('provider_id', Provider::where('key', 'steam')->first()->id)->count());
    }

    public function test_steam_enrichment_fetches_dlc_details_in_chunks_without_cover_downloads(): void
    {
        $dlcIds = range(1000, 1104);

        Http::fake([
            'store.steampowered.com/api/appdetails*' => function ($request) use ($dlcIds) {
                parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);
                $appIds = explode(',', $query['appids'] ?? '');

                if ($appIds === ['100']) {
                    return Http::response([
                        '100' => [
                            'success' => true,
                            'data' => [
                                'name' => 'Steam Game',
                                'dlc' => $dlcIds,
                            ],
                        ],
                    ]);
                }

                $this->assertLessThanOrEqual(25, count($appIds));

                return Http::response(collect($appIds)
                    ->mapWithKeys(fn (string $appId) => [
                        $appId => [
                            'success' => true,
                            'data' => [
                                'name' => "Expansion {$appId}",
                                'price_overview' => ['initial' => 999],
                            ],
                        ],
                    ])
                    ->all());
            },
            'api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/*' => Http::response(['game' => ['availableGameStats' => ['achievements' => []]]]),
        ]);

        $game = Game::create([
            'title' => 'Steam Game',
            'normalized_title' => 'steam game',
        ]);

        $this->assertSame([], app(SteamEnrichmentService::class)->enrich($game, '100', $this->user));
        $this->assertSame(count($dlcIds), Dlc::where('game_id', $game->id)->count());
    }

    public function test_steam_enrichment_failures_do_not_block_manual_game_creation(): void
    {
        Http::fake([
            'store.steampowered.com/*' => Http::response(['error' => 'unavailable'], 500),
            'api.steampowered.com/*' => Http::response(['error' => 'unavailable'], 500),
        ]);

        $libraryGame = app(LibraryGameCreator::class)->create($this->user, $this->payload([
            'game' => [
                'title' => 'Manual Steam Linked Game',
                'source' => 'manual',
                'steam_app_id' => '100',
                'create_duplicate_anyway' => true,
            ],
        ]));

        $this->assertSame('Manual Steam Linked Game', $libraryGame->game->title);
        $this->assertDatabaseHas('external_game_ids', [
            'game_id' => $libraryGame->game_id,
            'provider_id' => Provider::where('key', 'steam')->first()->id,
            'external_id' => '100',
        ]);
    }

    public function test_library_game_creation_does_not_enrich_during_final_save(): void
    {
        Http::fake(function ($request) {
            $this->fail('Final save must not call Steam: '.$request->url());
        });

        $libraryGame = app(LibraryGameCreator::class)->create($this->user, $this->payload([
            'game' => [
                'title' => 'Portal 2',
                'source' => 'igdb',
                'external_ids' => ['igdb' => 'igdb-portal-2'],
                'steam_app_id' => '100',
                'create_duplicate_anyway' => true,
            ],
        ]));

        $game = $libraryGame->game->refresh();

        $this->assertSame(0, $game->total_achievements);
        $this->assertNull($game->base_price_default);
        $this->assertSame(0, Dlc::where('game_id', $game->id)->count());
        $this->assertDatabaseHas('external_game_ids', [
            'game_id' => $game->id,
            'provider_id' => Provider::where('key', 'steam')->first()->id,
            'external_id' => '100',
        ]);
    }

    public function test_library_game_creation_can_mark_imported_steam_dlcs_owned_by_app_id(): void
    {
        Http::fake();

        $draft = ProviderImportDraft::create([
            'user_id' => $this->user->id,
            'provider_key' => 'steam',
            'external_id' => '100',
            'steam_app_id' => '100',
            'game_payload' => [
                'title' => 'Portal 2',
                'source' => 'steam',
                'external_id' => '100',
                'external_ids' => ['steam' => '100'],
                'steam_app_id' => '100',
                'total_achievements' => 3,
                'total_achievements_source' => 'steam',
                'base_price_default' => 59.99,
                'base_price_source' => 'steam',
            ],
            'dlcs' => [
                ['steam_app_id' => '200', 'title' => 'Expansion One', 'base_price' => 19.99],
                ['steam_app_id' => '201', 'title' => 'Expansion Two', 'base_price' => 0],
            ],
            'expires_at' => now()->addHour(),
        ]);

        $this->post('/library-games', $this->payload([
            'import_draft_id' => $draft->id,
            'game' => [
                'title' => 'Portal 2',
                'source' => 'steam',
                'external_id' => '100',
                'steam_app_id' => '100',
                'create_duplicate_anyway' => true,
            ],
            'owned_dlcs' => [[
                'steam_app_id' => '200',
                'acquisition_type' => 'Owned',
                'purchased_price' => 7.5,
                'purchased_at' => '2026-05-23',
            ]],
        ]))->assertRedirect();

        $libraryGame = $this->user->libraryGames()->latest()->firstOrFail();

        $dlc = Dlc::where('game_id', $libraryGame->game_id)
            ->where('steam_app_id', '200')
            ->firstOrFail();

        $this->assertDatabaseHas('owned_dlcs', [
            'library_game_id' => $libraryGame->id,
            'dlc_id' => $dlc->id,
            'acquisition_type' => 'Owned',
            'purchased_price' => 7.5,
            'purchased_at' => '2026-05-23 00:00:00',
        ]);
    }

    private function steamResponses(): array
    {
        return [
            'store.steampowered.com/api/appdetails*' => function ($request) {
                parse_str(parse_url($request->url(), PHP_URL_QUERY) ?? '', $query);
                $appIds = explode(',', $query['appids'] ?? '');

                if ($appIds === ['100']) {
                    return Http::response([
                        '100' => [
                            'success' => true,
                            'data' => [
                                'name' => 'Steam Game',
                                'price_overview' => ['initial' => 5999],
                                'dlc' => [200, 201],
                            ],
                        ],
                    ]);
                }

                return Http::response([
                    '200' => [
                        'success' => true,
                        'data' => [
                            'name' => 'Expansion One',
                            'header_image' => 'https://cdn.example.test/200.jpg',
                            'price_overview' => ['initial' => 1999],
                        ],
                    ],
                    '201' => [
                        'success' => true,
                        'data' => [
                            'name' => 'Expansion Two',
                            'header_image' => 'https://cdn.example.test/201.jpg',
                            'is_free' => true,
                        ],
                    ],
                ]);
            },
            'api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/*' => Http::response([
                'game' => [
                    'availableGameStats' => [
                        'achievements' => [
                            ['name' => 'A'],
                            ['name' => 'B'],
                            ['name' => 'C'],
                        ],
                    ],
                ],
            ]),
        ];
    }

    private function payload(array $overrides = []): array
    {
        $platform = Platform::where('name', 'Steam')->firstOrFail();
        $device = Device::where('name', 'PC')->firstOrFail();
        $ownership = OwnershipType::where('name', 'Digital')->firstOrFail();
        $status = Status::where('name', 'Not Played')->firstOrFail();

        return array_replace_recursive([
            'game' => [
                'title' => 'Steam Linked Game',
                'source' => 'manual',
                'total_achievements' => 0,
                'create_duplicate_anyway' => true,
            ],
            'platform_id' => $platform->id,
            'device_ids' => [$device->id],
            'ownership_copies' => [[
                'ownership_type_id' => $ownership->id,
                'base_price' => 20,
                'purchased_price' => 10,
            ]],
            'progress' => [
                'status_id' => $status->id,
                'playtime_hours' => 0,
                'earned_achievements' => 0,
            ],
        ], $overrides);
    }
}
