# Frontend Contracts

TypeScript source: `resources/js/types.ts`.

## Shared Shapes

### `GameCardData`

```ts
type GameCardData = {
  id: number;
  title: string;
  publisher?: string | null;
  description?: string | null;
  cover_url?: string | null;
  platform: string;
  status: string;
  playtime_hours: number;
  earned_achievements: number;
  total_achievements: number;
  progress: number;
  ownership: string[];
  devices: string[];
  base_price_default?: string | number | null;
};
```

Nullable fields: `publisher`, `description`, `cover_url`, `base_price_default`.

### `StatsData`

```ts
type StatsData = {
  unique_titles: number;
  library_games: number;
  ownership_copies: number;
  completed: number;
  hundred_percent: number;
  playtime_hours: number;
  earned_achievements: number;
  total_achievements: number;
  achievement_progress: number;
  base_value: number;
  purchased_value: number;
};
```

### `ReferenceData`

```ts
type ReferenceData = {
  platforms: Array<{
    id: number;
    name: string;
    devices: Array<{ id: number; name: string }>;
    ownership_types: Array<{ id: number; name: string }>;
  }>;
  devices: Array<{ id: number; name: string }>;
  ownershipTypes: Array<{ id: number; name: string }>;
  physicalStatuses: Array<{ id: number; name: string }>;
  statuses: Array<{ id: number; name: string }>;
};
```

### `SnapshotRunData`

```ts
type SnapshotRunData = {
  id: number;
  user_id: number;
  year: number;
  status: 'draft' | 'confirmed';
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};
```

### `ConfirmedYearStats`

```ts
type ConfirmedYearStats = {
  year: number;
  library_games: number;
  playtime_hours: number;
  earned_achievements: number;
  snapshot_id: number;
};
```

## Inertia Pages

### `Home`

Route: `GET /`

Controller/action: `StupidLogController::home`

Props:

- `user`
- `stats: StatsData`
- `recentGames: GameCardData[]`
- `references: ReferenceData`

Used by: `resources/js/Pages/Home.tsx`, `AddGameWizard`, game card components.

Empty state: no recent games displays a start archive panel.

### `Library`

Route: `GET /library`

Controller/action: `StupidLogController::library`

Props:

- `libraryGames: GameCardData[]`
- `references: ReferenceData`

Used by: `resources/js/Pages/Library.tsx`, `GameCard`, `AddGameWizard`.

Empty state: client filter displays no matching games text.

### `GameDetails`

Route: `GET /games/{libraryGame}`

Controller/action: `StupidLogController::gameDetails`

Props:

- `libraryGame: GameCardData`
- `dlcs: Array<{ id: number; title: string; base_price: string | number | null; state: string }>`

`state` defaults to `Not Owned` when no `owned_dlcs` record exists.

Steam enrichment may populate this list after a game is created with a Steam App ID. The prop shape does not change.

### `Stats`

Route: `GET /stats`

Controller/action: `StupidLogController::stats`

Props:

- `stats: StatsData`

### `Snapshots`

Route: `GET /snapshots`

Controller/action: `StupidLogController::snapshots`

Props:

- `snapshots: SnapshotRunData[]`
- `currentYear: number`
- `confirmedCurrentYear: ConfirmedYearStats | null`

Snapshot status values: `draft`, `confirmed`.

Validation errors:

- confirming a second snapshot for an already confirmed year returns a `year` validation error.

### `Setup`

Route: `GET /setup`

Controller/action: `StupidLogController::setup`

Props:

- `currencies: string[]`

### `Settings`

Route: `GET /settings`

Controller/action: `StupidLogController::settings`

Props:

- `user` with `settings`
- `currencies: string[]`
- `providers`

Credential fields are not returned. Blank credential fields submitted through Settings preserve existing encrypted credentials.

## JSON Endpoint

### Provider Search

Route: `GET /provider-search?query=...`

Controller/action: `StupidLogController::providerSearch`

Response:

```ts
type ProviderSearchResponse = {
  query: string;
  source_order: Array<'igdb' | 'steam' | 'manual'>;
  results: Array<{
    source: 'igdb' | 'steam';
    external_id: string;
    title: string;
    cover_url_original: string | null;
    publisher: string | null;
    release_date: string | null;
    description: string | null;
    steam_app_id: string | null;
  }>;
  manual_available: boolean;
  warnings: string[];
  notice: string;
};
```

Provider search always returns this top-level shape for success, missing credentials, provider failure, and empty results. `manual_available` is always `true` in V1.

Each result always contains all documented result keys. Nullable metadata fields are returned as `null` when unavailable.

Provider credentials are never included in this response.

Provider search/import may provide a Steam App ID that the backend uses for enrichment during game creation. This fills existing frontend-visible fields such as `GameCardData.total_achievements`, `GameCardData.base_price_default`, and `GameDetails.dlcs`; no extra frontend field is required.

Validation errors use Laravel validation responses.
