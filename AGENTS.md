# Repository Agent Instructions

- Never publish a stable release directly when the release affects installation, deployment, database migrations, backups/restores, persistent data, upgrades, security, or networking. Always create a pre-release or RC first, test it fully, then promote to stable only after verification passes.
- Treat backup export/import backward compatibility as release-critical. When backup schemas, table registries, migrations, restore ordering, media handling, checksums, or manifest validation change, preserve imports from every previously released export format or intentionally bump/reject the backup format with a clear migration path and tests.
- Add or update tests for backup export/import compatibility whenever data-portability behavior changes. Cover archives shaped like all previous stable releases that can export backups, and verify preview, restore, counts, relationships, media, and post-restore record creation where relevant.
- Give commit message suggestions when finishing work.
- Use intention-revealing names.
- Keep high-level flow readable.
- Extract low-level details into named functions or services.
- Do not hide side effects behind query-like names.
- Use DTOs when arguments become unclear.
- Do not add comments unless they explain why.
- Do not abstract duplication until the concept is proven.
- Do not create big files with more than 500 lines. Split large files into focused files or services.
