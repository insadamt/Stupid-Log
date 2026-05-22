<?php

namespace Database\Seeders;

use App\Models\StupidLog\Device;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\Status;
use App\Models\User;
use Illuminate\Database\Seeder;

class StupidLogDemoLibrarySeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(['username' => 'Player One'], ['avatar_path' => null]);
        $manual = Provider::where('key', 'manual')->firstOrFail();

        foreach ($this->games() as $item) {
            $game = Game::updateOrCreate(
                ['normalized_title' => $item['normalized_title']],
                [
                    'title' => $item['title'],
                    'cover_url_original' => $item['cover_url_original'],
                    'publisher' => $item['publisher'],
                    'release_date' => $item['release_date'],
                    'description' => $item['description'],
                    'source_provider_id' => $manual->id,
                    'base_price_default' => $item['base_price_default'],
                    'base_price_source' => 'manual',
                    'total_achievements' => $item['total_achievements'],
                    'total_achievements_source' => 'manual',
                    'provider_synced_at' => now(),
                ],
            );

            $platform = Platform::where('name', $item['platform'])->firstOrFail();
            $status = Status::where('name', $item['status'])->firstOrFail();

            $libraryGame = LibraryGame::updateOrCreate(
                ['user_id' => $user->id, 'game_id' => $game->id, 'platform_id' => $platform->id],
                [
                    'status_id' => $status->id,
                    'playtime_hours' => $item['playtime_hours'],
                    'earned_achievements' => $item['earned_achievements'],
                    'first_played_at' => $item['first_played_at'],
                    'last_played_at' => $item['last_played_at'],
                    'completed_at' => $item['completed_at'],
                ],
            );

            $deviceIds = Device::whereIn('name', $item['devices'])->pluck('id');
            $libraryGame->devices()->sync($deviceIds);

            foreach ($item['ownership'] as $ownership) {
                $ownershipType = OwnershipType::where('name', $ownership['type'])->firstOrFail();
                $libraryGame->ownershipCopies()->updateOrCreate(
                    ['ownership_type_id' => $ownershipType->id],
                    [
                        'edition_name' => $ownership['edition_name'] ?? null,
                        'base_price' => $ownership['base_price'],
                        'purchased_price' => $ownership['purchased_price'],
                        'purchased_at' => $ownership['purchased_at'] ?? null,
                    ],
                );
            }
        }
    }

    private function games(): array
    {
        return [
            [
                'title' => 'Forza Horizon 6',
                'normalized_title' => 'forza horizon 6',
                'cover_url_original' => 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2lbd.jpg',
                'publisher' => 'Xbox Games Studio',
                'release_date' => '2026-10-10',
                'description' => 'Discover a fast open-world driving festival built for collecting cars, chasing completion, and tracking every platform copy in your archive.',
                'base_price_default' => 69.99,
                'total_achievements' => 76,
                'platform' => 'Xbox',
                'devices' => ['PC', 'Xbox Series X|S'],
                'status' => 'Not Played',
                'playtime_hours' => 0,
                'earned_achievements' => 0,
                'first_played_at' => null,
                'last_played_at' => null,
                'completed_at' => null,
                'ownership' => [
                    ['type' => 'Digital', 'edition_name' => 'Premium Edition', 'base_price' => 99.99, 'purchased_price' => 59.99, 'purchased_at' => '2026-05-01'],
                    ['type' => 'Game Pass', 'base_price' => 69.99, 'purchased_price' => 0, 'purchased_at' => '2026-05-01'],
                ],
            ],
            [
                'title' => 'Little Nightmares',
                'normalized_title' => 'little nightmares',
                'cover_url_original' => 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r1f.jpg',
                'publisher' => 'Bandai Namco Entertainment',
                'release_date' => '2017-04-28',
                'description' => 'A dark puzzle-platforming journey through a distorted vessel, tracked here as a completed entry in the personal archive.',
                'base_price_default' => 19.99,
                'total_achievements' => 22,
                'platform' => 'Xbox',
                'devices' => ['Xbox One', 'Xbox Series X|S'],
                'status' => '100%',
                'playtime_hours' => 18.5,
                'earned_achievements' => 22,
                'first_played_at' => '2025-11-02',
                'last_played_at' => '2025-11-14',
                'completed_at' => '2025-11-14',
                'ownership' => [
                    ['type' => 'Digital', 'base_price' => 19.99, 'purchased_price' => 4.99, 'purchased_at' => '2025-10-30'],
                ],
            ],
            [
                'title' => 'Neverness to Everness',
                'normalized_title' => 'neverness to everness',
                'cover_url_original' => 'https://images.igdb.com/igdb/image/upload/t_cover_big/co8u7y.jpg',
                'publisher' => 'Hotta Studio',
                'release_date' => '2026-12-31',
                'description' => 'A bright urban open-world RPG placeholder in the active library, useful for checking in-progress states and low achievement data.',
                'base_price_default' => 0,
                'total_achievements' => 0,
                'platform' => 'Epic Games',
                'devices' => ['PC'],
                'status' => 'In Progress',
                'playtime_hours' => 6.2,
                'earned_achievements' => null,
                'first_played_at' => '2026-05-18',
                'last_played_at' => '2026-05-21',
                'completed_at' => null,
                'ownership' => [
                    ['type' => 'Digital', 'base_price' => 0, 'purchased_price' => 0, 'purchased_at' => '2026-05-18'],
                ],
            ],
            [
                'title' => 'Hollow Knight',
                'normalized_title' => 'hollow knight',
                'cover_url_original' => 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg',
                'publisher' => 'Team Cherry',
                'release_date' => '2017-02-24',
                'description' => 'A hand-drawn action adventure saved as a Steam library game with a partly completed achievement track.',
                'base_price_default' => 14.99,
                'total_achievements' => 63,
                'platform' => 'Steam',
                'devices' => ['PC'],
                'status' => 'In Progress',
                'playtime_hours' => 42.8,
                'earned_achievements' => 31,
                'first_played_at' => '2026-02-01',
                'last_played_at' => '2026-05-20',
                'completed_at' => null,
                'ownership' => [
                    ['type' => 'Digital', 'base_price' => 14.99, 'purchased_price' => 7.49, 'purchased_at' => '2026-01-28'],
                ],
            ],
        ];
    }
}
