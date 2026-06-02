<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('ownership_types', 'is_subscription')) {
            Schema::table('ownership_types', function (Blueprint $table) {
                $table->boolean('is_subscription')->default(false)->after('name');
            });
        }

        DB::table('ownership_types')
            ->whereIn('name', ['Game Pass', 'EA Play', 'U+', 'PS Plus', 'Play Pass', 'Apple Arcade', 'Nintendo Switch Online'])
            ->update(['is_subscription' => true]);

        if (! Schema::hasTable('subscription_entries')) {
            Schema::create('subscription_entries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('ownership_type_id')->constrained('ownership_types')->restrictOnDelete();
                $table->decimal('amount_paid', 10, 2);
                $table->date('started_at');
                $table->date('finished_at');
                $table->timestamps();

                $table->index('user_id');
                $table->index('ownership_type_id');
                $table->index('started_at');
                $table->index('finished_at');
            });
        }

        if (! Schema::hasTable('subscription_entry_ownership_copies')) {
            Schema::create('subscription_entry_ownership_copies', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subscription_entry_id')->constrained()->cascadeOnDelete();
                $table->foreignId('ownership_copy_id')->constrained()->cascadeOnDelete();
                $table->timestamps();

                $table->index('subscription_entry_id');
                $table->index('ownership_copy_id');
                $table->unique(['subscription_entry_id', 'ownership_copy_id'], 'subscription_entry_copy_unique');
            });
        }

        if (! Schema::hasTable('in_app_purchases')) {
            Schema::create('in_app_purchases', function (Blueprint $table) {
                $table->id();
                $table->foreignId('library_game_id')->constrained()->cascadeOnDelete();
                $table->string('title');
                $table->decimal('amount_paid', 10, 2);
                $table->date('purchased_at');
                $table->timestamps();

                $table->index('library_game_id');
                $table->index('purchased_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('in_app_purchases');
        Schema::dropIfExists('subscription_entry_ownership_copies');
        Schema::dropIfExists('subscription_entries');

        if (Schema::hasColumn('ownership_types', 'is_subscription')) {
            Schema::table('ownership_types', function (Blueprint $table) {
                $table->dropColumn('is_subscription');
            });
        }
    }
};
