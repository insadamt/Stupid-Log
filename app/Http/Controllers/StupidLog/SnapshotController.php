<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\StupidLog\SnapshotRun;
use App\Models\User;
use App\Services\SnapshotService;
use App\Services\StatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SnapshotController extends Controller
{
    public function snapshots(StatsService $stats): Response
    {
        $user = $this->localUser();
        $snapshotPage = $this->snapshotFeedPayload($user, request(), $stats);

        return Inertia::render('Snapshots', [
            'snapshots' => $snapshotPage['items'],
            'snapshotsNextCursor' => $snapshotPage['next_cursor'],
            'liveStats' => $stats->live($user),
            'currentYear' => (int) now()->format('Y'),
            'confirmedCurrentYear' => $stats->confirmedYear($user, (int) now()->format('Y')),
        ]);
    }

    public function snapshotFeed(Request $request, StatsService $stats): JsonResponse
    {
        return response()->json($this->snapshotFeedPayload($this->localUser(), $request, $stats));
    }

    public function snapshotDetails(SnapshotRun $snapshotRun, StatsService $stats, SnapshotService $snapshotService): Response
    {
        $user = $this->localUser();
        $snapshotPage = $this->snapshotFeedPayload($user, request(), $stats);
        $gameRows = $stats->snapshotRows($snapshotRun, request());
        $eligibleRows = $snapshotService->eligibleBestGames($snapshotRun, request());

        return Inertia::render('Snapshots', [
            'snapshots' => $snapshotPage['items'],
            'snapshotsNextCursor' => $snapshotPage['next_cursor'],
            'selectedSnapshot' => [
                ...$stats->snapshotSummary($snapshotRun),
                'games' => $gameRows['items'],
                'games_next_cursor' => $gameRows['next_cursor'],
                'eligible_best_games' => $eligibleRows['items'],
                'eligible_best_games_next_cursor' => $eligibleRows['next_cursor'],
            ],
            'liveStats' => $stats->live($user),
            'currentYear' => (int) now()->format('Y'),
            'confirmedCurrentYear' => $stats->confirmedYear($user, (int) now()->format('Y')),
        ]);
    }

    public function snapshotGames(Request $request, SnapshotRun $snapshotRun, StatsService $stats): JsonResponse
    {
        return response()->json($stats->snapshotRows($snapshotRun, $request));
    }

    public function snapshotEligibleBestGames(Request $request, SnapshotRun $snapshotRun, SnapshotService $snapshots): JsonResponse
    {
        return response()->json($snapshots->eligibleBestGames($snapshotRun, $request));
    }

    public function createSnapshot(Request $request, SnapshotService $snapshots): RedirectResponse
    {
        $validated = $request->validate(['year' => ['required', 'integer', 'min:1970', 'max:2100']]);
        $snapshots->createDraft($this->localUser(), (int) $validated['year']);

        return back();
    }

    public function confirmSnapshot(SnapshotRun $snapshotRun, SnapshotService $snapshots): RedirectResponse
    {
        $snapshots->confirm($snapshotRun);

        return back();
    }

    public function resnapSnapshot(SnapshotRun $snapshotRun, SnapshotService $snapshots): RedirectResponse
    {
        $snapshots->resnapDraft($snapshotRun);

        return back();
    }

    public function updateSnapshotBestGames(Request $request, SnapshotRun $snapshotRun, SnapshotService $snapshots): RedirectResponse
    {
        $validated = $request->validate([
            'library_game_ids' => ['nullable', 'array', 'max:5'],
            'library_game_ids.*' => ['integer', 'exists:library_games,id'],
        ]);

        $snapshots->updateBestGames($snapshotRun, $validated['library_game_ids'] ?? []);

        return back();
    }

    public function destroySnapshot(SnapshotRun $snapshotRun): RedirectResponse
    {
        $snapshotRun->delete();

        return redirect()->route('snapshots');
    }

    private function snapshotFeedPayload(User $user, Request $request, StatsService $stats): array
    {
        $limit = $this->boundedLimit($request, 30, 100);
        $offset = $this->decodeOffsetCursor($request->string('cursor')->toString());
        $rows = SnapshotRun::where('user_id', $user->id)
            ->latest()
            ->skip($offset)
            ->take($limit + 1)
            ->get();

        return [
            'items' => $rows->take($limit)->map(fn (SnapshotRun $snapshot) => $stats->snapshotSummary($snapshot))->values(),
            'next_cursor' => $rows->count() > $limit ? $this->encodeOffsetCursor($offset + $limit) : null,
            'has_more' => $rows->count() > $limit,
        ];
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

    private function localUser(): User
    {
        return User::first() ?? User::create(['username' => 'Player One', 'avatar_path' => null]);
    }
}
