# Stupid Log V1.0.0 — Codex GPT-5.5 Agent Build Specification

## 0. Purpose

This document is the development specification for rebuilding **Stupid Log V1.0.0** correctly from zero.

Codex must treat this document as the source of truth for the first implementation pass.

The goal is to build a stable V1 foundation with the correct product logic, database schema, provider workflow, wizard flow, and visual direction. Visual polish can improve later, but the architecture must be correct now.

---

## 1. Product Identity

### App Name

**Stupid Log**

### Product Type

A personal gaming archive and collection manager.

### Core Definition

Stupid Log is a personal gaming archive where the user tracks games across platforms, devices, ownership types, DLCs, progress, achievements, prices, and yearly library growth.

### Core Philosophy

Stupid Log must not feel like a generic CRUD admin panel.

It should feel like a clean, playful, game-like archive hub where the user inspects and manages their personal gaming collection.

The UI should be visual, card-based, light, and distinctive.

---

## 2. Locked V1 Product Rules

### Rule 1 — Game + Platform = Library Game

The central tracked object is a **Library Game**.

A Library Game means:

> one game title on one platform in the user's library.

Example:

```text
Elden Ring — Steam
Elden Ring — PlayStation
```

These are two different Library Games.

### Rule 2 — Same Game on Same Platform Is Not Duplicated

If the user owns the same game on the same platform in multiple ways, do not create multiple Library Games.

Instead, use multiple **Ownership Copies** under the same Library Game.

Example:

```text
Elden Ring — PlayStation
  - Physical
  - Digital
  - PS Plus
```

### Rule 3 — Ownership Copies Store Value Data

A Library Game owns gameplay/progress data.

Ownership Copies own price/value/acquisition data.

### Rule 4 — Devices Are Multiple

A Library Game has one platform but can have multiple devices.

Example:

```text
Forza Horizon 6 — Xbox
Devices:
- PC
- Xbox Series X|S
- Cloud
```

### Rule 5 — DLCs Belong to the Library Game

DLCs are attached to the Library Game, not to a specific Ownership Copy.

### Rule 6 — Yearly Stats Come from Snapshots Only

Official yearly stats must come only from confirmed yearly snapshots.

Live data must not be used as official yearly history.

### Rule 7 — Manual User Data Is Source of Truth

Providers assist with metadata, DLCs, achievements, and base prices.

The user's saved data is always the final truth.

---

## 3. Recommended Tech Stack

Use this stack unless the existing repository is already locked to something else:

```text
Laravel
Inertia.js
React
TypeScript
Tailwind CSS
PostgreSQL
Docker Compose
```

### Rules

- Do not switch to Next.js unless explicitly instructed.
- Do not build Electron/Tauri in V1.
- Do not overbuild authentication.
- Build as a self-hosted/local web app first.

---

## 4. User Model

V1 is a **single-user app**.

However, keep a `users` table and use `user_id` where appropriate to avoid painful future migration.

### V1 Behavior

- No public registration.
- No multi-user UI.
- One local profile.
- App opens directly after setup.
- Login can be skipped in V1 unless already present in the project.

### `users`

```text
id
username
avatar_path nullable
created_at
updated_at
```

### `app_settings`

```text
id
user_id
currency_code default USD
created_at
updated_at
```

---

## 5. Provider Philosophy

The user explicitly chooses the provider during game search.

Provider logic is source-specific:

```text
IGDB = primary metadata source
Steam = enrichment source
Manual = fallback and user truth
```

### Provider Responsibilities

| Provider | Used For |
|---|---|
| IGDB | title, cover, publisher, release date, description, Steam App ID if available |
| Steam | achievements total, base price/default price, DLC catalog |
| Manual | fallback and user overrides |

### Important

Search provider is user-selectable in V1.

The app must not automatically fall back from IGDB search to Steam search. Steam may be used only when the user selects Steam as the search provider, or as enrichment when a selected IGDB result includes a Steam App ID.

---

## 6. Provider Credentials

The user provides provider credentials in setup/settings.

### IGDB

Requires:

```text
client_id
client_secret
```

### Steam

Requires:

```text
api_key
```

### `providers`

Seed:

```text
manual
igdb
steam
```

Columns:

```text
id
key unique
name
created_at
updated_at
```

### `provider_credentials`

```text
id
user_id
provider_id
encrypted_client_id nullable
encrypted_client_secret nullable
encrypted_api_key nullable
is_enabled boolean default false
last_tested_at nullable
last_test_status nullable
created_at
updated_at
```

