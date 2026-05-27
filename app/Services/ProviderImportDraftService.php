<?php

namespace App\Services;

use App\Models\StupidLog\Dlc;
use App\Models\StupidLog\Game;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\ProviderImportDraft;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProviderImportDraftService
{
    public function __construct(private readonly CoverStorageService $covers) {}

    public function create(User $user, array $result): ProviderImportDraft
    {
        $coverPath = $this->covers->storeTemporaryFromUrl($result['cover_url_original'] ?? null);

        return ProviderImportDraft::create([
            'user_id' => $user->id,
            'provider_key' => $result['source'],
            'external_id' => (string) $result['external_id'],
            'steam_app_id' => $result['steam_app_id'] ?? null,
            'game_payload' => $this->gamePayload($result, $coverPath),
            'dlcs' => $this->dlcs($result['dlcs'] ?? []),
            'cover_path' => $coverPath,
            'expires_at' => now()->addHours(24),
        ]);
    }

    public function mergeIntoPayload(User $user, array $payload): array
    {
        $draftId = $payload['import_draft_id'] ?? null;
        if (! $draftId) {
            return $payload;
        }

        $draft = $this->findConsumable($user, (int) $draftId);

        $payload['game'] = array_merge($payload['game'], $draft->game_payload ?? []);
        $payload['game']['cover_path'] = $this->covers->promoteTemporaryProviderCover($draft->cover_path);
        $payload['__import_draft'] = $draft;

        return $payload;
    }

    public function promoteDlcs(Game $game, ProviderImportDraft $draft): void
    {
        $providerId = Provider::where('key', 'steam')->value('id');

        foreach ($draft->dlcs ?? [] as $item) {
            $steamAppId = Arr::get($item, 'steam_app_id');
            if (! $steamAppId) {
                continue;
            }

            Dlc::updateOrCreate([
                'steam_app_id' => (string) $steamAppId,
            ], [
                'game_id' => $game->id,
                'title' => Arr::get($item, 'title', 'Untitled DLC'),
                'cover_url_original' => null,
                'cover_path' => null,
                'base_price' => Arr::get($item, 'base_price'),
                'source_provider_id' => $providerId,
                'synced_at' => now(),
            ]);
        }
    }

    public function consume(ProviderImportDraft $draft): void
    {
        $draft->forceFill(['consumed_at' => now()])->save();
    }

    public function cancel(User $user, int $id): void
    {
        $draft = ProviderImportDraft::where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->findOrFail($id);

        $this->covers->deleteTemporaryProviderCover($draft->cover_path);
        $draft->delete();
    }

    public function cleanupExpired(): int
    {
        $drafts = ProviderImportDraft::whereNull('consumed_at')
            ->where('expires_at', '<', now())
            ->get();

        DB::transaction(function () use ($drafts) {
            foreach ($drafts as $draft) {
                $this->covers->deleteTemporaryProviderCover($draft->cover_path);
                $draft->delete();
            }
        });

        return $drafts->count();
    }

    private function findConsumable(User $user, int $id): ProviderImportDraft
    {
        $draft = ProviderImportDraft::where('user_id', $user->id)->findOrFail($id);

        if ($draft->consumed_at) {
            throw ValidationException::withMessages(['import_draft_id' => 'This provider import draft has already been used.']);
        }

        if ($draft->expires_at->isPast()) {
            throw ValidationException::withMessages(['import_draft_id' => 'This provider import draft has expired.']);
        }

        return $draft;
    }

    private function gamePayload(array $result, ?string $coverPath): array
    {
        return [
            'title' => $result['title'],
            'source' => $result['source'],
            'external_id' => $result['external_id'],
            'external_ids' => array_filter([
                $result['source'] => $result['external_id'],
                'steam' => $result['steam_app_id'] ?? null,
            ]),
            'steam_app_id' => $result['steam_app_id'] ?? null,
            'cover_url_original' => $result['cover_url_original'] ?? null,
            'cover_path' => $coverPath,
            'publisher' => $result['publisher'] ?? null,
            'release_date' => $result['release_date'] ?? null,
            'description' => $result['description'] ?? null,
            'base_price_default' => $result['base_price_default'] ?? null,
            'base_price_source' => $result['base_price_source'] ?? null,
            'total_achievements' => $result['total_achievements'] ?? null,
            'total_achievements_source' => $result['total_achievements_source'] ?? null,
        ];
    }

    private function dlcs(array $dlcs): array
    {
        return collect($dlcs)
            ->filter(fn (array $dlc) => ! empty($dlc['steam_app_id']))
            ->map(fn (array $dlc) => [
                'steam_app_id' => (string) $dlc['steam_app_id'],
                'title' => $dlc['title'] ?? 'Untitled DLC',
                'base_price' => $dlc['base_price'] ?? null,
            ])
            ->values()
            ->all();
    }
}
