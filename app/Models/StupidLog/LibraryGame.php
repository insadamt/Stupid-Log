<?php

namespace App\Models\StupidLog;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'user_id',
    'game_id',
    'platform_id',
    'status_id',
    'playtime_hours',
    'earned_achievements',
    'first_played_at',
    'last_played_at',
    'completed_at',
])]
class LibraryGame extends Model
{
    protected function casts(): array
    {
        return [
            'playtime_hours' => 'decimal:1',
            'first_played_at' => 'date',
            'last_played_at' => 'date',
            'completed_at' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function platform(): BelongsTo
    {
        return $this->belongsTo(Platform::class);
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(Status::class);
    }

    public function devices(): BelongsToMany
    {
        return $this->belongsToMany(Device::class, 'library_game_device')->withTimestamps();
    }

    public function ownershipCopies(): HasMany
    {
        return $this->hasMany(OwnershipCopy::class);
    }

    public function ownedDlcs(): HasMany
    {
        return $this->hasMany(OwnedDlc::class);
    }

    public function inAppPurchases(): HasMany
    {
        return $this->hasMany(InAppPurchase::class);
    }

    public function progressLink(): HasOne
    {
        return $this->hasOne(LibraryGameProgressLink::class, 'target_library_game_id');
    }

    public function progressLinksAsSource(): HasMany
    {
        return $this->hasMany(LibraryGameProgressLink::class, 'source_library_game_id');
    }
}
