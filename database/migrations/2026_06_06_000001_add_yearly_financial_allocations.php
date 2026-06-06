<?php

use App\Services\LegacyFinancialYearBackfillService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_entry_years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_entry_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->decimal('amount_allocated', 14, 6);
            $table->boolean('is_locked')->default(false);
            $table->timestamp('locked_at')->nullable();
            $table->foreignId('locked_by_snapshot_run_id')->nullable()->constrained('snapshot_runs')->nullOnDelete();
            $table->string('locked_reason')->nullable();
            $table->timestamps();

            $table->unique(['subscription_entry_id', 'year'], 'subscription_entry_year_unique');
            $table->index('subscription_entry_id');
            $table->index('year');
            $table->index('is_locked');
            $table->index('locked_by_snapshot_run_id');
        });

        Schema::create('subscription_entry_year_ownership_copies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_entry_year_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ownership_copy_id')->constrained()->cascadeOnDelete();
            $table->decimal('allocated_amount', 14, 6);
            $table->timestamps();

            $table->unique(
                ['subscription_entry_year_id', 'ownership_copy_id'],
                'subscription_entry_year_copy_unique',
            );
            $table->index('subscription_entry_year_id');
            $table->index('ownership_copy_id');
        });

        Schema::table('in_app_purchases', function (Blueprint $table) {
            $table->boolean('is_locked')->default(false)->after('purchased_at');
            $table->timestamp('locked_at')->nullable()->after('is_locked');
            $table->foreignId('locked_by_snapshot_run_id')
                ->nullable()
                ->after('locked_at')
                ->constrained('snapshot_runs')
                ->nullOnDelete();
            $table->string('locked_reason')->nullable()->after('locked_by_snapshot_run_id');
            $table->index('is_locked');
            $table->index('locked_by_snapshot_run_id');
        });

        app(LegacyFinancialYearBackfillService::class)->run();
    }

    public function down(): void
    {
        Schema::table('in_app_purchases', function (Blueprint $table) {
            $table->dropForeign(['locked_by_snapshot_run_id']);
            $table->dropIndex(['is_locked']);
            $table->dropIndex(['locked_by_snapshot_run_id']);
            $table->dropColumn([
                'is_locked',
                'locked_at',
                'locked_by_snapshot_run_id',
                'locked_reason',
            ]);
        });

        Schema::dropIfExists('subscription_entry_year_ownership_copies');
        Schema::dropIfExists('subscription_entry_years');

        if (Schema::hasColumn('snapshot_runs', 'summary_json')) {
            DB::table('snapshot_runs')->update(['summary_json' => null]);
        }
    }
};
