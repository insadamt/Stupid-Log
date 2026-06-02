<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['library_game_id', 'title', 'amount_paid', 'purchased_at'])]
class InAppPurchase extends Model
{
    protected function casts(): array
    {
        return [
            'amount_paid' => 'decimal:2',
            'purchased_at' => 'date',
        ];
    }

    public function libraryGame(): BelongsTo
    {
        return $this->belongsTo(LibraryGame::class);
    }
}
