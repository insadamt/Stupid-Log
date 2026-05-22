<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['name'])]
class Platform extends Model
{
    public function devices(): BelongsToMany
    {
        return $this->belongsToMany(Device::class, 'platform_device')->withTimestamps();
    }

    public function ownershipTypes(): BelongsToMany
    {
        return $this->belongsToMany(OwnershipType::class, 'platform_ownership_type')->withTimestamps();
    }
}
