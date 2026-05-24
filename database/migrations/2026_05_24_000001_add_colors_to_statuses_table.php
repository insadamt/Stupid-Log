<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('statuses', 'color_key')) {
            Schema::table('statuses', function (Blueprint $table) {
                $table->string('color_key')->default('gray')->after('name');
            });
        }

        if (! Schema::hasColumn('statuses', 'color_hex')) {
            Schema::table('statuses', function (Blueprint $table) {
                $table->string('color_hex', 7)->default('#9CA3AF')->after('color_key');
            });
        }

        foreach ($this->statusColors() as $name => $colors) {
            DB::table('statuses')
                ->where('name', $name)
                ->update([
                    'color_key' => $colors['color_key'],
                    'color_hex' => $colors['color_hex'],
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('statuses', function (Blueprint $table) {
            if (Schema::hasColumn('statuses', 'color_key')) {
                $table->dropColumn('color_key');
            }

            if (Schema::hasColumn('statuses', 'color_hex')) {
                $table->dropColumn('color_hex');
            }
        });
    }

    private function statusColors(): array
    {
        return [
            'Not Played' => ['color_key' => 'gray', 'color_hex' => '#9CA3AF'],
            'In Progress' => ['color_key' => 'yellow', 'color_hex' => '#FACC15'],
            'Dropped' => ['color_key' => 'red', 'color_hex' => '#EF4444'],
            'Completed' => ['color_key' => 'green', 'color_hex' => '#22C55E'],
            '100%' => ['color_key' => 'gold', 'color_hex' => '#F59E0B'],
        ];
    }
};
