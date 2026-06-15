# Contributing

## Scope

Keep changes focused and behaviorally explicit. Release branches must not mix product features, infrastructure, documentation, and broad refactoring.

Use intention-revealing names, keep high-level flow readable, and extract low-level details only when the concept is established. Avoid files larger than 500 lines when a clear ownership boundary exists.

## Local Setup

```bash
composer install
npm install
docker compose up -d
php artisan migrate --seed
```

The development stack is defined in `docker-compose.yml`. Production behavior is defined separately in `compose.production.yml`.

## Required Checks

Every pull request must pass:

```bash
composer test
npm run build
```

Container changes must also pass:

```bash
docker compose -f docker-compose.yml config
docker compose -f compose.production.yml config
docker compose -f compose.production.yml build
```

Add focused tests for changed behavior. Do not weaken existing assertions to make a change pass.

## Commits

Use a concise conventional commit message, for example:

```text
fix(data-portability): sync postgres sequences after restore
```

Do not include generated assets, local environment files, credentials, database files, or backup archives.

## License

By contributing, you agree that your contribution is licensed under GPL-3.0 as part of Stupid Log.
