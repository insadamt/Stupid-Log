<?php

namespace App\Services\DataPortability;

final readonly class BackupTableDefinition
{
    public function __construct(
        public string $name,
        public string $table,
        public string $path,
        public array $columns,
        public bool $partitioned = false,
    ) {}
}
