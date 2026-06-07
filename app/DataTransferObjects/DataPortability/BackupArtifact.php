<?php

namespace App\DataTransferObjects\DataPortability;

final readonly class BackupArtifact
{
    public function __construct(
        public string $path,
        public string $downloadName,
    ) {}
}
