<?php

namespace App\Http\Requests\StupidLog;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:255'],
            'currency_code' => ['required', 'exists:currencies,code'],
            'igdb_client_id' => ['nullable', 'string'],
            'igdb_client_secret' => ['nullable', 'string'],
            'steam_api_key' => ['nullable', 'string'],
        ];
    }
}