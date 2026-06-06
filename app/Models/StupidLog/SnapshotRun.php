<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'year', 'status', 'confirmed_at', 'summary_json'])]
class SnapshotRun extends Model
{
    protected function casts(): array
    {
        return [
            'confirmed_at' => 'datetime',
            'summary_json' => 'array',
        ];
    }

    public function lockedSubscriptionEntryYears(): HasMany
    {
        return $this->hasMany(SubscriptionEntryYear::class, 'locked_by_snapshot_run_id');
    }

    public function lockedInAppPurchases(): HasMany
    {
        return $this->hasMany(InAppPurchase::class, 'locked_by_snapshot_run_id');
    }
}