Use Laravel encryption for sensitive values.

---

## 7. Provider Search and Import Workflow

### Add Game Search Flow

```text
User clicks Add Game
→ floating wizard opens
→ user chooses IGDB or Steam as search provider
→ user searches game title
→ app searches only the selected provider
→ if IGDB result exists, user selects result
→ app creates/reuses game by IGDB ID
→ app extracts Steam App ID from IGDB result if available
→ app enriches with Steam achievements, base price, and DLCs if Steam App ID exists
→ user continues manually through platform/device/ownership/progress steps
```

### Steam Search Flow

If the user selects Steam search:

```text
search Steam
→ if Steam result exists, user selects result
→ create/reuse game by Steam App ID
→ fill metadata from Steam
→ import Steam achievements/base price/DLCs
```

If the selected provider fails:

```text
show manual entry flow
```

### Manual Entry Rule

Manual games are allowed.

Before creating a manual game, run possible duplicate detection using normalized title and release year.

If possible duplicate exists, show user:

```text
Possible existing game found.
- Use existing
- Create new anyway
```

Do not auto-merge manual duplicates.

---

## 8. Duplicate Detection Rules

### Global Game Duplicate Rules

Priority:

```text
1. Same IGDB external ID = same game
2. Same Steam App ID = same game
3. Same normalized title + release year = possible duplicate, ask user
```

Never rely only on raw title.

### `external_game_ids`

```text
id
game_id
provider_id
external_id
url nullable
created_at
updated_at
```

Unique:

```text
provider_id + external_id
```

### Conflict Rule

If a Steam App ID is already linked to another game, do not auto-merge.

For V1:

```text
skip enrichment and show internal warning / UI notice
```

---

## 9. Core Database Schema

## 9.1 `games`

Global game metadata.

```text
id
title
normalized_title
cover_url_original nullable
cover_path nullable
publisher nullable
release_date nullable
description nullable
source_provider_id nullable
base_price_default nullable
base_price_source nullable
total_achievements nullable
total_achievements_source nullable
provider_synced_at nullable
created_at
updated_at
```

### Notes

- Do not include developer.
- Cover must be downloaded locally when possible.
- Keep original cover URL for debugging/reference.
- `base_price_default` is only a default suggestion. Stats should use Ownership Copy prices.
- `total_achievements` can come from Steam.
- UI must warn that achievements/base price may come from Steam and should be double-checked.

---

## 9.2 `platforms`

Seeded table.

```text
id
name unique
created_at
updated_at
```

Seed values:

```text
Steam
Epic Games
GOG
PS Network
Xbox
EA App
Ubisoft Connect
Google Play Games
Game Center
RetroAchievements
Itch.io
Nintendo
Own Launcher
Other
```

Use **RetroAchievements**, not **Retro Achievements**.

---

## 9.3 `devices`

Seeded table.

```text
id
name unique
created_at
updated_at
```

Use the device list from the current seeders document.

Important spelling:

```text
Xbox Series X|S
Pokemon Mini
NEC PC Engine / TurboGrafx
NEC PC Engine CD / TurboGrafx-CD
```

---

## 9.4 `platform_device`

Allowed devices per platform.

```text
id
platform_id
device_id
created_at
updated_at
```

Unique:

```text
platform_id + device_id
```

Rules:

- Used to filter valid devices after platform selection.
- Devices selected for a Library Game must exist in this mapping.

---

## 9.5 `statuses`

Seeded table.

```text
id
name unique
created_at
updated_at
```

Seed values:

```text
Not Played
In Progress
Dropped
Completed
100%
```

### Status Rules

- `100%` is only available when `games.total_achievements > 0`.
- If the game has no achievements, hide `100%` from status selection.
- `100%` means all achievements are earned.
- If selected, require `earned_achievements == games.total_achievements`.

---

## 9.6 `library_games`

Main user library table.

Represents:

> one game on one platform.

```text
id
user_id
game_id
platform_id
status_id
playtime_hours decimal default 0
earned_achievements integer nullable
first_played_at nullable
last_played_at nullable
completed_at nullable
created_at
updated_at
```

Unique:

```text
user_id + game_id + platform_id
```

### Notes

- Do not store `device_id` here.
- Devices are many-to-many.
- Do not store ownership type here.
- Do not store price data here.
- `earned_achievements` is personal progress and belongs here.
- `games.total_achievements` is the total achievement count.

---

## 9.7 `library_game_device`

Devices selected for a Library Game.

```text
id
library_game_id
device_id
created_at
updated_at
```

