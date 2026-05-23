# Backend / Frontend Contracts

## Provider Search

`GET /provider-search?query={query}&provider={igdb|steam}&enrich={0|1}` returns provider matches used by the Add Game Wizard before a game is saved.

The Add Game Wizard uses **explicit provider selection**. The frontend must not force automatic fallback from IGDB to Steam. The user chooses one search source:

- `provider=igdb`: metadata-first search for title, cover, publisher, release date, description, and Steam App ID when available.
- `provider=steam`: store-first search for Steam results. The frontend should pass `enrich=1` for Steam mode so price and achievement fields are filled when possible.
- Manual entry remains available when either provider is noisy, missing credentials, or returns no useful result.

IGDB results that include a `steam_app_id` may be enriched by the frontend after selection by calling Steam with:

```txt
GET /provider-search?query={selectedTitle}&provider=steam&enrich=1&steam_app_id={steamAppId}
```

The backend must return normal provider results even when enrichment fails. In that case enrichment fields stay nullable and a warning is returned in `warnings`.

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

Example enriched fields:

```json
{
  "steam_app_id": "620",
  "base_price_default": 9.99,
  "base_price_source": "steam",
  "total_achievements": 51,
  "total_achievements_source": "steam"
}
```

`base_price_default` is only a suggested default. Ownership copy prices remain the saved source for value stats.

## Add Game Wizard UX Contract

The wizard should behave like an archive command panel, not a dense CRUD form.

Required behavior:

1. Search step has a clear provider chooser: IGDB or Steam.
2. No automatic provider fallback is allowed in the UI.
3. Manual entry is always available after the user types a title.
4. The user cannot advance without selecting a result or manual entry.
5. Metadata, Steam enrichment, platform, devices, ownership copies, DLC checkpoint, progress, and review are separate verification steps.
6. Devices must be filterable because some platforms expose many devices.
7. Ownership types should be selected as cards before detailed copy fields are edited.
8. DLC ownership inside the wizard is only safe when the backend returns persisted DLC IDs. Otherwise, Steam DLC catalog import happens during save and ownership can be edited from the game details page after save.

Design direction:

- Light/lime/black identity.
- Floating modal panel.
- Large cards and segmented choices.
- Search step uses a provider command panel plus results shelf.
- Avoid left draft panels on the search step because they waste space before a game is selected.
