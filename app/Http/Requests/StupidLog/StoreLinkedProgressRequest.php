<?php

namespace App\Http\Requests\StupidLog;

use Illuminate\Foundation\Http\FormRequest;

class StoreLinkedProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'source_library_game_id' => ['required', 'integer', 'exists:library_games,id'],
            'sync_playtime' => ['nullable', 'boolean'],
            'sync_achievements' => ['nullable', 'boolean'],
            'sync_dates' => ['nullable', 'boolean'],
            'sync_status' => ['nullable', 'boolean'],
        ];
    }
}