Unique:

```text
library_game_id + device_id
```

Validation:

```text
selected device must be allowed for the Library Game platform through platform_device
```

---

## 9.8 `ownership_types`

Seeded table.

```text
id
name unique
created_at
updated_at
```

Seed values:

```text
Digital
Physical
Game Pass
EA Play
U+
Family Sharing
Pre-owned
Borrowed
Crack
Emulation
PS Plus
Play Pass
Apple Arcade
Nintendo Switch Online
```

Use **Family Sharing**, not **Familly Sharing**.

---

## 9.9 `platform_ownership_type`

Allowed ownership types per platform.

```text
id
platform_id
ownership_type_id
created_at
updated_at
```

Unique:

```text
platform_id + ownership_type_id
```

Rules:

- Used to filter valid ownership choices after platform selection.
- Ownership types are not split into access/media/source categories in V1.
- Keep this simple.

---

## 9.10 `physical_statuses`

Seeded table.

```text
id
name unique
created_at
updated_at
```

Seed values:

```text
Loose
Complete
New
```

---

## 9.11 `ownership_copies`

Represents one ownership/access copy under a Library Game.

```text
id
library_game_id
ownership_type_id
physical_status_id nullable
edition_name nullable
base_price nullable
purchased_price nullable
purchased_at nullable
created_at
updated_at
```

Unique:

```text
library_game_id + ownership_type_id
```

### Rules

- A Library Game can have multiple ownership copies.
- The same ownership type can exist only once per Library Game.
- `base_price` is the base price of the actual copy/edition owned.
- `purchased_price` is what the user paid.
- `edition_name` is nullable.
- If the user owns a special edition, set `edition_name` and override base/purchased prices.
- Stats use `ownership_copies.base_price` and `ownership_copies.purchased_price`, not `games.base_price_default`.

### Physical Status Rule

`physical_status_id` is relevant when ownership type is physical-like.

V1 physical-like ownerships:

```text
Physical
Pre-owned
Borrowed
```

If physical-like, ask for physical status.

---

## 9.12 `dlcs`

Local DLC catalog imported from Steam when Steam App ID is available.

```text
id
game_id
steam_app_id nullable
title
cover_url_original nullable
cover_path nullable
base_price nullable
source_provider_id nullable
synced_at nullable
created_at
updated_at
```

Unique:

```text
steam_app_id
```

### Rules

- DLC catalog is imported automatically with the game when possible.
- DLC catalog is stored locally.
- DLCs are not automatically owned.
- DLCs belong to `games` globally.

---

## 9.13 `owned_dlcs`

User ownership state for DLCs under a Library Game.

```text
id
library_game_id
dlc_id
acquisition_type
purchased_price nullable
purchased_at nullable
created_at
updated_at
```

Unique:

```text
library_game_id + dlc_id
```

Allowed `acquisition_type`:

```text
Owned
Edition Included
Free
```

### Rules

- `Owned` means purchased separately.
- `Edition Included` means included inside a special edition.
- `Free` means acquired for free.
- `Edition Included` sets purchased_price to `0`.
- `Free` sets purchased_price to `0`.
- `Edition Included` DLC base price is stored but excluded from base value stats.
- Owned DLCs belong to Library Games, not Ownership Copies.

---

## 9.14 `snapshot_runs`

Manual yearly snapshot container.

```text
id
user_id
year
status
created_at
confirmed_at nullable
updated_at
```

Allowed status:

```text
draft
confirmed
```

Rules:

- A year can have many draft snapshots.
- A year should have only one confirmed snapshot.
- Confirmed snapshots power official yearly stats.
- Draft snapshots are previews only.

---

## 9.15 `library_game_snapshots`

Frozen per-game yearly snapshot.

```text
id
snapshot_run_id
library_game_id
game_id
platform_id
status_id
playtime_hours
earned_achievements nullable
total_achievements nullable
first_played_at nullable
last_played_at nullable
completed_at nullable
created_at
updated_at
```

---

## 9.16 `ownership_copy_snapshots`

Frozen ownership/value snapshot.

```text
id
snapshot_run_id
ownership_copy_id
library_game_id
ownership_type_id
edition_name nullable
base_price nullable
purchased_price nullable
purchased_at nullable
created_at
updated_at
```

---

## 9.17 `owned_dlc_snapshots`

Frozen DLC ownership/value snapshot.

```text
id
snapshot_run_id
owned_dlc_id
library_game_id
dlc_id
acquisition_type
base_price nullable
purchased_price nullable
purchased_at nullable
created_at
updated_at
```

