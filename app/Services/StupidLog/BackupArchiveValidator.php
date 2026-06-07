<?php

namespace App\Services\StupidLog;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use JsonException;
use ZipArchive;

class BackupArchiveValidator
{
    private const REQUIRED_SECTIONS = [
        'profile',
        'games',
        'external_game_ids',
        'library_games',
        'library_game_devices',
        'ownership_copies',
        'dlcs',
        'owned_dlcs',
        'in_app_purchases',
        'subscriptions',
        'subscription_ownership_copies',
        'subscription_years',
        'subscription_year_allocations',
        'snapshots',
        'library_game_snapshots',
        'ownership_copy_snapshots',
        'owned_dlc_snapshots',
        'snapshot_best_games',
    ];

    public function validate(string $path): ValidatedBackup
    {
        $zip = new ZipArchive;
        if ($zip->open($path) !== true) {
            $this->reject('The uploaded file is not a valid ZIP archive.');
        }

        try {
            $entries = $this->inspectEntries($zip);
            $manifestJson = $this->requiredFile($zip, $entries, 'manifest.json');
            $dataJson = $this->requiredFile($zip, $entries, 'data.json');
            $manifest = $this->decodeJson($manifestJson, 'manifest.json');
            $data = $this->decodeJson($dataJson, 'data.json');

            $this->validateManifest($manifest, $dataJson);
            $this->validateSections($data);
            $this->validateRequiredFields($data);
            $this->validateReferences($data);
            $this->validateReferenceValues($data);
            $coverPaths = $this->validateCovers($data, $entries);
            $this->validateCounts($manifest, $data);

            return new ValidatedBackup($manifest, $data, $coverPaths);
        } finally {
            $zip->close();
        }
    }

    private function inspectEntries(ZipArchive $zip): array
    {
        if ($zip->numFiles > config('stupid-log.backup.max_zip_entries')) {
            $this->reject('The backup contains too many files.');
        }

        $entries = [];
        $uncompressedBytes = 0;

        for ($index = 0; $index < $zip->numFiles; $index++) {
            $stat = $zip->statIndex($index);
            $name = $stat['name'] ?? '';

            if (! $this->isSafeArchivePath($name)) {
                $this->reject('The backup contains an unsafe file path.');
            }
            if (isset($entries[$name])) {
                $this->reject('The backup contains duplicate file paths.');
            }

            $uncompressedBytes += (int) ($stat['size'] ?? 0);
            if ($uncompressedBytes > config('stupid-log.backup.max_uncompressed_bytes')) {
                $this->reject('The uncompressed backup is too large.');
            }

            $entries[$name] = true;
        }

        return $entries;
    }

    private function validateManifest(array $manifest, string $dataJson): void
    {
        if (($manifest['format'] ?? null) !== config('stupid-log.backup.format')) {
            $this->reject('This is not a Stupid Log backup.');
        }
        if (($manifest['format_version'] ?? null) !== config('stupid-log.backup.format_version')) {
            $this->reject('This backup format version is not supported.');
        }
        foreach (['app_version', 'exported_at', 'username', 'counts', 'data_sha256'] as $key) {
            if (! array_key_exists($key, $manifest)) {
                $this->reject("The backup manifest is missing {$key}.");
            }
        }
        if (! hash_equals((string) $manifest['data_sha256'], hash('sha256', $dataJson))) {
            $this->reject('The backup data checksum is invalid.');
        }
    }

    private function validateSections(array $data): void
    {
        foreach (self::REQUIRED_SECTIONS as $section) {
            if (! array_key_exists($section, $data)) {
                $this->reject("The backup is missing the {$section} section.");
            }
            if ($section === 'profile') {
                if (! is_array($data[$section])
                    || ! is_string($data[$section]['username'] ?? null)
                    || ! is_string($data[$section]['currency_code'] ?? null)) {
                    $this->reject('The backup profile section is invalid.');
                }
            } elseif (! is_array($data[$section]) || ! array_is_list($data[$section])) {
                $this->reject("The {$section} section must be a list.");
            }
        }
    }

