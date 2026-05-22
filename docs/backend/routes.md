# Backend Routes

Routes are defined in `routes/web.php`.

| Method | URI | Name | Controller Action | Response |
| --- | --- | --- | --- | --- |
| GET | `/setup` | `setup` | `setup` | Inertia `Setup` |
| POST | `/setup` | `setup.store` | `storeSetup` | Redirect `home` |
| GET | `/` | `home` | `home` | Inertia `Home` |
| GET | `/library` | `library` | `library` | Inertia `Library` |
| POST | `/library-games` | `library-games.store` | `storeLibraryGame` | Redirect `games.show` |
| GET | `/provider-search` | `provider-search` | `providerSearch` | JSON |
| GET | `/games/{libraryGame}` | `games.show` | `gameDetails` | Inertia `GameDetails` |
| GET | `/stats` | `stats` | `stats` | Inertia `Stats` |
| GET | `/snapshots` | `snapshots` | `snapshots` | Inertia `Snapshots` |
| POST | `/snapshots` | `snapshots.store` | `createSnapshot` | Redirect back |
| PATCH | `/snapshots/{snapshotRun}/confirm` | `snapshots.confirm` | `confirmSnapshot` | Redirect back |
| GET | `/settings` | `settings` | `settings` | Inertia `Settings` |
| PATCH | `/settings` | `settings.update` | `updateSettings` | Redirect back |

