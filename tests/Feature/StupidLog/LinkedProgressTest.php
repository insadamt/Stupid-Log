<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Game;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Status;
use App\Models\User;
use App\Services\DataPortability\BackupExporter;
use App\Services\DataPortability\BackupRestorer;
use App\Services\LibraryGamePresenter;
use App\Services\LinkedProgressService;
use App\Services\SnapshotService;
use App\Services\StatsService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class LinkedProgressTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_linked_progress_rules_are_enforced(): void
    {
        $source = $this->libraryGame('Need for Speed Payback', 'Steam');
        $target = $this->libraryGame('Need for Speed Payback', 'Xbox');
        $otherTarget = $this->libraryGame('Need for Speed Payback', 'PS Network');
        $linkedProgress = app(LinkedProgressService::class);

        $link = $linkedProgress->create($target, [
            'source_library_game_id' => $source->id,
            'sync_playtime' => true,
        ]);

        $this->assertDatabaseHas('library_game_progress_links', [
            'id' => $link->id,
            'target_library_game_id' => $target->id,
            'source_library_game_id' => $source->id,
            'sync_playtime' => true,
        ]);

        $linkedProgress->create($otherTarget, [
            'source_library_game_id' => $source->id,
            'sync_achievements' => true,
        ]);

        $this->expectException(ValidationException::class);
        $linkedProgress->create($source, [
            'source_library_game_id' => $target->id,
            'sync_status' => true,
        ]);
    }

    public function test_linked_progress_rejects_invalid_payloads(): void
    {
        $source = $this->libraryGame('Source Game', 'Steam');
        $target = $this->libraryGame('Target Game', 'Xbox');
        $linkedProgress = app(LinkedProgressService::class);

        foreach ([
            ['source_library_game_id' => $target->id, 'sync_playtime' => true],
            ['source_library_game_id' => $source->id],
        ] as $payload) {
            try {
                $linkedProgress->create($target, $payload);
                $this->fail('Invalid Linked Progress payload should fail.');
            } catch (ValidationException) {
                $this->assertTrue(true);
            }
        }

        $otherUser = User::factory()->create();
        $otherSource = $this->libraryGame('Other User Game', 'PS Network', $otherUser);

        $this->expectException(ValidationException::class);
        $linkedProgress->create($target, [
            'source_library_game_id' => $otherSource->id,
            'sync_playtime' => true,
        ]);
    }

    public function test_presenter_uses_source_values_for_selected_fields_only(): void
    {
        $source = $this->libraryGame('Steam Copy', 'Steam', $this->user, [
            'status' => '100%',
            'playtime_hours' => 44.4,
            'earned_achievements' => 10,
            'total_achievements' => 10,
            'first_played_at' => '2026-01-01',
            'last_played_at' => '2026-02-01',
            'completed_at' => '2026-02-01',
        ]);
        $target = $this->libraryGame('EA Copy', 'Xbox', $this->user, [
            'status' => 'In Progress',
            'playtime_hours' => 2.0,
            'earned_achievements' => 1,
            'total_achievements' => 5,
        ]);

        app(LinkedProgressService::class)->create($target, [
            'source_library_game_id' => $source->id,
            'sync_playtime' => true,
            'sync_achievements' => true,
            'sync_dates' => true,
        ]);

        $card = app(LibraryGamePresenter::class)->card($target->refresh()->load(['game', 'platform', 'status', 'devices', 'ownershipCopies']));

        $this->assertSame('In Progress', $card['status']);
        $this->assertSame(44.4, $card['playtime_hours']);
        $this->assertSame(10, $card['earned_achievements']);
        $this->assertSame(10, $card['total_achievements']);
        $this->assertSame('2026-02-01', $card['completed_at']);
        $this->assertSame(44.4, $card['local_progress']['playtime_hours']);
        $this->assertSame(10, $card['local_progress']['total_achievements']);
        $this->assertDatabaseHas('library_games', [
            'id' => $target->id,
            'playtime_hours' => 44.4,
            'earned_achievements' => 10,
        ]);
        $this->assertSame('2026-02-01', $target->refresh()->completed_at?->format('Y-m-d'));
        $this->assertSame(10, (int) $target->game->refresh()->total_achievements);
    }

    public function test_presenter_marks_linked_targets_and_sync_sources(): void
    {
        $source = $this->libraryGame('Shared Progress Source', 'Steam');
        $target = $this->libraryGame('Shared Progress Target', 'Xbox');
        $otherTarget = $this->libraryGame('Shared Progress Target PS', 'PS Network');

        app(LinkedProgressService::class)->create($target, [
            'source_library_game_id' => $source->id,
            'sync_playtime' => true,
        ]);
        app(LinkedProgressService::class)->create($otherTarget, [
            'source_library_game_id' => $source->id,
            'sync_status' => true,
        ]);

        $presenter = app(LibraryGamePresenter::class);
        $sourceCard = $presenter->card($source->refresh()->load(['game', 'platform', 'status', 'devices', 'ownershipCopies']));
        $targetCard = $presenter->card($target->refresh()->load(['game', 'platform', 'status', 'devices', 'ownershipCopies', 'progressLink']));

        $this->assertFalse($sourceCard['linked_progress_summary']['is_target']);
        $this->assertSame(2, $sourceCard['linked_progress_summary']['source_count']);
        $this->assertTrue($targetCard['linked_progress_summary']['is_target']);
        $this->assertSame(0, $targetCard['linked_progress_summary']['source_count']);
        $this->assertSame('Shared Progress Source', $targetCard['linked_progress']['source']['title']);
    }

    public function test_candidate_picker_still_lists_eligible_games_after_another_link_is_created(): void
    {
        $source = $this->libraryGame('Shared Source', 'Steam');
        $target = $this->libraryGame('First Target', 'Xbox');
        $otherTarget = $this->libraryGame('Second Target', 'PS Network');

        app(LinkedProgressService::class)->create($target, [
            'source_library_game_id' => $source->id,
            'sync_playtime' => true,
        ]);

        $response = $this->getJson(route('games.linked-progress.candidates', [
            'libraryGame' => $otherTarget,
        ]))->assertOk();

        $this->assertContains(
            $source->id,
            collect($response->json('candidates'))->pluck('id')->all(),
        );
    }

    public function test_game_details_exposes_linked_progress_indicator_data_with_return_query(): void
    {
        $source = $this->libraryGame('Details Source', 'Steam');
        $target = $this->libraryGame('Details Target', 'Xbox');

        app(LinkedProgressService::class)->create($target, [
            'source_library_game_id' => $source->id,
            'sync_playtime' => true,
            'sync_achievements' => true,
            'sync_dates' => true,
            'sync_status' => true,
        ]);

        $page = $this->get("/games/{$target->id}?query=details&sort=playtime&status=In%20Progress")
            ->assertOk()
            ->viewData('page');

        $this->assertSame('GameDetails', $page['component']);
        $this->assertTrue($page['props']['libraryGame']['linked_progress_summary']['is_target']);
        $this->assertSame('Details Source', $page['props']['details']['linked_progress']['source']['title']);
        $this->assertTrue($page['props']['details']['linked_progress']['sync_playtime']);
        $this->assertTrue($page['props']['details']['linked_progress']['sync_achievements']);
        $this->assertTrue($page['props']['details']['linked_progress']['sync_dates']);
        $this->assertTrue($page['props']['details']['linked_progress']['sync_status']);
    }

    public function test_source_updates_are_propagated_to_linked_targets(): void
    {
        $source = $this->libraryGame('Steam Source', 'Steam', $this->user, [
            'status' => 'In Progress',
            'playtime_hours' => 12.5,
            'earned_achievements' => 3,
            'total_achievements' => 20,
        ]);
        $target = $this->libraryGame('EA Target', 'Xbox', $this->user, [
            'status' => 'Not Played',
            'playtime_hours' => 0,
            'earned_achievements' => 0,
            'total_achievements' => 5,
        ]);

        app(LinkedProgressService::class)->create($target, [
            'source_library_game_id' => $source->id,
            'sync_playtime' => true,
            'sync_achievements' => true,
            'sync_dates' => true,
            'sync_status' => true,
        ]);

        $completed = Status::where('name', 'Completed')->firstOrFail();

        $this->patch(route('games.update', $source), [
            'game' => [
                'title' => 'Steam Source',
                'publisher' => null,
                'description' => null,
                'base_price_default' => null,
                'total_achievements' => 20,
            ],
            'progress' => [
                'status_id' => $completed->id,
                'playtime_hours' => 25.5,
                'earned_achievements' => 9,
                'first_played_at' => '2026-04-01',
                'last_played_at' => '2026-04-10',
                'completed_at' => '2026-04-10',
            ],
        ])->assertRedirect();

        $target->refresh()->load(['game', 'status']);

        $this->assertSame('Completed', $target->status->name);
        $this->assertSame('25.5', (string) $target->playtime_hours);
        $this->assertSame(9, $target->earned_achievements);
        $this->assertSame(20, (int) $target->game->total_achievements);
        $this->assertSame('2026-04-10', $target->completed_at?->format('Y-m-d'));
    }

    public function test_live_and_snapshot_stats_do_not_double_count_synced_progress(): void
    {
        $source = $this->libraryGame('Source', 'Steam', $this->user, [
            'status' => 'Completed',
            'playtime_hours' => 10,
            'earned_achievements' => 5,
            'total_achievements' => 10,
            'completed_at' => '2026-03-01',
        ]);
        $target = $this->libraryGame('Target', 'Xbox', $this->user, [
            'status' => 'In Progress',
            'playtime_hours' => 10,
            'earned_achievements' => 5,
            'total_achievements' => 10,
        ]);

        app(LinkedProgressService::class)->create($target, [
            'source_library_game_id' => $source->id,
            'sync_playtime' => true,
            'sync_achievements' => true,
            'sync_dates' => true,
            'sync_status' => true,
        ]);

        $live = app(StatsService::class)->live($this->user);
        $target->refresh()->load('status');

        $this->assertSame(2, $live['library_games']);
        $this->assertSame(1, $live['completed']);
        $this->assertSame(10.0, $live['playtime_hours']);
        $this->assertSame(5, $live['earned_achievements']);
        $this->assertSame(10, $live['total_achievements']);
        $this->assertSame('Completed', $target->status->name);
        $this->assertSame('Completed', collect($live['archive']['playtime_rankings'])->firstWhere('library_game_id', $target->id)['status']);

        $snapshot = app(SnapshotService::class)->createDraft($this->user, 2026);
        $summary = app(StatsService::class)->snapshotSummary($snapshot, refresh: true);

        $this->assertSame(2, $summary['library_games']);
        $this->assertSame(1, $summary['completed']);
        $this->assertSame(10.0, $summary['playtime_hours']);
        $this->assertSame(5, $summary['earned_achievements']);
        $this->assertSame(10, $summary['total_achievements']);
        $this->assertDatabaseHas('library_game_progress_link_snapshots', [
            'snapshot_run_id' => $snapshot->id,
            'target_library_game_id' => $target->id,
            'source_library_game_id' => $source->id,
        ]);
    }

    public function test_backup_restore_preserves_linked_progress_relationships(): void
    {
        $source = $this->libraryGame('Backup Source', 'Steam');
        $target = $this->libraryGame('Backup Target', 'Xbox');
        app(LinkedProgressService::class)->create($target, [
            'source_library_game_id' => $source->id,
            'sync_playtime' => true,
            'sync_achievements' => true,
        ]);

        $artifact = app(BackupExporter::class)->export($this->user);
        app(BackupRestorer::class)->restore($artifact->path, $this->user);

        $restoredTarget = LibraryGame::query()
            ->whereHas('game', fn ($query) => $query->where('title', 'Backup Target'))
            ->firstOrFail();
        $restoredSource = LibraryGame::query()
            ->whereHas('game', fn ($query) => $query->where('title', 'Backup Source'))
            ->firstOrFail();

        $this->assertDatabaseHas('library_game_progress_links', [
            'target_library_game_id' => $restoredTarget->id,
            'source_library_game_id' => $restoredSource->id,
            'sync_playtime' => true,
            'sync_achievements' => true,
        ]);

        app(BackupExporter::class)->deleteArtifact($artifact);
    }

    private function libraryGame(string $title, string $platformName, ?User $user = null, array $options = []): LibraryGame
    {
        $user ??= $this->user;
        $status = Status::where('name', $options['status'] ?? 'In Progress')->firstOrFail();
        $platform = Platform::where('name', $platformName)->firstOrFail();
        $game = Game::create([
            'title' => $title,
            'normalized_title' => mb_strtolower($title),
            'total_achievements' => $options['total_achievements'] ?? 0,
        ]);

        return LibraryGame::create([
            'user_id' => $user->id,
            'game_id' => $game->id,
            'platform_id' => $platform->id,
            'status_id' => $status->id,
            'playtime_hours' => $options['playtime_hours'] ?? 0,
            'earned_achievements' => $options['earned_achievements'] ?? 0,
            'first_played_at' => $options['first_played_at'] ?? null,
            'last_played_at' => $options['last_played_at'] ?? null,
            'completed_at' => $options['completed_at'] ?? null,
        ]);
    }
}
