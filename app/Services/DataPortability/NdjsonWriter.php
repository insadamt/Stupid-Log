<?php

namespace App\Services\DataPortability;

use JsonException;
use RuntimeException;

final class NdjsonWriter
{
    /** @var resource */
    private $handle;

    public function __construct(string $path)
    {
        $directory = dirname($path);

        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException("Unable to create backup directory: {$directory}");
        }

        $handle = fopen($path, 'wb');

        if ($handle === false) {
            throw new RuntimeException("Unable to open NDJSON file: {$path}");
        }

        $this->handle = $handle;
    }

    /**
     * @throws JsonException
     */
    public function write(array $row): void
    {
        $line = json_encode($row, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE)."\n";

        if (fwrite($this->handle, $line) === false) {
            throw new RuntimeException('Unable to write NDJSON row.');
        }
    }

    public function close(): void
    {
        if (is_resource($this->handle)) {
            fclose($this->handle);
        }
    }

    public function __destruct()
    {
        $this->close();
    }
}
