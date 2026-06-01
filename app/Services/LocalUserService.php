<?php

namespace App\Services;

use App\Models\User;

class LocalUserService
{
    public function get(): User
    {
        return User::first() ?? User::create(['username' => 'Player One', 'avatar_path' => null]);
    }
}
