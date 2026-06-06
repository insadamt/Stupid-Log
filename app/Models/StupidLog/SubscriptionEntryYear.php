<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'subscription_entry_id',
    'year',
    'amount_allocated',
    'is_locked',
    'locked_at',
    'locked_by_snapshot_run_id',
    'locked_reason',
])]
class SubscriptionEntryYear extends Model
{
    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'amount_allocated' => 'decimal:6',
            'is_locked' => 'boolean',
            'locked_at' => 'datetime',
        ];
    }

    public function subscriptionEntry(): BelongsTo
    {
        return $this->belongsTo(SubscriptionEntry::class);
    }

    public function ownershipCopies(): BelongsToMany
    {
        return $this->belongsToMany(
            OwnershipCopy::class,
            'subscription_entry_year_ownership_copies',
        )
            ->withPivot('allocated_amount')
            ->withTimestamps();
    }

    public function ownershipCopyAllocations(): HasMany
    {
        return $this->hasMany(SubscriptionEntryYearOwnershipCopy::class);
    }

    public function lockedBySnapshotRun(): BelongsTo
    {
        return $this->belongsTo(SnapshotRun::class, 'locked_by_snapshot_run_id');
    }
}
