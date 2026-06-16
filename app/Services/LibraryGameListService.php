<?php

namespace App\Services;

use App\Models\StupidLog\LibraryGame;
use App\Models\User;
use Illuminate\Http\Request;

class LibraryGameListService
{
    public function __construct(private readonly LibraryGamePresenter $presenter) {}

    public function payload(User $user, Request $request)
    {
        $limit = $this->boundedLimit($request, 40, 120);
        $offset = $this->decodeOffsetCursor($request->string('cursor')->toString());
        $sort = $request->string('sort')->toString() ?: 'title';
        $query = trim($request->string('query')->toString());
        $status = $request->string('status')->toString();
        $platform = $request->string('platform')->toString();

        $builder = $this->query($user);

        if ($query !== '') {
            $searchTerm = '%'.mb_strtolower($query).'%';

            $builder->where(function ($scope) use ($searchTerm) {
                $scope->whereHas('game', function ($gameQuery) use ($searchTerm) {
                    $gameQuery->whereRaw('LOWER(title) LIKE ?', [$searchTerm])
                        ->orWhereRaw('LOWER(publisher) LIKE ?', [$searchTerm]);
                })->orWhereHas('platform', fn ($platformQuery) => $platformQuery->whereRaw('LOWER(name) LIKE ?', [$searchTerm]))
                    ->orWhereHas('devices', fn ($deviceQuery) => $deviceQuery->whereRaw('LOWER(name) LIKE ?', [$searchTerm]))
                    ->orWhereHas('ownershipCopies.ownershipType', fn ($ownershipQuery) => $ownershipQuery->whereRaw('LOWER(name) LIKE ?', [$searchTerm]));
            });
        }

        if ($status !== '' && strcasecmp($status, 'All') !== 0) {
            $builder->whereHas('status', fn ($statusQuery) => $statusQuery->where('name', $status));
        }

        if ($platform !== '' && strcasecmp($platform, 'All') !== 0) {
            $builder->whereHas('platform', fn ($platformQuery) => $platformQuery->where('name', $platform));
        }

        match ($sort) {
            'playtime' => $builder->orderByDesc('playtime_hours')->orderBy('id'),
            'progress' => $builder
                ->leftJoin('games as sort_games', 'sort_games.id', '=', 'library_games.game_id')
                ->select('library_games.*')
                ->orderByRaw('case when sort_games.total_achievements > 0 then coalesce(library_games.earned_achievements, 0) * 1.0 / sort_games.total_achievements else 0 end desc')
                ->orderBy('library_games.id'),
            default => $builder
                ->join('games as sort_games', 'sort_games.id', '=', 'library_games.game_id')
                ->select('library_games.*')
                ->orderByRaw('LOWER(sort_games.title)')
                ->orderBy('library_games.id'),
        };

        $rows = $builder->skip($offset)->take($limit + 1)->get();
        $items = $rows->take($limit)->values();

        return collect([
            'items' => $this->presenter->cards($items),
            'next_cursor' => $rows->count() > $limit ? $this->encodeOffsetCursor($offset + $limit) : null,
            'has_more' => $rows->count() > $limit,
        ]);
    }

    public function meta(User $user): array
    {
        $totals = LibraryGame::query()
            ->join('statuses', 'statuses.id', '=', 'library_games.status_id')
            ->where('library_games.user_id', $user->id)
            ->selectRaw('count(*) as library_games')
            ->selectRaw("sum(case when statuses.name in ('Completed', '100%') then 1 else 0 end) as completed")
            ->selectRaw('sum(library_games.playtime_hours) as playtime_hours')
            ->first();

        return [
            'total' => (int) ($totals?->library_games ?? 0),
            'completed' => (int) ($totals?->completed ?? 0),
            'playtime_hours' => (float) ($totals?->playtime_hours ?? 0),
            'statuses' => LibraryGame::query()
                ->join('statuses', 'statuses.id', '=', 'library_games.status_id')
                ->where('library_games.user_id', $user->id)
                ->groupBy('statuses.name')
                ->orderBy('statuses.name')
                ->selectRaw('statuses.name, count(*) as count')
                ->get()
                ->mapWithKeys(fn ($row) => [$row->name => (int) $row->count])
                ->all(),
            'platforms' => LibraryGame::query()
                ->join('platforms', 'platforms.id', '=', 'library_games.platform_id')
                ->where('library_games.user_id', $user->id)
                ->groupBy('platforms.name')
                ->orderBy('platforms.name')
                ->selectRaw('platforms.name, count(*) as count')
                ->get()
                ->mapWithKeys(fn ($row) => [$row->name => (int) $row->count])
                ->all(),
        ];
    }

    public function query(User $user)
    {
        return LibraryGame::where('user_id', $user->id)
            ->with(['game', 'platform', 'status', 'devices', 'ownershipCopies.ownershipType']);
    }

    private function boundedLimit(Request $request, int $default, int $max): int
    {
        $limit = (int) $request->integer('limit', $default);

        return max(1, min($limit, $max));
    }

    private function encodeOffsetCursor(int $offset): string
    {
        return rtrim(strtr(base64_encode((string) $offset), '+/', '-_'), '=');
    }

    private function decodeOffsetCursor(?string $cursor): int
    {
        if (! $cursor) {
            return 0;
        }

        $decoded = base64_decode(strtr($cursor, '-_', '+/'), true);

        return is_numeric($decoded) ? max(0, (int) $decoded) : 0;
    }
}
