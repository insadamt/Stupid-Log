<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'title',
    'normalized_title',
    'cover_url_original',
    'cover_path',
    'publisher',
    'release_date',
    'description',
    'source_provider_id',
    'base_price_default',
    'base_price_source',
    'total_achievements',
    'total_achievements_source',
    'provider_synced_at',
])]
class Game extends Model
{
    protected function casts(): array
    {
        return [
            'release_date' => 'date',
            'provider_synced_at' => 'datetime',
            'base_price_default' => 'decimal:2',
        ];
    }

    public function externalIds(): HasMany
    {
        return $this->hasMany(ExternalGameId::class);
    }

    public function libraryGames(): HasMany
    {
        return $this->hasMany(LibraryGame::class);
    }

    public function dlcs(): HasMany
    {
        return $this->hasMany(Dlc::class);
    }
}
