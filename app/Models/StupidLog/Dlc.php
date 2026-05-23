<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['game_id', 'steam_app_id', 'title', 'cover_url_original', 'cover_path', 'base_price', 'source_provider_id', 'synced_at'])]
class Dlc extends Model
{
    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'synced_at' => 'datetime',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
