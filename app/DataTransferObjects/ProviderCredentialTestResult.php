<?php

namespace App\DataTransferObjects;

final readonly class ProviderCredentialTestResult
{
    public function __construct(
        public bool $ok,
        public string $message,
    ) {}
}
