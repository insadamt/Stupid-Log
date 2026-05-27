<?php

namespace App\Models\StupidLog;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'provider_key', 'external_id', 'steam_app_id', 'game_payload', 'dlcs', 'cover_path', 'consumed_at', 'expires_at'])]
class ProviderImportDraft extends Model
{
    protected function casts(): array
    {
        return [
            'game_payload' => 'array',
            'dlcs' => 'array',
            'consumed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
