<?php

namespace App\Models\StupidLog;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'user_id',
    'target_library_game_id',
    'source_library_game_id',
    'sync_playtime',
    'sync_achievements',
    'sync_dates',
    'sync_status',
])]
class LibraryGameProgressLink extends Model
{
    protected function casts(): array
    {
        return [
            'sync_playtime' => 'boolean',
            'sync_achievements' => 'boolean',
            'sync_dates' => 'boolean',
            'sync_status' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function targetLibraryGame(): BelongsTo
    {
        return $this->belongsTo(LibraryGame::class, 'target_library_game_id');
    }

    public function sourceLibraryGame(): BelongsTo
    {
        return $this->belongsTo(LibraryGame::class, 'source_library_game_id');
    }
}
