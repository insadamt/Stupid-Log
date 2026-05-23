# Backend / Frontend Contracts

## Provider Search

`GET /provider-search?query={query}` returns provider matches used by the Add Game Wizard before a game is saved.

The backend must enrich any result that has a `steam_app_id` with Steam metadata when Steam responds successfully. The wizard depends on these fields before final save:

```json
{
  "steam_app_id": "620",
  "base_price_default": 9.99,
  "base_price_source": "steam",
  "total_achievements": 51,
  "total_achievements_source": "steam"
}
```

If Steam metadata is unavailable, search must still return the normal provider result with nullable enrichment fields and a warning in `warnings`.

Each result includes:

- `source`: `igdb` or `steam`
- `external_id`
- `title`
- `cover_url_original`
- `publisher`
- `release_date`
- `description`
- `steam_app_id`
- `base_price_default`
- `base_price_source`
- `total_achievements`
- `total_achievements_source`

`base_price_default` is only a suggested default. Ownership copy prices remain the saved source for value stats.