---

## 10. Completion Logic

### When User Selects Completed

```text
if completed_at is null:
    open dialog
    autofill today
    user can confirm or edit date
else:
    do not show dialog
```

### When User Selects 100%

```text
if games.total_achievements is null or 0:
    100% status is hidden

if earned_achievements != games.total_achievements:
    block selection or show validation error

if completed_at is null:
    open dialog
    autofill today
    user can confirm or edit date
else:
    skip dialog
```

### Achievement Suggestion

If:

```text
earned_achievements == games.total_achievements
```

then suggest:

```text
You earned all achievements. Mark this game as 100%?
```

---

## 11. Add Game Wizard

The Add Game flow must be a floating centered wizard panel, not a full boring page.

Do not allow moving to the next step until the current step is valid.

### Step 1 — Search Game

- User types game name.
- User chooses IGDB or Steam.
- App searches only the selected provider.
- If results exist, show results.
- If no result is found, show manual entry option and let the user manually switch providers if desired.

### Step 2 — Metadata Preview

Show imported metadata:

```text
title
cover
publisher
release date
description
metadata source
```

Download cover locally when saving.

Warn if data is Steam/manual.

### Step 3 — Steam Enrichment

If Steam App ID exists:

- import total achievements
- import default base price
- import DLC catalog

Show warning:

```text
Achievements and base price are imported from Steam. Double-check them before saving, especially for non-Steam platforms.
```

### Step 4 — Platform

User selects one platform.

Platform is required.

### Step 5 — Devices

Show only devices allowed by selected platform.

User can select multiple devices.

At least one device should be selected unless platform/device logic explicitly allows none.

### Step 6 — Ownership Copies

Show ownership types allowed by selected platform.

User can select multiple ownership types.

For each selected ownership type, create a copy form:

```text
ownership_type
edition_name nullable
base_price
purchased_price
purchased_at
physical_status if relevant
```

### Edition Flow

For each ownership copy:

```text
Does this copy have a special edition?
```

If yes:

```text
edition_name required
base_price override
purchased_price override
```

Example:

```text
Digital — Gold Edition
Base Price: 80
Purchased Price: 8
```

### Step 7 — DLCs

DLC step always appears if the game has imported DLCs.

It does not depend on whether an edition exists.

For each DLC, user can mark:

```text
Not Owned
Owned
Edition Included
Free
```

If no ownership copy has an edition, `Edition Included` can be hidden or disabled.

If user marks DLC as `Owned`:

```text
open modal
ask purchased_price
ask purchased_at nullable
```

If user marks DLC as `Edition Included`:

```text
purchased_price = 0
base price stored but excluded from value stats
```

If user marks DLC as `Free`:

```text
purchased_price = 0
```

### Step 8 — Progress

Fields:

```text
status
playtime_hours
earned_achievements
first_played_at
last_played_at
completed_at
```

Rules:

- Hide `100%` if no achievements.
- Require earned achievements <= total achievements.
- Apply completed date dialog rules.

### Step 9 — Review

Show final summary:

```text
game metadata
platform
devices
ownership copies
DLC states
progress data
warnings
```

### Step 10 — Save

Create or reuse:

```text
games
external_game_ids
library_games
library_game_device
ownership_copies
owned_dlcs
```

---

## 12. UI / Design System

### Visual Identity

Use:

```text
white / light background
lime green primary
black secondary
soft gray support
rounded corners
large visual cards
matte clean feeling
```

### Design Keywords

```text
light theme
game archive
playful modern
minimal but distinctive
floating panels
inspection interface
rounded cards
console/game hub feeling
```

### Do Not Build

- Generic admin dashboard.
- Plain Bootstrap tables.
- Dense forms as full pages.
- Default browser-looking dropdown-heavy UI.

### Component Style

Use:

- cards
- rounded pills
- segmented controls
- floating panels
- side inspection panels
- hover expansion cards
- progress bars
- status badges
- icon-based controls

---

## 13. Navigation and Pages

### Required Pages

```text
Home
Library
Game Details
Stats
Snapshots / Yearly Archive
Settings
Setup Wizard
```

### Home Page

Purpose:

> personal gaming hub.

Must include:

```text
recent games carousel
brief stats panel
add game button
left navigation
light/lime/black visual style
```

### Library Page

Purpose:

> visual game shelf / archive browsing.

Must include:

```text
grid layout
search
sort button
filter button
right-side control panel or special non-dropdown control system
hover side expansion card
click card → details page
```

