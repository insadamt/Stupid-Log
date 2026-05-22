<?php

namespace App\Models\StupidLog;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'provider_id', 'encrypted_client_id', 'encrypted_client_secret', 'encrypted_api_key', 'is_enabled', 'last_tested_at', 'last_test_status'])]
class ProviderCredential extends Model
{
    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'last_tested_at' => 'datetime',
        ];
    }
}
