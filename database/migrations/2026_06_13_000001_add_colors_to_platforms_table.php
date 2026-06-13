<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platforms', function (Blueprint $table) {
            if (! Schema::hasColumn('platforms', 'color_key')) {
                $table->string('color_key')->nullable()->after('name');
            }

            if (! Schema::hasColumn('platforms', 'color_hex')) {
                $table->string('color_hex', 7)->nullable()->after('color_key');
            }
        });
    }

    public function down(): void
    {
        Schema::table('platforms', function (Blueprint $table) {
            if (Schema::hasColumn('platforms', 'color_hex')) {
                $table->dropColumn('color_hex');
            }

            if (Schema::hasColumn('platforms', 'color_key')) {
                $table->dropColumn('color_key');
            }
        });
    }
};
