<?php

namespace Tests\Feature\StupidLog;

use App\Models\StupidLog\Game;
use App\Models\StupidLog\LibraryGame;
use App\Models\StupidLog\OwnershipCopy;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\SnapshotRun;
use App\Models\StupidLog\Status;
use App\Models\StupidLog\SubscriptionEntry;
use App\Models\User;
use App\Services\ClosedFinancialYearService;
use App\Services\FinancialAmountService;
use App\Services\SubscriptionYearAllocationService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionYearAllocationServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->user = User::firstOrFail();
    }

    public function test_cross_year_amounts_use_inclusive_days_and_sum_exactly(): void
    {
        $service = app(SubscriptionYearAllocationService::class);
        $amounts = $service->calculateYearlyAmounts(
            32,
            '2025-12-12',
            '2026-01-12',
        );

        $this->assertSame([
            2025 => '20.000000',
            2026 => '12.000000',
        ], $amounts);
    }

    public function test_multi_year_and_per_copy_remainders_are_assigned_to_final_items(): void
    {
        $service = app(SubscriptionYearAllocationService::class);
        $money = app(FinancialAmountService::class);
        $yearlyAmounts = $service->calculateYearlyAmounts(
            10,
            '2025-12-31',
            '2027-01-01',
        );
        $copyAmounts = $service->calculateCopyAmounts('10.000000', [30, 10, 20]);

        $this->assertSame(
            10_000_000,
            array_sum(array_map($money->toMillionths(...), $yearlyAmounts)),
        );
        $this->assertSame([
            10 => '3.333333',
            20 => '3.333333',
            30 => '3.333334',
        ], $copyAmounts);
    }

    public function test_synchronizing_zero_copy_subscription_keeps_yearly_budget_without_allocations(): void
    {
        $subscription = $this->createSubscription(
            32,
            '2025-12-12',
            '2026-01-12',
        );

        app(SubscriptionYearAllocationService::class)
            ->synchronizeUnlockedYears($subscription);

        $this->assertSame(
            ['20.000000', '12.000000'],
            $subscription->years()->orderBy('year')->pluck('amount_allocated')->all(),
        );
        $this->assertSame(0, $subscription->years()
            ->withCount('ownershipCopyAllocations')
            ->get()
            ->sum('ownership_copy_allocations_count'));
    }

    public function test_locked_years_are_preserved_when_unlocked_copy_allocations_recalculate(): void
    {
        $firstCopy = $this->createOwnershipCopy('Locked Allocation Game');
        $secondCopy = $this->createOwnershipCopy('Future Allocation Game');
        $subscription = $this->createSubscription(20, '2026-01-01', '2027-12-31');
        $subscription->ownershipCopies()->sync([$firstCopy->id]);
        $service = app(SubscriptionYearAllocationService::class);
        $service->synchronizeUnlockedYears($subscription);

        $lockedYear = $subscription->years()->where('year', 2026)->firstOrFail();
        $lockedYear->update([
            'amount_allocated' => '99.000000',
            'is_locked' => true,
        ]);
        $lockedYear->ownershipCopyAllocations()
            ->where('ownership_copy_id', $firstCopy->id)
            ->update(['allocated_amount' => '99.000000']);
        $subscription->ownershipCopies()->sync([$firstCopy->id, $secondCopy->id]);
        $subscription->update(['amount_paid' => 40]);

        $service->synchronizeUnlockedYears($subscription->refresh());
        $service->recalculateUnlockedCopyAllocations($subscription);

        $lockedYear->refresh();
        $futureYear = $subscription->years()->where('year', 2027)->firstOrFail();

        $this->assertSame('99.000000', $lockedYear->amount_allocated);
        $this->assertSame(
            ['99.000000'],
            $lockedYear->ownershipCopyAllocations()->pluck('allocated_amount')->all(),
        );
        $this->assertCount(2, $futureYear->ownershipCopyAllocations);
        $this->assertSame(
            $futureYear->amount_allocated,
            app(FinancialAmountService::class)->fromMillionths(
                $futureYear->ownershipCopyAllocations
                    ->sum(fn ($allocation) => app(FinancialAmountService::class)
                        ->toMillionths($allocation->allocated_amount)),
            ),
        );
    }

    public function test_newly_introduced_year_uses_current_global_copy_selection(): void
    {
        $firstCopy = $this->createOwnershipCopy('Existing Year Game');
        $secondCopy = $this->createOwnershipCopy('New Year Game');
        $subscription = $this->createSubscription(12, '2026-01-01', '2026-12-31');
        $subscription->ownershipCopies()->sync([$firstCopy->id]);
        $service = app(SubscriptionYearAllocationService::class);
        $service->synchronizeUnlockedYears($subscription);

        $subscription->ownershipCopies()->sync([$firstCopy->id, $secondCopy->id]);
        $subscription->update([
            'amount_paid' => 24,
            'finished_at' => '2027-12-31',
        ]);
        $service->synchronizeUnlockedYears($subscription->refresh());

        $year2027 = $subscription->years()->where('year', 2027)->firstOrFail();

        $this->assertEqualsCanonicalizing(
            [$firstCopy->id, $secondCopy->id],
            $year2027->ownershipCopyAllocations()->pluck('ownership_copy_id')->all(),
        );
        $this->assertSame(
            $year2027->amount_allocated,
            app(FinancialAmountService::class)->fromMillionths(
                $year2027->ownershipCopyAllocations
                    ->sum(fn ($allocation) => app(FinancialAmountService::class)
                        ->toMillionths($allocation->allocated_amount)),
            ),
        );
    }

    public function test_closed_year_service_uses_latest_confirmed_snapshot_only(): void
    {
        SnapshotRun::create([
            'user_id' => $this->user->id,
            'year' => 2027,
            'status' => 'draft',
        ]);
        SnapshotRun::create([
            'user_id' => $this->user->id,
            'year' => 2025,
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);
        $service = app(ClosedFinancialYearService::class);

        $this->assertSame(2025, $service->closedFinancialYear($this->user));
        $this->assertTrue($service->isYearClosed($this->user, 2024));
        $this->assertTrue($service->isYearClosed($this->user, 2025));
        $this->assertFalse($service->isYearClosed($this->user, 2026));
        $this->assertTrue($service->dateRangeOverlapsClosedYear(
            $this->user,
            '2025-12-20',
            '2026-01-20',
        ));
        $this->assertFalse($service->dateRangeOverlapsClosedYear(
            $this->user,
            '2026-01-01',
            '2027-01-01',
        ));
        $this->assertSame(
            '2026-01-01',
            $service->firstEditableDate($this->user)?->toDateString(),
        );
    }

    private function createSubscription(
        float $amount,
        string $startedAt,
        string $finishedAt,
    ): SubscriptionEntry {
        return SubscriptionEntry::create([
            'user_id' => $this->user->id,
            'ownership_type_id' => OwnershipType::where('name', 'Game Pass')->firstOrFail()->id,
            'amount_paid' => $amount,
            'started_at' => $startedAt,
            'finished_at' => $finishedAt,
        ]);
    }

    private function createOwnershipCopy(string $title): OwnershipCopy
    {
        $game = Game::create([
            'title' => $title,
            'normalized_title' => strtolower($title),
        ]);
        $libraryGame = LibraryGame::create([
            'user_id' => $this->user->id,
            'game_id' => $game->id,
            'platform_id' => Platform::where('name', 'Xbox')->firstOrFail()->id,
            'status_id' => Status::where('name', 'Not Played')->firstOrFail()->id,
            'playtime_hours' => 0,
        ]);

        return $libraryGame->ownershipCopies()->create([
            'ownership_type_id' => OwnershipType::where('name', 'Game Pass')->firstOrFail()->id,
        ]);
    }
}
