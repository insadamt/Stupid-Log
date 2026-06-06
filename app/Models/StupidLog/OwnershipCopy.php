<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    public function libraryGame(): BelongsTo
    {
        return $this->belongsTo(LibraryGame::class);
    }

    public function physicalStatus(): BelongsTo
    {
        return $this->belongsTo(PhysicalStatus::class);
    }

    public function subscriptionEntries(): BelongsToMany
    {
        return $this->belongsToMany(SubscriptionEntry::class, 'subscription_entry_ownership_copies')
            ->withTimestamps();
    }

    public function subscriptionEntryYears(): BelongsToMany
    {
        return $this->belongsToMany(
            SubscriptionEntryYear::class,
            'subscription_entry_year_ownership_copies',
        )
            ->withPivot('allocated_amount')
            ->withTimestamps();
    }

    public function subscriptionEntryYearAllocations(): HasMany
    {
        return $this->hasMany(SubscriptionEntryYearOwnershipCopy::class);
    }
}
