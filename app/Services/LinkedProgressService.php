<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\LibraryGameProgressLink;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LinkedProgressService
{
    private const SYNC_FIELDS = [
        'sync_playtime',
        'sync_achievements',
        'sync_dates',
        'sync_status',
    ];

    public function create(LibraryGame $target, array $payload): LibraryGameProgressLink
    {
        $source = LibraryGame::findOrFail($payload['source_library_game_id']);

        return DB::transaction(function () use ($target, $source, $payload) {
            $this->assertCanLink($target, $source);

            $link = LibraryGameProgressLink::create([
                'user_id' => $target->user_id,
                'target_library_game_id' => $target->id,
                'source_library_game_id' => $source->id,
                ...$this->syncFlags($payload),
            ]);

            $this->syncTargetFromSource($link);

            return $link->load($this->linkRelations());
        });
    }

    public function update(LibraryGame $target, array $payload): LibraryGameProgressLink
    {
        return DB::transaction(function () use ($target, $payload) {
            $link = $target->progressLink()->firstOrFail();
            $source = LibraryGame::findOrFail($payload['source_library_game_id']);

            $this->assertCanLink($target, $source, $link);
            $link->update([
                'source_library_game_id' => $source->id,
                ...$this->syncFlags($payload),
            ]);
            $this->syncTargetFromSource($link);

            return $link->refresh()->load($this->linkRelations());
        });
    }

    public function delete(LibraryGame $target): void
    {
        $target->progressLink()->delete();
    }

    public function propagateSourceProgress(LibraryGame $source): void
    {
        $source->loadMissing(['game', 'status']);

        LibraryGameProgressLink::query()
            ->where('source_library_game_id', $source->id)
            ->with(['targetLibraryGame.game', 'sourceLibraryGame.game', 'sourceLibraryGame.status'])
            ->get()
            ->each(fn (LibraryGameProgressLink $link) => $this->syncTargetFromSource($link));
    }

    public function candidates(User $user, LibraryGame $target, ?string $query = null): Collection
    {
        $blockedSourceIds = LibraryGameProgressLink::query()
            ->pluck('target_library_game_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $builder = LibraryGame::query()
            ->with(['game', 'platform', 'status'])
            ->where('user_id', $user->id)
            ->whereKeyNot($target->id)
            ->whereNotIn('library_games.id', $blockedSourceIds)
            ->whereDoesntHave('progressLink');

        if ($query !== null && trim($query) !== '') {
            $searchTerm = '%'.mb_strtolower(trim($query)).'%';
            $builder->where(function ($scope) use ($searchTerm) {
                $scope->whereHas('game', fn ($gameQuery) => $gameQuery->whereRaw('LOWER(title) LIKE ?', [$searchTerm]))
                    ->orWhereHas('platform', fn ($platformQuery) => $platformQuery->whereRaw('LOWER(name) LIKE ?', [$searchTerm]));
            });
        }

        return $builder
            ->join('games as linked_source_games', 'linked_source_games.id', '=', 'library_games.game_id')
            ->select('library_games.*')
            ->orderByRaw('LOWER(linked_source_games.title)')
            ->orderBy('library_games.id')
            ->limit(25)
            ->get()
            ->filter(fn (LibraryGame $source) => $this->canBeSourceForTarget($target, $source))
            ->values();
    }

    public function linkPayload(?LibraryGameProgressLink $link): ?array
    {
        if (! $link) {
            return null;
        }

        $link->loadMissing($this->linkRelations());
        $source = $link->sourceLibraryGame;

        return [
            'id' => $link->id,
            'target_library_game_id' => $link->target_library_game_id,
            'source_library_game_id' => $link->source_library_game_id,
            'sync_playtime' => (bool) $link->sync_playtime,
            'sync_achievements' => (bool) $link->sync_achievements,
            'sync_dates' => (bool) $link->sync_dates,
            'sync_status' => (bool) $link->sync_status,
            'source' => [
                'id' => $source->id,
                'title' => $source->game?->title,
                'platform' => $source->platform?->name,
                'status' => $source->status?->name,
                'status_color_key' => $source->status?->color_key,
                'status_color_hex' => $source->status?->color_hex,
                'playtime_hours' => (float) $source->playtime_hours,
                'earned_achievements' => (int) ($source->earned_achievements ?? 0),
                'total_achievements' => (int) ($source->game?->total_achievements ?? 0),
                'first_played_at' => $source->first_played_at?->format('Y-m-d'),
                'last_played_at' => $source->last_played_at?->format('Y-m-d'),
                'completed_at' => $source->completed_at?->format('Y-m-d'),
            ],
        ];
    }

    public function fieldSources(?LibraryGameProgressLink $link): array
    {
        return [
            'playtime' => $link?->sync_playtime ? 'source' : 'local',
            'achievements' => $link?->sync_achievements ? 'source' : 'local',
            'dates' => $link?->sync_dates ? 'source' : 'local',
            'status' => $link?->sync_status ? 'source' : 'local',
        ];
    }

    public function syncedProgressFields(LibraryGame $libraryGame): array
    {
        $link = $libraryGame->progressLink()->first();

        if (! $link) {
            return [];
        }

        return [
            'status_id' => (bool) $link->sync_status,
            'playtime_hours' => (bool) $link->sync_playtime,
            'earned_achievements' => (bool) $link->sync_achievements,
            'first_played_at' => (bool) $link->sync_dates,
            'last_played_at' => (bool) $link->sync_dates,
            'completed_at' => (bool) $link->sync_dates,
        ];
    }

    public function assertCanUpdateProgressFields(LibraryGame $libraryGame, array $progress): void
    {
        $syncedFields = $this->syncedProgressFields($libraryGame);
        $blocked = collect($syncedFields)
            ->filter()
            ->keys()
            ->filter(fn (string $field) => array_key_exists($field, $progress))
            ->values();

        if ($blocked->isEmpty()) {
            return;
        }

        throw ValidationException::withMessages(
            $blocked->mapWithKeys(fn (string $field) => ["progress.{$field}" => 'This progress field is controlled by Linked Progress.'])->all(),
        );
    }

    private function assertCanLink(LibraryGame $target, LibraryGame $source, ?LibraryGameProgressLink $existingLink = null): void
    {
        if (! $this->canBeSourceForTarget($target, $source, $existingLink)) {
            throw ValidationException::withMessages([
                'source_library_game_id' => 'This library game cannot be used as a Linked Progress source.',
            ]);
        }
    }

    private function canBeSourceForTarget(
        LibraryGame $target,
        LibraryGame $source,
        ?LibraryGameProgressLink $existingLink = null,
    ): bool {
        if ((int) $target->id === (int) $source->id) {
            return false;
        }

        if ((int) $target->user_id !== (int) $source->user_id) {
            return false;
        }

        $targetHasDifferentLink = LibraryGameProgressLink::query()
            ->where('target_library_game_id', $target->id)
            ->when($existingLink, fn ($query) => $query->whereKeyNot($existingLink->id))
            ->exists();

        if ($targetHasDifferentLink) {
            return false;
        }

        $targetFeedsOtherEntries = LibraryGameProgressLink::where('source_library_game_id', $target->id)->exists();
        if ($targetFeedsOtherEntries) {
            return false;
        }

        $sourceAlreadyUsesLink = LibraryGameProgressLink::where('target_library_game_id', $source->id)->exists();
        if ($sourceAlreadyUsesLink) {
            return false;
        }

        return true;
    }

    private function syncFlags(array $payload): array
    {
        $flags = collect(self::SYNC_FIELDS)
            ->mapWithKeys(fn (string $field) => [$field => (bool) ($payload[$field] ?? false)])
            ->all();

        if (! in_array(true, $flags, true)) {
            throw ValidationException::withMessages([
                'sync_options' => 'Enable at least one Linked Progress option.',
            ]);
        }

        return $flags;
    }

    private function syncTargetFromSource(LibraryGameProgressLink $link): void
    {
        $link->loadMissing(['targetLibraryGame.game', 'sourceLibraryGame.game', 'sourceLibraryGame.status']);
        $target = $link->targetLibraryGame;
        $source = $link->sourceLibraryGame;
        $updates = [];

        if ($link->sync_status) {
            $updates['status_id'] = $source->status_id;
        }

        if ($link->sync_playtime) {
            $updates['playtime_hours'] = $source->playtime_hours;
        }

        if ($link->sync_achievements) {
            $updates['earned_achievements'] = $source->earned_achievements;
            $target->game?->update([
                'total_achievements' => $source->game?->total_achievements,
                'total_achievements_source' => $source->game?->total_achievements_source,
            ]);
        }

        if ($link->sync_dates) {
            $updates['first_played_at'] = $source->first_played_at;
            $updates['last_played_at'] = $source->last_played_at;
            $updates['completed_at'] = $source->completed_at;
        }

        if ($updates !== []) {
            $target->update($updates);
        }
    }

    private function linkRelations(): array
    {
        return ['sourceLibraryGame.game', 'sourceLibraryGame.platform', 'sourceLibraryGame.status'];
    }
}
