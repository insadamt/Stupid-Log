<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'library_game_id',
    'title',
    'amount_paid',
    'purchased_at',
    'is_locked',
    'locked_at',
    'locked_by_snapshot_run_id',
    'locked_reason',
])]
class InAppPurchase extends Model
{
    protected function casts(): array
    {
        return [
            'amount_paid' => 'decimal:2',
            'purchased_at' => 'date',
            'is_locked' => 'boolean',
            'locked_at' => 'datetime',
        ];
    }

    public function libraryGame(): BelongsTo
    {
        return $this->belongsTo(LibraryGame::class);
    }

    public function lockedBySnapshotRun(): BelongsTo
    {
        return $this->belongsTo(SnapshotRun::class, 'locked_by_snapshot_run_id');
    }
}