### Library Card

Default card shows:

```text
cover
platform logo
status badge
rotating mini stat area
achievement progress OR playtime
```

Rotating mini-stat:

- achievement progress
- playtime
- every ~2 seconds
- do not animate all cards in perfect sync
- pause on hover

### Hover Behavior

Hovering a card shows a side expansion panel with:

```text
title
publisher
achievements
playtime
ownership summary
details action
```

Do not duplicate the status if already shown on the main card.

### Click Behavior

Clicking a card opens the full Game Details page.

---

## 14. Game Details Page

The Game Details page is an inspection interface.

It should not feel like editing a database row.

### Layout

Use:

```text
top lime header
centered game cover card
left connected metadata lines
right archive/inspection panel
bottom segmented navigation
```

### Main Sections

```text
Overview
DLCs
```

V1 only needs these two modes.

### Overview Mode

Main visible elements:

```text
game cover card
publisher connector
achievements connector
playtime connector
description panel
vertical next panel preview: Prices
button: Next: Prices →
bottom segmented nav: Overview active, DLCs inactive
```

### Prices Sequential Panel

Inside Overview, the right inspection panel should support sequential sections.

Initial panel:

```text
Description
```

Next panel:

```text
Prices
```

Button text must be explicit:

```text
Next: Prices →
```

Do not use ambiguous `Next` alone.

### DLCs Mode

When the user clicks DLCs:

- The game card remains as anchor.
- Bottom segmented nav shows DLCs active.
- Right/main panel switches to DLC management.

DLC panel includes:

```text
search
filters: All, Owned, Edition Included, Not Owned
compact DLC rows
status badges
action button based on state
```

DLC states:

```text
Owned
Edition Included
Free
Not Owned
```

Actions:

```text
Not Owned → Mark Owned
Owned → Edit / Remove
Edition Included → Change / Remove
Free → Change / Remove
```

For V1, simple buttons are enough.

---

## 15. Stats System

Stats must not be boring simple number cards only.

Stats should be modules that combine:

```text
main number
breakdown
progress
small insight
visual chart/card
```

### Required Stat Concepts

#### 1. Unique Titles Count

```text
count distinct games.id in user's library
```

#### 2. Library Games Count

```text
count library_games
```

This is the main collection count.

#### 3. Ownership Copies Count

```text
count ownership_copies
```

#### 4. Completed Count

```text
library_games where status = Completed or 100%
```

#### 5. 100% Count

```text
library_games where status = 100%
```

#### 6. Playtime

```text
sum(library_games.playtime_hours)
```

#### 7. Earned Achievements

```text
sum(library_games.earned_achievements)
```

#### 8. Total Achievements

```text
sum(games.total_achievements for library_games where total exists)
```

#### 9. Achievement Progress

```text
earned / total
```

#### 10. Base Value

```text
sum(ownership_copies.base_price)
+ sum(owned DLC base price where acquisition_type is not Edition Included)
```

#### 11. Purchased Value

```text
sum(ownership_copies.purchased_price)
+ sum(owned_dlcs.purchased_price)
```

Edition included and free DLCs have purchased price 0.

### Breakdowns

Where relevant, show breakdowns by:

```text
platform
status
ownership type
```

---

## 16. Yearly Snapshots and Archive

### Philosophy

Snapshots are historical archive states.

A confirmed snapshot means:

> what the user's gaming library looked like at the end of that year.

### Rules

- Snapshots are manual.
- App may remind user near year-end/start.
- App never confirms snapshots automatically.
- Official yearly stats use confirmed snapshots only.
- Draft snapshots are previews.

### Snapshot Flow

```text
User opens Snapshots / Yearly Archive
→ chooses year
→ Create Pre-Snapshot
→ app copies current library state into snapshot tables
→ user reviews draft stats
→ user can edit live library if needed
→ user can resnap
→ user confirms snapshot
```

### Yearly Archive UI

Each year should feel like a page/season recap.

Use arrow navigation:

```text
← 2025    2026    2027 →
```

Each year shows accumulated data and growth:

```text
600 games
+6
+1%
```

Growth formula:

```text
delta = current_year_value - previous_confirmed_year_value
percentage = delta / previous_confirmed_year_value * 100
```

If previous value is zero or missing:

```text
show delta only or growth unavailable
```

---

## 17. Settings Page

Settings must include:

```text
username
avatar optional
currency
IGDB credentials
Steam API key
provider test buttons
```

Credentials must be encrypted.

---

