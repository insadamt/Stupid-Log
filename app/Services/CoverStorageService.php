<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class CoverStorageService
{
    public function storeFromUrl(?string $url): ?string
    {
        return $this->storeFromUrlIn($url, 'covers/provider/'.now()->format('Y/m'));
    }

    public function storeTemporaryFromUrl(?string $url): ?string
    {
        return $this->storeFromUrlIn($url, 'covers/provider-drafts/'.now()->format('Y/m'));
    }

    public function promoteTemporaryProviderCover(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (! str_starts_with($path, 'covers/provider-drafts/')) {
            return $path;
        }

        if (! Storage::disk('public')->exists($path)) {
            return null;
        }

        $extension = pathinfo($path, PATHINFO_EXTENSION) ?: 'jpg';
        $nextPath = 'covers/provider/'.now()->format('Y/m').'/'.Str::uuid().'.'.$extension;
        Storage::disk('public')->move($path, $nextPath);

        return $nextPath;
    }

    public function deleteTemporaryProviderCover(?string $path): void
    {
        if ($path && str_starts_with($path, 'covers/provider-drafts/')) {
            Storage::disk('public')->delete($path);
        }
    }

    private function storeFromUrlIn(?string $url, string $directory): ?string
    {
        if (! $url || ! filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        try {
            $response = Http::timeout(12)->get($url)->throw();
            $contentType = strtolower((string) $response->header('Content-Type'));
            $extension = match (true) {
                str_contains($contentType, 'png') => 'png',
                str_contains($contentType, 'webp') => 'webp',
                default => 'jpg',
            };

            $path = $directory.'/'.Str::uuid().'.'.$extension;
            Storage::disk('public')->put($path, $response->body());

            return $path;
        } catch (Throwable) {
            return null;
        }
    }
}
