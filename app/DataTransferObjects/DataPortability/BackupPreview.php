<?php

namespace App\DataTransferObjects\DataPortability;

final readonly class BackupPreview
{
    public function __construct(
        public string $token,
        public string $createdAt,
        public string $currencyCode,
        public array $counts,
        public int $mediaCount,
        public string $expiresAt,
    ) {}

    public function toArray(): array
    {
        return [
            'token' => $this->token,
            'created_at' => $this->createdAt,
            'currency_code' => $this->currencyCode,
            'counts' => $this->counts,
            'media_count' => $this->mediaCount,
            'expires_at' => $this->expiresAt,
        ];
    }
}
