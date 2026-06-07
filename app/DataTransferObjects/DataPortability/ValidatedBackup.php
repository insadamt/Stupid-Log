<?php

namespace App\DataTransferObjects\DataPortability;

final readonly class ValidatedBackup
{
    public function __construct(
        public array $manifest,
        public array $checksums,
    ) {}
}