    private function validateReferences(array $data): void
    {
        $refs = [
            'games' => $this->uniqueRefs($data['games'], 'games'),
            'library_games' => $this->uniqueRefs($data['library_games'], 'library_games'),
            'ownership_copies' => $this->uniqueRefs($data['ownership_copies'], 'ownership_copies'),
            'dlcs' => $this->uniqueRefs($data['dlcs'], 'dlcs'),
            'owned_dlcs' => $this->uniqueRefs($data['owned_dlcs'], 'owned_dlcs'),
            'subscriptions' => $this->uniqueRefs($data['subscriptions'], 'subscriptions'),
            'subscription_years' => $this->uniqueRefs($data['subscription_years'], 'subscription_years'),
            'snapshots' => $this->uniqueRefs($data['snapshots'], 'snapshots'),
        ];

        $this->assertReferences($data['external_game_ids'], 'game_ref', $refs['games']);
        $this->assertReferences($data['library_games'], 'game_ref', $refs['games']);
        $this->assertReferences($data['library_game_devices'], 'library_game_ref', $refs['library_games']);
        $this->assertReferences($data['ownership_copies'], 'library_game_ref', $refs['library_games']);
        $this->assertReferences($data['dlcs'], 'game_ref', $refs['games']);
        $this->assertReferences($data['owned_dlcs'], 'library_game_ref', $refs['library_games']);
        $this->assertReferences($data['owned_dlcs'], 'dlc_ref', $refs['dlcs']);
        $this->assertReferences($data['in_app_purchases'], 'library_game_ref', $refs['library_games']);
        $this->assertOptionalReferences($data['in_app_purchases'], 'locked_by_snapshot_ref', $refs['snapshots']);
        $this->assertReferences($data['subscription_ownership_copies'], 'subscription_ref', $refs['subscriptions']);
        $this->assertReferences($data['subscription_ownership_copies'], 'ownership_copy_ref', $refs['ownership_copies']);
        $this->assertReferences($data['subscription_years'], 'subscription_ref', $refs['subscriptions']);
        $this->assertOptionalReferences($data['subscription_years'], 'locked_by_snapshot_ref', $refs['snapshots']);
        $this->assertReferences($data['subscription_year_allocations'], 'subscription_year_ref', $refs['subscription_years']);
        $this->assertReferences($data['subscription_year_allocations'], 'ownership_copy_ref', $refs['ownership_copies']);

        foreach (['library_game_snapshots', 'ownership_copy_snapshots', 'owned_dlc_snapshots', 'snapshot_best_games'] as $section) {
            $this->assertReferences($data[$section], 'snapshot_ref', $refs['snapshots']);
            $this->assertReferences($data[$section], 'library_game_ref', $refs['library_games']);
        }
        $this->assertReferences($data['library_game_snapshots'], 'game_ref', $refs['games']);
        $this->assertReferences($data['ownership_copy_snapshots'], 'ownership_copy_ref', $refs['ownership_copies']);
        $this->assertReferences($data['owned_dlc_snapshots'], 'owned_dlc_ref', $refs['owned_dlcs']);
        $this->assertReferences($data['owned_dlc_snapshots'], 'dlc_ref', $refs['dlcs']);
        $this->assertReferences($data['snapshot_best_games'], 'game_ref', $refs['games']);
    }

