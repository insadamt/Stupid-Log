<?php

namespace App\Models\StupidLog;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['user_id', 'ownership_type_id', 'amount_paid', 'started_at', 'finished_at'])]
class SubscriptionEntry extends Model
{
    protected function casts(): array
    {
        return [
            'amount_paid' => 'decimal:2',
            'started_at' => 'date',
            'finished_at' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ownershipType(): BelongsTo
    {
        return $this->belongsTo(OwnershipType::class);
    }

    public function ownershipCopies(): BelongsToMany
    {
        return $this->belongsToMany(OwnershipCopy::class, 'subscription_entry_ownership_copies')
            ->withTimestamps();
    }
}
