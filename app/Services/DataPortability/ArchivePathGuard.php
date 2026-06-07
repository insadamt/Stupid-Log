<?php

namespace App\Services\DataPortability;

use InvalidArgumentException;

final class ArchivePathGuard
{
    private const MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    public function assertSafe(string $path): void
    {
        if ($path === '' || str_contains($path, "\0") || str_starts_with($path, '/') || str_starts_with($path, '\\')) {
            throw new InvalidArgumentException('The backup contains an unsafe archive path.');
        }

        if (preg_match('/^[a-zA-Z]:[\\\\\\/]/', $path) === 1) {
            throw new InvalidArgumentException('The backup contains an absolute archive path.');
        }

        $segments = preg_split('~[\\\\/]~', $path);

        if ($segments === false || in_array('..', $segments, true) || in_array('.', $segments, true)) {
            throw new InvalidArgumentException('The backup contains a traversal archive path.');
        }
    }

    public function assertSupportedMedia(string $path): void
    {
        $this->assertSafe($path);
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if (! in_array($extension, self::MEDIA_EXTENSIONS, true)) {
            throw new InvalidArgumentException("Unsupported backup media extension: {$extension}");
        }
    }
}