    private function validateRequiredFields(array $data): void
    {
        $fieldsBySection = [
            'games' => ['ref', 'title', 'normalized_title', 'cover_url_original', 'local_cover_path', 'archive_cover_path', 'publisher', 'release_date', 'description', 'source_provider_key', 'base_price_default', 'base_price_source', 'total_achievements', 'total_achievements_source', 'provider_synced_at'],
            'external_game_ids' => ['game_ref', 'provider_key', 'external_id', 'url'],
            'library_games' => ['ref', 'game_ref', 'platform', 'status', 'playtime_hours', 'earned_achievements', 'first_played_at', 'last_played_at', 'completed_at'],
            'library_game_devices' => ['library_game_ref', 'device'],
            'ownership_copies' => ['ref', 'library_game_ref', 'ownership_type', 'physical_status', 'edition_name', 'base_price', 'purchased_price', 'purchased_at'],
            'dlcs' => ['ref', 'game_ref', 'steam_app_id', 'title', 'cover_url_original', 'local_cover_path', 'archive_cover_path', 'base_price', 'source_provider_key', 'synced_at'],
            'owned_dlcs' => ['ref', 'library_game_ref', 'dlc_ref', 'acquisition_type', 'purchased_price', 'purchased_at'],
            'in_app_purchases' => ['ref', 'library_game_ref', 'title', 'amount_paid', 'purchased_at', 'is_locked', 'locked_at', 'locked_by_snapshot_ref', 'locked_reason'],
            'subscriptions' => ['ref', 'ownership_type', 'amount_paid', 'started_at', 'finished_at'],
            'subscription_ownership_copies' => ['subscription_ref', 'ownership_copy_ref'],
            'subscription_years' => ['ref', 'subscription_ref', 'year', 'amount_allocated', 'is_locked', 'locked_at', 'locked_by_snapshot_ref', 'locked_reason'],
            'subscription_year_allocations' => ['subscription_year_ref', 'ownership_copy_ref', 'allocated_amount'],
            'snapshots' => ['ref', 'year', 'status', 'confirmed_at', 'summary_json'],
            'library_game_snapshots' => ['snapshot_ref', 'library_game_ref', 'game_ref', 'platform', 'status', 'playtime_hours', 'earned_achievements', 'total_achievements', 'first_played_at', 'last_played_at', 'completed_at'],
            'ownership_copy_snapshots' => ['snapshot_ref', 'ownership_copy_ref', 'library_game_ref', 'ownership_type', 'edition_name', 'base_price', 'purchased_price', 'purchased_at'],
            'owned_dlc_snapshots' => ['snapshot_ref', 'owned_dlc_ref', 'library_game_ref', 'dlc_ref', 'acquisition_type', 'base_price', 'purchased_price', 'purchased_at'],
            'snapshot_best_games' => ['snapshot_ref', 'library_game_ref', 'game_ref', 'rank', 'note'],
        ];

        foreach ($fieldsBySection as $section => $requiredFields) {
            foreach ($data[$section] as $row) {
                if (! is_array($row)) {
                    $this->reject("The {$section} section contains an invalid row.");
                }
                foreach ($requiredFields as $field) {
                    if (! array_key_exists($field, $row)) {
                        $this->reject("The {$section} section is missing {$field}.");
                    }
                }
            }
        }

        if (mb_strlen($data['profile']['username']) > 255) {
            $this->reject('The backup username is too long.');
        }
    }

    private function validateReferenceValues(array $data): void
    {
        $this->assertDatabaseValuesExist('currencies', 'code', [$data['profile']['currency_code']]);
        $this->assertDatabaseValuesExist(
            'providers',
            'key',
            collect($data['games'])->pluck('source_provider_key')
                ->merge(collect($data['dlcs'])->pluck('source_provider_key'))
                ->merge(collect($data['external_game_ids'])->pluck('provider_key'))
                ->filter()->unique()->values()->all(),
        );

        $this->assertDatabaseValuesExist(
            'platforms',
            'name',
            collect($data['library_games'])->pluck('platform')
                ->merge(collect($data['library_game_snapshots'])->pluck('platform'))
                ->filter()->unique()->values()->all(),
        );
        $this->assertDatabaseValuesExist(
            'statuses',
            'name',
            collect($data['library_games'])->pluck('status')
                ->merge(collect($data['library_game_snapshots'])->pluck('status'))
                ->filter()->unique()->values()->all(),
        );
        $this->assertDatabaseValuesExist(
            'ownership_types',
            'name',
            collect($data['ownership_copies'])->pluck('ownership_type')
                ->merge(collect($data['subscriptions'])->pluck('ownership_type'))
                ->merge(collect($data['ownership_copy_snapshots'])->pluck('ownership_type'))
                ->filter()->unique()->values()->all(),
        );
        $this->assertDatabaseValuesExist(
            'physical_statuses',
            'name',
            collect($data['ownership_copies'])->pluck('physical_status')
                ->filter()->unique()->values()->all(),
        );
        $this->assertDatabaseValuesExist(
            'devices',
            'name',
            collect($data['library_game_devices'])->pluck('device')
                ->filter()->unique()->values()->all(),
        );
    }

