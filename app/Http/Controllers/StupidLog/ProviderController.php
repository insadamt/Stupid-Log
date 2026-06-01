<?php

namespace App\Http\Controllers\StupidLog;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ProviderImportDraftService;
use App\Services\ProviderSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProviderController extends Controller
{
    public function providerSearch(Request $request, ProviderSearchService $providers): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'min:2'],
            'provider' => ['nullable', 'string', Rule::in(['igdb', 'steam'])],
            'enrich' => ['nullable', 'boolean'],
            'steam_app_id' => ['nullable', 'string', 'max:255'],
        ]);

        return response()->json($providers->search(
            $this->localUser(),
            $validated['query'],
            $validated['provider'] ?? 'igdb',
            (bool) ($validated['enrich'] ?? false),
            $validated['steam_app_id'] ?? null,
        ));
    }

    public function storeProviderImportDraft(Request $request, ProviderImportDraftService $drafts): JsonResponse
    {
        $validated = $request->validate([
            'result' => ['required', 'array'],
            'result.source' => ['required', 'string', Rule::in(['igdb', 'steam'])],
            'result.external_id' => ['required', 'string', 'max:255'],
            'result.title' => ['required', 'string', 'max:255'],
            'result.cover_url_original' => ['nullable', 'url', 'max:2048'],
            'result.publisher' => ['nullable', 'string', 'max:255'],
            'result.release_date' => ['nullable', 'date'],
            'result.description' => ['nullable', 'string'],
            'result.steam_app_id' => ['nullable', 'string', 'max:255'],
            'result.base_price_default' => ['nullable', 'numeric', 'min:0'],
            'result.base_price_source' => ['nullable', 'string', 'max:255'],
            'result.total_achievements' => ['nullable', 'integer', 'min:0'],
            'result.total_achievements_source' => ['nullable', 'string', 'max:255'],
            'result.dlcs' => ['nullable', 'array'],
            'result.dlcs.*.steam_app_id' => ['required_with:result.dlcs', 'string', 'max:255'],
            'result.dlcs.*.title' => ['required_with:result.dlcs', 'string', 'max:255'],
            'result.dlcs.*.base_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $draft = $drafts->create($this->localUser(), $validated['result']);

        return response()->json([
            'id' => $draft->id,
            'cover_path' => $draft->cover_path,
            'expires_at' => $draft->expires_at?->toIso8601String(),
        ], 201);
    }

    public function cancelProviderImportDraft(int $providerImportDraft, ProviderImportDraftService $drafts): JsonResponse
    {
        $drafts->cancel($this->localUser(), $providerImportDraft);

        return response()->json(['ok' => true]);
    }

    private function localUser(): User
    {
        return User::first() ?? User::create(['username' => 'Player One', 'avatar_path' => null]);
    }
}
