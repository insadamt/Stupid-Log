<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['username', 'avatar_path'])]
class User extends Model
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public function settings(): HasOne
    {
        return $this->hasOne(\App\Models\StupidLog\AppSetting::class);
    }

    public function libraryGames(): HasMany
    {
        return $this->hasMany(\App\Models\StupidLog\LibraryGame::class);
    }
}