    private function assertDatabaseValuesExist(string $table, string $column, array $values): void
    {
        if ($values === []) {
            return;
        }

        $found = DB::table($table)->whereIn($column, $values)->pluck($column)->all();
        if (array_diff($values, $found) !== []) {
            $this->reject("The backup references an unsupported {$table} value.");
        }
    }

    private function validateCovers(array $data, array $entries): array
    {
        $coverPaths = [];

        foreach (['games', 'dlcs'] as $section) {
            foreach ($data[$section] as $row) {
                $coverPath = $row['archive_cover_path'] ?? null;
                if ($coverPath === null) {
                    continue;
                }
                if (! is_string($coverPath)
                    || ! str_starts_with($coverPath, 'covers/')
                    || ! $this->isSafeArchivePath($coverPath)
                    || ! isset($entries[$coverPath])) {
                    $this->reject("A cover referenced by {$section} is missing or invalid.");
                }
                $coverPaths[$coverPath] = true;
            }
        }

        return array_keys($coverPaths);
    }

    private function validateCounts(array $manifest, array $data): void
    {
        if (! is_array($manifest['counts'])) {
            $this->reject('The backup counts are invalid.');
        }

        foreach ($data as $section => $rows) {
            if ($section === 'profile') {
                continue;
            }
            if (($manifest['counts'][$section] ?? null) !== count($rows)) {
                $this->reject("The backup count for {$section} is invalid.");
            }
        }
    }

    private function uniqueRefs(array $rows, string $section): array
    {
        $refs = [];
        foreach ($rows as $row) {
            $ref = $row['ref'] ?? null;
            if (! is_string($ref) || $ref === '' || isset($refs[$ref])) {
                $this->reject("The {$section} section contains an invalid or duplicate reference.");
            }
            $refs[$ref] = true;
        }

        return $refs;
    }

    private function assertReferences(array $rows, string $field, array $knownRefs): void
    {
        foreach ($rows as $row) {
            $ref = $row[$field] ?? null;
            if (! is_string($ref) || ! isset($knownRefs[$ref])) {
                $this->reject("The backup contains an invalid {$field} relationship.");
            }
        }
    }

    private function assertOptionalReferences(array $rows, string $field, array $knownRefs): void
    {
        foreach ($rows as $row) {
            $ref = $row[$field] ?? null;
            if ($ref !== null && (! is_string($ref) || ! isset($knownRefs[$ref]))) {
                $this->reject("The backup contains an invalid {$field} relationship.");
            }
        }
    }

    private function requiredFile(ZipArchive $zip, array $entries, string $name): string
    {
        if (! isset($entries[$name])) {
            $this->reject("The backup is missing {$name}.");
        }

        $contents = $zip->getFromName($name);
        if (! is_string($contents)) {
            $this->reject("Unable to read {$name}.");
        }

        return $contents;
    }

    private function decodeJson(string $json, string $filename): array
    {
        try {
            $decoded = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $this->reject("The {$filename} file contains invalid JSON.");
        }

        if (! is_array($decoded)) {
            $this->reject("The {$filename} file must contain a JSON object.");
        }

        return $decoded;
    }

    private function isSafeArchivePath(string $path): bool
    {
        return $path !== ''
            && ! str_contains($path, "\0")
            && ! str_contains($path, '\\')
            && ! str_starts_with($path, '/')
            && ! in_array('..', explode('/', rtrim($path, '/')), true);
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['backup' => $message]);
    }
}
