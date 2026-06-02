<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'is_subscription'])]
class OwnershipType extends Model
{
    protected function casts(): array
    {
        return [
            'is_subscription' => 'boolean',
        ];
    }
}
