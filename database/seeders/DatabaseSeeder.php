<?php

namespace Database\Seeders;

use App\Models\StupidLog\AppSetting;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(StupidLogReferenceSeeder::class);

        $user = User::updateOrCreate(
            ['username' => 'Player One'],
            ['avatar_path' => null],
        );

        AppSetting::updateOrCreate(
            ['user_id' => $user->id],
            ['currency_code' => 'USD'],
        );

        if (! app()->environment('testing')) {
            $this->call(StupidLogDemoLibrarySeeder::class);
        }
    }
}
