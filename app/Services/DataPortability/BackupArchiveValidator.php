<?php

namespace App\Services\DataPortability;

use App\DataTransferObjects\DataPortability\ValidatedBackup;
use JsonException;
use RuntimeException;
use ZipArchive;

final class BackupArchiveValidator
{
    public function __construct(
        private readonly BackupTableRegistry $tables,
        private readonly ArchivePathGuard $paths,
        private readonly NdjsonReader $ndjson,
    ) {}

    public function validate(string $archivePath): ValidatedBackup
    {
        $zip = new ZipArchive;

        if ($zip->open($archivePath) !== true) {
            throw new RuntimeException('The uploaded file is not a readable ZIP archive.');
        }

        try {
            $entries = $this->validateEntryPaths($zip);
            $manifest = $this->readJson($zip, 'manifest.json');
            $checksums = $this->readJson($zip, 'checksums.json');
            $this->validateManifest($manifest);
            $declaredFiles = $this->declaredContentFiles($manifest);
            $this->validateDeclaredEntries($entries, $declaredFiles);
            $this->validateChecksums($zip, $checksums, $declaredFiles);
            $this->validateTableRows($zip, $manifest);
            $this->validateMediaIndex($zip, $manifest, $declaredFiles);

            return new ValidatedBackup($manifest, $checksums['files']);
        } finally {
            $zip->close();
        }
    }

    /**
     * @return list<string>
     */
    private function validateEntryPaths(ZipArchive $zip): array
    {
        $entries = [];

        for ($index = 0; $index < $zip->numFiles; $index++) {
            $path = $zip->getNameIndex($index);

            if ($path === false) {
                throw new RuntimeException('Unable to inspect a ZIP entry.');
            }

            $this->paths->assertSafe($path);

            if (str_ends_with($path, '/')) {
                throw new RuntimeException("Directory entries are not supported: {$path}");
            }

            if (isset($entries[$path])) {
                throw new RuntimeException("Duplicate ZIP entry: {$path}");
            }

            $entries[$path] = true;
        }

        foreach (['manifest.json', 'checksums.json', 'media-index.ndjson'] as $required) {
            if (! isset($entries[$required])) {
                throw new RuntimeException("Missing required backup file: {$required}");
            }
        }

        return array_keys($entries);
    }

    private function validateManifest(array $manifest): void
    {
        if (($manifest['format'] ?? null) !== 'stupid-log-backup') {
            throw new RuntimeException('Unsupported backup format.');
        }

        if (($manifest['format_version'] ?? null) !== 1) {
            throw new RuntimeException('Unsupported backup format version.');
        }

        foreach (['created_at', 'currency_code', 'tables', 'media'] as $key) {
            if (! array_key_exists($key, $manifest)) {
                throw new RuntimeException("Manifest is missing {$key}.");
            }
        }

        if (! is_array($manifest['tables']) || ! is_array($manifest['media'])) {
            throw new RuntimeException('Manifest table or media metadata is malformed.');
        }

        foreach ($this->tables->tables() as $definition) {
            $metadata = $manifest['tables'][$definition->name] ?? null;

            if (! is_array($metadata) || ! is_int($metadata['count'] ?? null) || ($metadata['count'] ?? -1) < 0) {
                throw new RuntimeException("Manifest count is invalid for {$definition->name}.");
            }

            if (! is_array($metadata['files'] ?? null) || $metadata['files'] === []) {
                throw new RuntimeException("Manifest files are invalid for {$definition->name}.");
            }

            $this->validateTableFiles($definition, $metadata['files']);
        }

        if (! is_int($manifest['media']['count'] ?? null) || ($manifest['media']['count'] ?? -1) < 0) {
            throw new RuntimeException('Manifest media count is invalid.');
        }

        if (($manifest['media']['index_file'] ?? null) !== 'media-index.ndjson') {
            throw new RuntimeException('Manifest media index is invalid.');
        }
    }

    private function validateTableFiles(BackupTableDefinition $definition, array $files): void
    {
        foreach ($files as $index => $file) {
            if (! is_string($file)) {
                throw new RuntimeException("Manifest file path is invalid for {$definition->name}.");
            }

            $this->paths->assertSafe($file);

            $expected = $definition->partitioned
                ? sprintf('%s.part-%06d.ndjson', $definition->path, $index + 1)
                : $definition->path;

            if ($file !== $expected || (! $definition->partitioned && count($files) !== 1)) {
                throw new RuntimeException("Manifest file sequence is invalid for {$definition->name}.");
            }
        }
    }

    /**
     * @return list<string>
     */
    private function declaredContentFiles(array $manifest): array
    {
        $files = ['media-index.ndjson'];

        foreach ($this->tables->tables() as $definition) {
            array_push($files, ...$manifest['tables'][$definition->name]['files']);
        }

        return $files;
    }