## 18. Setup Wizard

First-use setup flow:

```text
1. Create local profile username
2. Choose currency
3. Add IGDB client ID/client secret
4. Add Steam API key optional but recommended
5. Test credentials
6. Finish
```

If provider credentials are missing, manual entry must still be possible.

---

## 19. Seeders

Create idempotent seeders.

Use update-or-create style logic.

Seeder call order:

```text
ProviderSeeder
StatusSeeder
PhysicalStatusSeeder
PlatformSeeder
DeviceSeeder
OwnershipTypeSeeder
CurrencySeeder
PlatformDeviceSeeder
PlatformOwnershipTypeSeeder
```

Relationships should be created by matching names, not hardcoded IDs.

Recommended unique constraints:

```text
providers.key
statuses.name
physical_statuses.name
platforms.name
devices.name
ownership_types.name
platform_device(platform_id, device_id)
platform_ownership_type(platform_id, ownership_type_id)
```

Spelling rules:

```text
Platform, not Platfrom
Automatically, not Automaticlly
Family Sharing, not Familly Sharing
Dropped, not Droped
Purchase, not Purshase
Manually, not Mnually
Choose, not Chose
RetroAchievements, not RetroAchievemnts
Pokemon Mini, not corrupted encoding
```

Use the current seeders document as source for full platform/device/ownership mapping.

---

## 20. Validation Rules

### Library Game

Require:

```text
user_id
game_id
platform_id
status_id
```

Validate:

```text
unique user_id + game_id + platform_id
```

### Devices

Require at least one selected device unless explicitly allowed.

Validate each selected device is allowed for the chosen platform.

### Ownership Copies

Require at least one ownership copy for a new Library Game.

Validate:

```text
ownership type is allowed for selected platform
unique library_game_id + ownership_type_id
physical status if physical-like
base/purchased prices numeric nullable
```

### DLCs

Validate:

```text
unique library_game_id + dlc_id
acquisition_type in Owned / Edition Included / Free
Edition Included purchased_price = 0
Free purchased_price = 0
```

### Achievements

Validate:

```text
earned_achievements <= games.total_achievements
```

If total achievements is null:

```text
hide or disable achievement progress / 100% status
```

---

## 21. Implementation Order

Build in this order:

```text
1. Project setup / stack verification
2. Database migrations
3. Seeders
4. Single-user profile/settings setup
5. Provider credentials storage
6. IGDB search service
7. Steam enrichment service
8. Game duplicate detection
9. Cover download/local storage
10. DLC import/local catalog
11. Add Game Wizard backend flow
12. Add Game Wizard UI
13. Library page
14. Game Details overview page
15. DLC management section
16. Stats service
17. Snapshot system
18. Yearly Archive page
19. Home page
20. UI polish
21. Tests and validation
```

Do not build stats before the schema and add-game flow are stable.

---

## 22. Testing Requirements

At minimum test:

```text
IGDB duplicate reuse by external ID
Steam duplicate reuse by external ID
manual possible duplicate warning
same game on different platform allowed
same game on same platform blocked
multiple ownership copies allowed
same ownership type duplicated blocked
multiple devices allowed
invalid platform-device rejected
invalid platform-ownership rejected
100% hidden when no achievements
100% blocked when earned != total
completed date dialog logic
DLC edition included price logic
snapshot confirmed yearly stats only
```

---

## 23. Non-Goals for V1

Do not build:

```text
multi-user registration
public profiles
automatic full Steam library import
automatic Xbox/PlayStation/Nintendo imports
subscription cost distribution system
scheduled price refresh
current/lowest price tracking
desktop app wrapper
mobile app
advanced per-field sync groups
wishlist system
full achievement list tracking
session-based playtime logs
```

### Future Subscription Feature

Later versions may support subscription payments.

Example:

```text
Game Pass June payment = $6
Divide across games with Game Pass ownership copies
Update estimated purchased price per copy
```

Do not implement this in V1.

---

## 24. Final Codex Instruction

Build Stupid Log V1.0.0 according to this specification.

Prioritize:

```text
correct data model
correct provider flow
correct duplicate logic
correct wizard validation
correct snapshot foundation
```

Do not prioritize advanced animations before the app works.

The UI must follow the light/lime/black game-archive identity, but visual perfection can come after the product logic is stable.

Do not simplify the architecture back into one `user_games` table with device/ownership/price fields.

The key architecture is:

```text
games
→ library_games
→ ownership_copies
→ owned_dlcs
```

This architecture is non-negotiable for V1.
