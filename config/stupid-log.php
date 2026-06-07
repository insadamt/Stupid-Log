<?php

return [
    'version' => env('STUPID_LOG_VERSION', '1.0.0'),

    'backup' => [
        'format' => 'stupid-log-backup',
        'format_version' => 1,
        'max_upload_kilobytes' => 524288,
        'max_zip_entries' => 10000,
        'max_uncompressed_bytes' => 1073741824,
        'preview_ttl_minutes' => 30,
    ],
];
