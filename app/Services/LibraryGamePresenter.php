<?php

namespace App\Services;

use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\OwnershipType;

class LibraryGamePresenter
{
    public function __construct(private readonly LinkedProgressService $linkedProgress) {}

    public function cards($libraryGames)
    {
        return $libraryGames->map(fn (LibraryGame $libraryGame) => $this->card($libraryGame))->values();
    }

    public function card(LibraryGame $libraryGame): array
    {
        $game = $libraryGame->game;
        $libraryGame->loadMissing('progressLink.sourceLibraryGame.game', 'progressLink.sourceLibraryGame.platform', 'progressLink.sourceLibraryGame.status');
        if (! array_key_exists('progress_links_as_source_count', $libraryGame->getAttributes())) {
            $libraryGame->loadCount('progressLinksAsSource');
        }

        return [
            'id' => $libraryGame->id,
            'title' => $game->title,
            'publisher' => $game->publisher,
            'description' => $game->description,
            'cover_path' => $game->cover_path,
            'cover_url' => $game->cover_path ? asset('storage/'.$game->cover_path) : $game->cover_url_original,
            'platform' => $libraryGame->platform->name,
            'status' => $libraryGame->status->name,
            'status_color_key' => $libraryGame->status->color_key,
            'status_color_hex' => $libraryGame->status->color_hex,
            'playtime_hours' => (float) $libraryGame->playtime_hours,
            'earned_achievements' => $libraryGame->earned_achievements ?? 0,
            'total_achievements' => $game->total_achievements ?? 0,
            'first_played_at' => $libraryGame->first_played_at?->format('Y-m-d'),
            'last_played_at' => $libraryGame->last_played_at?->format('Y-m-d'),
            'completed_at' => $libraryGame->completed_at?->format('Y-m-d'),
            'progress' => $game->total_achievements ? round((($libraryGame->earned_achievements ?? 0) / $game->total_achievements) * 100) : 0,
            'effective_progress' => $this->storedProgress($libraryGame),
            'local_progress' => $this->storedProgress($libraryGame),
            'linked_progress' => $this->linkedProgress->linkPayload($libraryGame->progressLink),
            'linked_progress_summary' => [
                'is_target' => $libraryGame->progressLink !== null,
                'source_count' => (int) $libraryGame->progress_links_as_source_count,
            ],
            'ownership' => $libraryGame->ownershipCopies->map(fn ($copy) => $copy->ownershipType?->name ?? OwnershipType::find($copy->ownership_type_id)?->name)->filter()->values(),
            'devices' => $libraryGame->devices->pluck('name')->values(),
            'base_price_default' => $game->base_price_default,
        ];
    }

    public function details(LibraryGame $libraryGame): array
    {
        $libraryGame->loadMissing('progressLink.sourceLibraryGame.game', 'progressLink.sourceLibraryGame.platform', 'progressLink.sourceLibraryGame.status');

        return [
            'platform_id' => $libraryGame->platform_id,
            'device_ids' => $libraryGame->devices->pluck('id')->values(),
            'linked_progress' => $this->linkedProgress->linkPayload($libraryGame->progressLink),
            'effective_progress' => $this->storedProgress($libraryGame),
            'local_progress' => $this->storedProgress($libraryGame),
            'ownership_copies' => $libraryGame->ownershipCopies->map(fn (OwnershipCopy $copy) => [
                'id' => $copy->id,
                'ownership_type_id' => $copy->ownership_type_id,
                'ownership_type' => $copy->ownershipType?->name,
                'physical_status_id' => $copy->physical_status_id,
                'physical_status' => $copy->physicalStatus?->name,
                'edition_name' => $copy->edition_name,
                'base_price' => $copy->base_price,
                'purchased_price' => $copy->purchased_price,
                'purchased_at' => $copy->purchased_at?->format('Y-m-d'),
            ])->values(),
            'platform_ownership_types' => $libraryGame->platform->ownershipTypes->map(fn (OwnershipType $type) => [
                'id' => $type->id,
                'name' => $type->name,
            ])->values(),
        ];
    }

    public function dlcs(LibraryGame $libraryGame)
    {
        return $libraryGame->game->dlcs->map(function (Dlc $dlc) use ($libraryGame) {
            $ownedDlc = $libraryGame->ownedDlcs->firstWhere('dlc_id', $dlc->id);

            return [
                'id' => $dlc->id,
                'owned_dlc_id' => $ownedDlc?->id,
                'title' => $dlc->title,
                'base_price' => $dlc->base_price,
                'state' => $ownedDlc?->acquisition_type ?? 'Not Owned',
                'purchased_price' => $ownedDlc?->purchased_price,
                'purchased_at' => $ownedDlc?->purchased_at?->format('Y-m-d'),
            ];
        })->values();
    }

    private function storedProgress(LibraryGame $libraryGame): array
    {
        $totalAchievements = (int) ($libraryGame->game?->total_achievements ?? 0);
        $earnedAchievements = (int) ($libraryGame->earned_achievements ?? 0);

        return [
            'status_id' => $libraryGame->status_id,
            'status' => $libraryGame->status?->name,
            'status_color_key' => $libraryGame->status?->color_key,
            'status_color_hex' => $libraryGame->status?->color_hex,
            'playtime_hours' => (float) $libraryGame->playtime_hours,
            'earned_achievements' => $earnedAchievements,
            'total_achievements' => $totalAchievements,
            'first_played_at' => $libraryGame->first_played_at?->format('Y-m-d'),
            'last_played_at' => $libraryGame->last_played_at?->format('Y-m-d'),
            'completed_at' => $libraryGame->completed_at?->format('Y-m-d'),
            'progress' => $totalAchievements > 0 ? (int) round(($earnedAchievements / $totalAchievements) * 100) : 0,
            'field_sources' => $this->linkedProgress->fieldSources($libraryGame->progressLink),
        ];
    }
}
