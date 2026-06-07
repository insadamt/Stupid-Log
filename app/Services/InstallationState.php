<?php

namespace App\Services;

use App\Models\StupidLog\AppSetting;
use App\Models\User;

final class InstallationState
{
    public function isComplete(): bool
    {
        return User::query()->exists() && AppSetting::query()->exists();
    }
}
