<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['library_game_id', 'ownership_type_id', 'physical_status_id', 'edition_name', 'base_price', 'purchased_price', 'purchased_at'])]
class OwnershipCopy extends Model
{
    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'purchased_price' => 'decimal:2',
            'purchased_at' => 'date',
        ];
    }

    public function ownershipType(): BelongsTo
    {
        return $this->belongsTo(OwnershipType::class);
    }
}
