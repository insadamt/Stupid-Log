<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['library_game_id', 'dlc_id', 'acquisition_type', 'purchased_price', 'purchased_at'])]
class OwnedDlc extends Model
{
    protected function casts(): array
    {
        return [
            'purchased_price' => 'decimal:2',
            'purchased_at' => 'date',
        ];
    }

    public function dlc(): BelongsTo
    {
        return $this->belongsTo(Dlc::class);
    }
}
