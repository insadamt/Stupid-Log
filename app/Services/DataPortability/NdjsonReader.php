<?php

namespace App\Services\DataPortability;

use Generator;
use JsonException;
use RuntimeException;

final class NdjsonReader
{
    /**
     * @param  resource  $stream
     * @return Generator<int, array>
     *
     * @throws JsonException
     */
    public function rows($stream, ?int $limit = null): Generator
    {
        $lineNumber = 0;
        $yielded = 0;

        while (($line = fgets($stream)) !== false) {
            $lineNumber++;
            $line = trim($line);

            if ($line === '') {
                throw new RuntimeException("Malformed NDJSON: blank line at {$lineNumber}.");
            }

            try {
                $row = json_decode($line, true, flags: JSON_THROW_ON_ERROR);
            } catch (JsonException $exception) {
                throw new RuntimeException("Malformed NDJSON at line {$lineNumber}.", previous: $exception);
            }

            if (! is_array($row) || array_is_list($row)) {
                throw new RuntimeException("Malformed NDJSON object at line {$lineNumber}.");
            }

            yield $lineNumber => $row;
            $yielded++;

            if ($limit !== null && $yielded >= $limit) {
                return;
            }
        }

        if (! feof($stream)) {
            throw new RuntimeException('Unable to read the NDJSON stream.');
        }
    }
}
