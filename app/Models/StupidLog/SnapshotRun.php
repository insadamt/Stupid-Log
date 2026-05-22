<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'year', 'status', 'confirmed_at'])]
class SnapshotRun extends Model
{
    protected function casts(): array
    {
        return ['confirmed_at' => 'datetime'];
    }
}
