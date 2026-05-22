<?php

namespace App\Services;

use Illuminate\Support\Str;

class TitleNormalizer
{
    public function normalize(string $title): string
    {
        return Str::of($title)
            ->lower()
            ->ascii()
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->toString();
    }
}
