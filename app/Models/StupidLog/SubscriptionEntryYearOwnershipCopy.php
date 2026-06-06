<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'subscription_entry_year_id',
    'ownership_copy_id',
    'allocated_amount',
])]
class SubscriptionEntryYearOwnershipCopy extends Model
{
    protected function casts(): array
    {
        return [
            'allocated_amount' => 'decimal:6',
        ];
    }

    public function subscriptionEntryYear(): BelongsTo
    {
        return $this->belongsTo(SubscriptionEntryYear::class);
    }

    public function ownershipCopy(): BelongsTo
    {
        return $this->belongsTo(OwnershipCopy::class);
    }
}