    private function validateDeclaredEntries(array $entries, array &$declaredFiles): void
    {
        $declared = array_fill_keys(['manifest.json', 'checksums.json', ...$declaredFiles], true);

        foreach ($entries as $entry) {
            if (isset($declared[$entry])) {
                continue;
            }

            if (! str_starts_with($entry, 'media/covers/')) {
                throw new RuntimeException("Undeclared backup entry: {$entry}");
            }

            $this->paths->assertSupportedMedia($entry);
            $declared[$entry] = true;
            $declaredFiles[] = $entry;
        }
    }

    private function validateChecksums(ZipArchive $zip, array $checksums, array $declaredFiles): void
    {
        if (($checksums['algorithm'] ?? null) !== 'sha256' || ! is_array($checksums['files'] ?? null)) {
            throw new RuntimeException('Checksum metadata is malformed.');
        }

        $expectedPaths = $declaredFiles;
        $checksumPaths = array_keys($checksums['files']);
        sort($expectedPaths);
        sort($checksumPaths);

        if ($checksumPaths !== $expectedPaths) {
            throw new RuntimeException('Checksum file declarations do not match archive contents.');
        }

        foreach ($checksums['files'] as $path => $checksum) {
            if (! is_string($checksum) || preg_match('/^[a-f0-9]{64}$/', $checksum) !== 1) {
                throw new RuntimeException("Invalid SHA-256 checksum for {$path}.");
            }

            $stream = $zip->getStream($path);

            if ($stream === false) {
                throw new RuntimeException("Unable to read checksummed file: {$path}");
            }

            $context = hash_init('sha256');
            hash_update_stream($context, $stream);
            fclose($stream);

            if (! hash_equals($checksum, hash_final($context))) {
                throw new RuntimeException("Checksum verification failed for {$path}.");
            }
        }
    }

    private function validateTableRows(ZipArchive $zip, array $manifest): void
    {
        foreach ($this->tables->tables() as $definition) {
            $count = 0;

            foreach ($manifest['tables'][$definition->name]['files'] as $file) {
                $stream = $zip->getStream($file);

                if ($stream === false) {
                    throw new RuntimeException("Missing declared backup file: {$file}");
                }

                foreach ($this->ndjson->rows($stream) as $row) {
                    $this->validateRowShape($definition, $row);
                    $count++;
                }

                fclose($stream);
            }

            if ($count !== $manifest['tables'][$definition->name]['count']) {
                throw new RuntimeException("Backup row count does not match for {$definition->name}.");
            }
        }
    }

    private function validateMediaIndex(ZipArchive $zip, array $manifest, array $declaredFiles): void
    {
        $declared = array_fill_keys($declaredFiles, true);

        $stream = $zip->getStream('media-index.ndjson');

        if ($stream === false) {
            throw new RuntimeException('Unable to read the media index.');
        }

        $count = 0;

        foreach ($this->ndjson->rows($stream) as $row) {
            foreach (['entity_type', 'old_id', 'original_path', 'archive_path'] as $field) {
                if (! array_key_exists($field, $row)) {
                    throw new RuntimeException("Media index row is missing {$field}.");
                }
            }

            if (! in_array($row['entity_type'], ['game', 'dlc'], true)
                || ! is_int($row['old_id'])
                || ! is_string($row['original_path'])
                || ! is_string($row['archive_path'])) {
                throw new RuntimeException('Media index row is malformed.');
            }

            $this->paths->assertSupportedMedia($row['archive_path']);

            if (! isset($declared[$row['archive_path']])) {
                throw new RuntimeException("Missing indexed media file: {$row['archive_path']}");
            }

            $count++;
        }

        fclose($stream);

        if ($count !== $manifest['media']['count']) {
            throw new RuntimeException('Backup media count does not match the media index.');
        }
    }

    private function validateRowShape(BackupTableDefinition $definition, array $row): void
    {
        $expected = [...array_diff($definition->columns, ['id']), 'old_id'];
        $actual = array_keys($row);
        sort($expected);
        sort($actual);

        if ($actual !== $expected || ! is_int($row['old_id'])) {
            throw new RuntimeException("Malformed {$definition->name} backup row.");
        }
    }

    private function readJson(ZipArchive $zip, string $path): array
    {
        $contents = $zip->getFromName($path);

        if ($contents === false) {
            throw new RuntimeException("Missing required backup file: {$path}");
        }

        try {
            $decoded = json_decode($contents, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException("Malformed JSON file: {$path}", previous: $exception);
        }

        if (! is_array($decoded) || array_is_list($decoded)) {
            throw new RuntimeException("Malformed JSON object: {$path}");
        }

        return $decoded;
    }
}
