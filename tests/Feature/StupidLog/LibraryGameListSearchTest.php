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

class LibraryGameListSearchTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_library_search_finds_title_regardless_of_case(): void
    {
        $this->createLibraryGame('Portal', 'Steam', 'PC', 'Digital');
        $this->createLibraryGame('Celeste', 'GOG', 'PC', 'Digital');

        $this->assertSearchReturnsSameTitles(['portal', 'Portal', 'PORTAL'], ['Portal']);
    }

    public function test_library_search_finds_publisher_regardless_of_case(): void
    {
        $this->createLibraryGame('Half-Life', 'Steam', 'PC', 'Digital', 'Valve');
        $this->createLibraryGame('Hades', 'GOG', 'PC', 'Digital', 'Supergiant Games');

        $this->assertSearchReturnsSameTitles(['valve', 'Valve', 'VALVE'], ['Half-Life']);
    }

    public function test_library_search_finds_platform_regardless_of_case(): void
    {
        $this->createLibraryGame('Steam Platform Match', 'Steam', 'PC', 'Digital');
        $this->createLibraryGame('GOG Platform Miss', 'GOG', 'PC', 'Digital');

        $this->assertSearchReturnsSameTitles(['steam', 'Steam', 'STEAM'], ['Steam Platform Match']);
    }

    public function test_library_search_finds_device_regardless_of_case(): void
    {
        $this->createLibraryGame('PC Device Match', 'Steam', 'PC', 'Digital');
        $this->createLibraryGame('PS5 Device Miss', 'PS Network', 'PS5', 'Digital');

        $this->assertSearchReturnsSameTitles(['pc', 'PC', 'Pc'], ['PC Device Match']);
    }

    public function test_library_search_finds_ownership_type_regardless_of_case(): void
    {
        $this->createLibraryGame('Digital Ownership Match', 'Steam', 'PC', 'Digital');
        $this->createLibraryGame('Game Pass Ownership Miss', 'Xbox', 'Xbox Series X|S', 'Game Pass');

        $this->assertSearchReturnsSameTitles(['digital', 'Digital', 'DIGITAL'], ['Digital Ownership Match']);
    }

    public function test_title_sorting_is_case_insensitive_and_stable(): void
    {
        $this->createLibraryGame('alpha', 'Steam', 'PC', 'Digital');
        $this->createLibraryGame('Alpha', 'GOG', 'PC', 'Digital');
        $this->createLibraryGame('Beta', 'Xbox', 'Xbox Series X|S', 'Digital');

        $this->assertSame(['alpha', 'Alpha', 'Beta'], $this->libraryGameTitles('/library-games?sort=title'));
    }

    public function test_advanced_filters_can_target_library_metadata(): void
    {
        $this->createLibraryGame('Xbox Console Digital', 'Xbox', 'Xbox Series X|S', 'Digital', options: [
            'total_achievements' => 10,
            'cover_path' => 'covers/games/xbox.webp',
            'first_played_at' => '2024-03-01',
        ]);
        $this->createLibraryGame('Xbox Subscription', 'Xbox', 'PC', 'Game Pass', options: [
            'total_achievements' => 0,
            'completed_at' => '2025-04-10',
            'status' => 'Completed',
        ]);

        $this->assertSame(['Xbox Console Digital'], $this->libraryGameTitles('/library-games?ownership_type=Digital'));
        $this->assertSame(['Xbox Console Digital'], $this->libraryGameTitles('/library-games?device=Xbox%20Series%20X%7CS'));
        $this->assertSame(['Xbox Console Digital'], $this->libraryGameTitles('/library-games?achievements=has'));
        $this->assertSame(['Xbox Subscription'], $this->libraryGameTitles('/library-games?achievements=none'));
        $this->assertSame(['Xbox Console Digital'], $this->libraryGameTitles('/library-games?cover=has'));
        $this->assertSame(['Xbox Subscription'], $this->libraryGameTitles('/library-games?cover=missing'));
        $this->assertSame(['Xbox Console Digital'], $this->libraryGameTitles('/library-games?first_played_year=2024'));
        $this->assertSame(['Xbox Subscription'], $this->libraryGameTitles('/library-games?completed_year=2025'));
    }

    public function test_search_filters_and_sort_work_together(): void
    {
        $this->createLibraryGame('Alpha Portable Match', 'Xbox', 'Xbox Series X|S', 'Digital', options: [
            'total_achievements' => 5,
            'playtime_hours' => 4,
            'first_played_at' => '2024-01-02',
        ]);
        $this->createLibraryGame('Beta Portable Match', 'Xbox', 'Xbox Series X|S', 'Digital', options: [
            'total_achievements' => 5,
            'playtime_hours' => 12,
            'first_played_at' => '2024-05-02',
        ]);
        $this->createLibraryGame('Portable Wrong Device', 'Xbox', 'PC', 'Digital', options: [
            'total_achievements' => 5,
            'playtime_hours' => 99,
            'first_played_at' => '2024-03-02',
        ]);

        $query = http_build_query([
            'query' => 'portable',
            'platform' => 'Xbox',
            'ownership_type' => 'Digital',
            'device' => 'Xbox Series X|S',
            'achievements' => 'has',
            'first_played_year' => '2024',
            'sort' => 'playtime',
        ]);

        $this->assertSame(['Beta Portable Match', 'Alpha Portable Match'], $this->libraryGameTitles("/library-games?{$query}"));
    }

    public function test_library_page_uses_query_params_for_initial_results(): void
    {
        $this->createLibraryGame('Alpha Portable Match', 'Xbox', 'Xbox Series X|S', 'Digital', options: [
            'total_achievements' => 5,
            'playtime_hours' => 4,
            'first_played_at' => '2024-01-02',
        ]);
        $this->createLibraryGame('Beta Portable Match', 'Xbox', 'Xbox Series X|S', 'Digital', options: [
            'total_achievements' => 5,
            'playtime_hours' => 12,
            'first_played_at' => '2024-05-02',
        ]);
        $this->createLibraryGame('Portable Wrong Device', 'Xbox', 'PC', 'Digital', options: [
            'total_achievements' => 5,
            'playtime_hours' => 99,
            'first_played_at' => '2024-03-02',
        ]);

        $query = http_build_query([
            'query' => 'portable',
            'platform' => 'Xbox',
            'ownership_type' => 'Digital',
            'device' => 'Xbox Series X|S',
            'achievements' => 'has',
            'first_played_year' => '2024',
            'sort' => 'playtime',
        ]);

        $page = $this->get("/library?{$query}")->assertOk()->viewData('page');

        $this->assertSame('Library', $page['component']);
        $this->assertSame(['Beta Portable Match', 'Alpha Portable Match'], collect($page['props']['libraryGames'])->pluck('title')->all());
    }

    private function assertSearchReturnsSameTitles(array $queries, array $expectedTitles): void
    {
        foreach ($queries as $query) {
            $this->assertSame($expectedTitles, $this->libraryGameTitles('/library-games?query='.urlencode($query)));
        }
    }

    private function libraryGameTitles(string $url): array
    {
        return collect($this->getJson($url)
            ->assertOk()
            ->json('items'))
            ->pluck('title')
            ->all();
    }

    private function createLibraryGame(
        string $title,
        string $platform,
        string $device,
        string $ownership,
        ?string $publisher = null,
        array $options = [],
    ): void {
        app(LibraryGameCreator::class)->create($this->user, $this->payload($title, $platform, $device, $ownership, $publisher, $options));
    }

    private function payload(string $title, string $platform, string $device, string $ownership, ?string $publisher, array $options): array
    {
        $platformModel = Platform::where('name', $platform)->firstOrFail();
        $deviceModel = Device::where('name', $device)->firstOrFail();
        $ownershipModel = OwnershipType::where('name', $ownership)->firstOrFail();
        $status = Status::where('name', $options['status'] ?? 'Not Played')->firstOrFail();

        return [
            'game' => [
                'title' => $title,
                'source' => 'manual',
                'publisher' => $publisher,
                'cover_path' => $options['cover_path'] ?? null,
                'cover_url_original' => $options['cover_url_original'] ?? null,
                'total_achievements' => $options['total_achievements'] ?? 0,
                'create_duplicate_anyway' => true,
            ],
            'platform_id' => $platformModel->id,
            'device_ids' => [$deviceModel->id],
            'ownership_copies' => [[
                'ownership_type_id' => $ownershipModel->id,
                'physical_status_id' => PhysicalStatus::where('name', 'Complete')->firstOrFail()->id,
                'base_price' => 20,
                'purchased_price' => 10,
            ]],
            'progress' => [
                'status_id' => $status->id,
                'playtime_hours' => $options['playtime_hours'] ?? 0,
                'earned_achievements' => $options['earned_achievements'] ?? 0,
                'first_played_at' => $options['first_played_at'] ?? null,
                'last_played_at' => $options['last_played_at'] ?? null,
                'completed_at' => $options['completed_at'] ?? null,
            ],
        ];
    }
}
