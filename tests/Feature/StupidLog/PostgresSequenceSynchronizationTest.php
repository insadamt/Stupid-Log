<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Game;
use App\Models\User;
use App\Services\DataPortability\BackupExporter;
use App\Services\DataPortability\BackupRestorer;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PostgresSequenceSynchronizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::getDriverName() !== 'pgsql') {
            $this->markTestSkipped('PostgreSQL sequence synchronization requires the pgsql test connection.');
        }

        $this->seed(DatabaseSeeder::class);
        Storage::fake('public');
    }

    public function test_restore_advances_sequences_before_new_records_are_created(): void
    {
        $user = User::firstOrFail();
        Game::create([
            'title' => 'Sequence Source',
            'normalized_title' => 'sequence source',
        ]);
        $artifact = app(BackupExporter::class)->export($user);

        Game::create([
            'title' => 'Sequence High Water Mark',
            'normalized_title' => 'sequence high water mark',
        ]);

        app(BackupRestorer::class)->restore($artifact->path, $user);

        $maximumRestoredId = (int) Game::query()->max('id');
        $created = Game::create([
            'title' => 'Created After Restore',
            'normalized_title' => 'created after restore',
        ]);

        $this->assertGreaterThan($maximumRestoredId, $created->id);
    }

    public function test_empty_restored_tables_restart_their_sequences_at_one(): void
    {
        $user = User::firstOrFail();
        $artifact = app(BackupExporter::class)->export($user);

        Game::create([
            'title' => 'Removed During Restore',
            'normalized_title' => 'removed during restore',
        ]);

        app(BackupRestorer::class)->restore($artifact->path, $user);

        $created = Game::create([
            'title' => 'First After Empty Restore',
            'normalized_title' => 'first after empty restore',
        ]);

        $this->assertSame(1, $created->id);
    }
}
