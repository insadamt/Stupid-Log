<?php

namespace App\Services\StupidLog;

readonly class ValidatedBackup
{
    public function __construct(
        public array $manifest,
        public array $data,
        public array $coverPaths,
    ) {}
}
