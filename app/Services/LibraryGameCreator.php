<?php

namespace App\Services;

use App\Models\StupidLog\Device;
use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\PhysicalStatus;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\Status;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LibraryGameCreator
{
    private const PHYSICAL_LIKE = ['Physical', 'Pre-owned', 'Borrowed'];

    public function __construct(
        private readonly TitleNormalizer $normalizer,
        private readonly DuplicateDetectionService $duplicates,
        private readonly SteamEnrichmentService $steam,
    ) {}

    public function create(User $user, array $payload): LibraryGame
    {
        $this->validatePayload($payload);

        return DB::transaction(function () use ($user, $payload) {
            $game = $this->resolveGame($payload['game'], $user);
            $platform = Platform::findOrFail($payload['platform_id']);
            $status = Status::findOrFail($payload['progress']['status_id']);

            $this->assertProgressIsValid($game, $status, $payload['progress'], $payload['game']);
            $this->assertDevicesAreValid($platform, $payload['device_ids']);
            $this->assertOwnershipCopiesAreValid($platform, $payload['ownership_copies']);

            if (LibraryGame::where('user_id', $user->id)->where('game_id', $game->id)->where('platform_id', $platform->id)->exists()) {
                throw ValidationException::withMessages(['platform_id' => 'This game already exists on the selected platform.']);
            }

            $libraryGame = LibraryGame::create([
                'user_id' => $user->id,
                'game_id' => $game->id,
                'platform_id' => $platform->id,
                'status_id' => $status->id,
                'playtime_hours' => $payload['progress']['playtime_hours'] ?? 0,
                'earned_achievements' => $payload['progress']['earned_achievements'] ?? null,
                'first_played_at' => $payload['progress']['first_played_at'] ?? null,
                'last_played_at' => $payload['progress']['last_played_at'] ?? null,
                'completed_at' => $this->completedAt($status, $payload['progress']),
            ]);

            $libraryGame->devices()->sync($payload['device_ids']);

            foreach ($payload['ownership_copies'] as $copy) {
                $ownershipType = OwnershipType::findOrFail($copy['ownership_type_id']);
                $physicalStatusId = $this->physicalStatusId($ownershipType->name, $copy);

                $libraryGame->ownershipCopies()->create([
                    'ownership_type_id' => $ownershipType->id,
                    'physical_status_id' => $physicalStatusId,
                    'edition_name' => $copy['edition_name'] ?? null,
                    'base_price' => $copy['base_price'] ?? null,
                    'purchased_price' => $copy['purchased_price'] ?? null,
                    'purchased_at' => $copy['purchased_at'] ?? null,
                ]);
            }

            foreach ($payload['owned_dlcs'] ?? [] as $ownedDlc) {
                $acquisitionType = $ownedDlc['acquisition_type'];
                $dlc = $this->resolveDlc($game, $ownedDlc);

                $libraryGame->ownedDlcs()->create([
                    'dlc_id' => $dlc->id,
                    'acquisition_type' => $acquisitionType,
                    'purchased_price' => in_array($acquisitionType, ['Edition Included', 'Free'], true)
                        ? 0
                        : ($ownedDlc['purchased_price'] ?? null),
                    'purchased_at' => $ownedDlc['purchased_at'] ?? null,
                ]);
            }

            return $libraryGame->load(['game', 'platform', 'status', 'devices', 'ownershipCopies', 'ownedDlcs']);
        });
    }

    private function validatePayload(array $payload): void
    {
        foreach (['game', 'platform_id', 'device_ids', 'ownership_copies', 'progress'] as $key) {
            if (! array_key_exists($key, $payload)) {
                throw ValidationException::withMessages([$key => 'This field is required.']);
            }
        }

        if (! $payload['device_ids']) {
            throw ValidationException::withMessages(['device_ids' => 'Select at least one valid device.']);
        }

        if (! $payload['ownership_copies']) {
            throw ValidationException::withMessages(['ownership_copies' => 'Add at least one ownership copy.']);
        }
    }

    private function resolveGame(array $gamePayload, User $user): Game
    {
        $steamAppId = $this->steamAppId($gamePayload);

        foreach (['igdb', 'steam'] as $providerKey) {
            $externalId = Arr::get($gamePayload, "external_ids.$providerKey");
            if ($externalId && $existing = $this->duplicates->findByExternalId($providerKey, (string) $externalId)) {
                $this->steam->enrich($existing, $steamAppId, $user);

                return $existing;
            }
        }

        if ($steamAppId && $existing = $this->duplicates->findByExternalId('steam', $steamAppId)) {
            $this->steam->enrich($existing, $steamAppId, $user);

            return $existing;
        }

        if (($gamePayload['source'] ?? 'manual') === 'manual') {
            $possible = $this->duplicates->possibleManualDuplicates($gamePayload['title'], $gamePayload['release_date'] ?? null);
            if ($possible->isNotEmpty() && ! ($gamePayload['create_duplicate_anyway'] ?? false)) {
                throw ValidationException::withMessages([
                    'game' => 'Possible existing game found. Use existing or confirm create new anyway.',
                ]);
            }
        }

        $provider = Provider::where('key', $gamePayload['source'] ?? 'manual')->first();

        $game = Game::create([
            'title' => $gamePayload['title'],
            'normalized_title' => $this->normalizer->normalize($gamePayload['title']),
            'cover_url_original' => $gamePayload['cover_url_original'] ?? null,
            'cover_path' => $gamePayload['cover_path'] ?? null,
            'publisher' => $gamePayload['publisher'] ?? null,
            'release_date' => $gamePayload['release_date'] ?? null,
            'description' => $gamePayload['description'] ?? null,
            'source_provider_id' => $provider?->id,
            'base_price_default' => $gamePayload['base_price_default'] ?? null,
            'base_price_source' => $gamePayload['base_price_source'] ?? null,
            'total_achievements' => $gamePayload['total_achievements'] ?? null,
            'total_achievements_source' => $gamePayload['total_achievements_source'] ?? null,
            'provider_synced_at' => now(),
        ]);

        foreach ($gamePayload['external_ids'] ?? [] as $providerKey => $externalId) {
            $externalProvider = Provider::where('key', $providerKey)->first();
            if ($externalProvider && $externalId) {
                $game->externalIds()->firstOrCreate([
                    'provider_id' => $externalProvider->id,
                    'external_id' => (string) $externalId,
                ], [
                    'url' => null,
                ]);
            }
        }

        $this->steam->enrich($game, $steamAppId, $user);

        return $game;
    }

    private function steamAppId(array $gamePayload): ?string
    {
        $steamAppId = Arr::get($gamePayload, 'external_ids.steam')
            ?? Arr::get($gamePayload, 'steam_app_id')
            ?? (($gamePayload['source'] ?? null) === 'steam' ? Arr::get($gamePayload, 'external_id') : null);

        return $steamAppId ? (string) $steamAppId : null;
    }

    private function assertDevicesAreValid(Platform $platform, array $deviceIds): void
    {
        $allowedIds = $platform->devices()->pluck('devices.id')->all();
        $invalid = array_diff($deviceIds, $allowedIds);

        if ($invalid) {
            throw ValidationException::withMessages(['device_ids' => 'Selected device is not allowed for this platform.']);
        }
    }

    private function assertOwnershipCopiesAreValid(Platform $platform, array $copies): void
    {
        $allowedIds = $platform->ownershipTypes()->pluck('ownership_types.id')->all();
        $seen = [];

        foreach ($copies as $index => $copy) {
            $ownershipTypeId = $copy['ownership_type_id'] ?? null;

            if (! in_array($ownershipTypeId, $allowedIds, true)) {
                throw ValidationException::withMessages(["ownership_copies.$index.ownership_type_id" => 'Ownership type is not allowed for this platform.']);
            }

            if (in_array($ownershipTypeId, $seen, true)) {
                throw ValidationException::withMessages(["ownership_copies.$index.ownership_type_id" => 'This ownership type already exists for the library game.']);
            }

            $seen[] = $ownershipTypeId;

            $ownershipType = OwnershipType::findOrFail($ownershipTypeId);
            if (in_array($ownershipType->name, self::PHYSICAL_LIKE, true) && empty($copy['physical_status_id'])) {
                throw ValidationException::withMessages(["ownership_copies.$index.physical_status_id" => 'Physical-like ownership requires physical status.']);
            }
        }
    }

    private function assertProgressIsValid(Game $game, Status $status, array $progress, array $gamePayload): void
    {
        $earned = $progress['earned_achievements'] ?? null;
        $totalAchievements = array_key_exists('total_achievements', $gamePayload)
            ? $gamePayload['total_achievements']
            : $game->total_achievements;

        if ($totalAchievements !== null && $earned !== null && $earned > $totalAchievements) {
            throw ValidationException::withMessages(['progress.earned_achievements' => 'Earned achievements cannot exceed total achievements.']);
        }

        if ($status->name === '100%') {
            if (! $totalAchievements) {
                throw ValidationException::withMessages(['progress.status_id' => '100% is unavailable when the game has no achievements.']);
            }

            if ((int) $earned !== (int) $totalAchievements) {
                throw ValidationException::withMessages(['progress.earned_achievements' => '100% requires earned achievements to equal total achievements.']);
            }
        }
    }

    private function completedAt(Status $status, array $progress): ?string
    {
        if (! in_array($status->name, ['Completed', '100%'], true)) {
            return $progress['completed_at'] ?? null;
        }

        return $progress['completed_at'] ?? now()->toDateString();
    }

    private function physicalStatusId(string $ownershipTypeName, array $copy): ?int
    {
        if (! in_array($ownershipTypeName, self::PHYSICAL_LIKE, true)) {
            return null;
        }

        return PhysicalStatus::findOrFail($copy['physical_status_id'])->id;
    }

    private function resolveDlc(Game $game, array $ownedDlc): Dlc
    {
        $dlc = isset($ownedDlc['dlc_id'])
            ? Dlc::findOrFail($ownedDlc['dlc_id'])
            : Dlc::where('game_id', $game->id)
                ->where('steam_app_id', (string) $ownedDlc['steam_app_id'])
                ->firstOrFail();

        if ((int) $dlc->game_id !== (int) $game->id) {
            throw ValidationException::withMessages(['owned_dlcs' => 'Selected DLC does not belong to this game.']);
        }

        return $dlc;
    }
}
