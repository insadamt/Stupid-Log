<?php

namespace App\Http\Requests\StupidLog;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLibraryGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'game' => ['required', 'array'],
            'game.title' => ['required', 'string', 'max:255'],
            'game.source' => ['nullable', 'string', Rule::in(['manual', 'igdb', 'steam'])],
            'game.external_ids' => ['nullable', 'array'],
            'game.external_ids.igdb' => ['nullable', 'string', 'max:255'],
            'game.external_ids.steam' => ['nullable', 'string', 'max:255'],
            'game.external_id' => ['nullable', 'string', 'max:255'],
            'game.steam_app_id' => ['nullable', 'string', 'max:255'],
            'game.create_duplicate_anyway' => ['nullable', 'boolean'],
            'game.cover_url_original' => ['nullable', 'url', 'max:2048'],
            'game.cover_path' => ['nullable', 'string', 'max:2048'],
            'game.publisher' => ['nullable', 'string', 'max:255'],
            'game.release_date' => ['nullable', 'date'],
            'game.description' => ['nullable', 'string'],
            'game.base_price_default' => ['nullable', 'numeric', 'min:0'],
            'game.base_price_source' => ['nullable', 'string', 'max:255'],
            'game.total_achievements' => ['nullable', 'integer', 'min:0'],
            'game.total_achievements_source' => ['nullable', 'string', 'max:255'],

            'platform_id' => ['required', 'integer', 'exists:platforms,id'],
            'device_ids' => ['required', 'array', 'min:1'],
            'device_ids.*' => ['required', 'integer', 'exists:devices,id'],

            'ownership_copies' => ['required', 'array', 'min:1'],
            'ownership_copies.*.ownership_type_id' => ['required', 'integer', 'exists:ownership_types,id'],
            'ownership_copies.*.physical_status_id' => ['nullable', 'integer', 'exists:physical_statuses,id'],
            'ownership_copies.*.edition_name' => ['nullable', 'string', 'max:255'],
            'ownership_copies.*.base_price' => ['nullable', 'numeric', 'min:0'],
            'ownership_copies.*.purchased_price' => ['nullable', 'numeric', 'min:0'],
            'ownership_copies.*.purchased_at' => ['nullable', 'date'],

            'progress' => ['required', 'array'],
            'progress.status_id' => ['required', 'integer', 'exists:statuses,id'],
            'progress.playtime_hours' => ['nullable', 'numeric', 'min:0', 'max:999999.9'],
            'progress.earned_achievements' => ['nullable', 'integer', 'min:0'],
            'progress.first_played_at' => ['nullable', 'date'],
            'progress.last_played_at' => ['nullable', 'date'],
            'progress.completed_at' => ['nullable', 'date'],

            'owned_dlcs' => ['nullable', 'array'],
            'owned_dlcs.*.dlc_id' => ['nullable', 'integer', 'exists:dlcs,id', 'required_without:owned_dlcs.*.steam_app_id'],
            'owned_dlcs.*.steam_app_id' => ['nullable', 'string', 'max:255', 'required_without:owned_dlcs.*.dlc_id'],
            'owned_dlcs.*.acquisition_type' => ['required', 'string', Rule::in(['Owned', 'Edition Included', 'Free'])],
            'owned_dlcs.*.purchased_price' => ['nullable', 'numeric', 'min:0'],
            'owned_dlcs.*.purchased_at' => ['nullable', 'date'],
        ];
    }
}
