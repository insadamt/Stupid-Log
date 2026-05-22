# Stupid Log V1.0.0 — Seeders Only

This file contains only the seed data required for Stupid Log V1.0.0.

Use correct spelling in code and database values.

---

# 1. Physical Statuses Seeder

Table:

```txt
physical_statuses
```

Values:

```txt
Loose
Complete
New
```

---

# 2. Statuses Seeder

Table:

```txt
statuses
```

Values:

```txt
Not Played
In Progress
Dropped
Completed
100%
```

---

# 3. Platforms Seeder

Table:

```txt
platforms
```

Values:

```txt
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

Notes:

```txt
Use RetroAchievements, not Retro Achievements.
```

---

# 4. Ownership Types Seeder

Table:

```txt
ownership_types
```

Values:

```txt
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

Notes:

```txt
Use Family Sharing, not Familly Sharing.
```

---

# 5. Devices Seeder

Table:

```txt
devices
```

Values:

```txt
PC
Android
iOS / iPadOS
Original Xbox
Xbox 360
Xbox One
Xbox Series X|S
PS1
PS2
PS3
PS4
PS5
PSP
PSVita
NES / Famicom
Famicom Disk System
SNES / Super Famicom
Nintendo 64
GameCube
Nintendo 64DD
Wii
Wii U
Switch
Switch 2
Game & Watch
Virtual Boy
Game Boy
Game Boy Color
Game Boy Advance
Nintendo DS
Nintendo DSi
Nintendo 3DS
Pokemon Mini
Sega SG-1000
Sega Master System
Sega Genesis / Mega Drive
Sega CD / Mega CD
Sega 32X
Sega Saturn
Sega Dreamcast
Sega Game Gear
Sega Pico
Atari 2600
Atari 5200
Atari 7800
Atari Lynx
Atari Jaguar
Atari Jaguar CD
NEC PC-8000/8800
NEC PC Engine / TurboGrafx
NEC PC Engine CD / TurboGrafx-CD
NEC PC-FX
Neo Geo AES
Neo Geo MVS
Neo Geo CD
Neo Geo Pocket
Neo Geo Pocket Color
Magnavox Odyssey
ColecoVision
Intellivision
Vectrex
Commodore 64
ZX Spectrum
Amiga
Amstrad CPC
Apple II
Arcadia 2001
Arduboy
Elektor TV Games Computer
Fairchild Channel F
Interton VC 4000
Magnavox Odyssey 2
Mega Duck
MSX
Standalone
Uzebox
WASM-4
Watara Supervision
3DO Interactive Multiplayer
Amiga CD32
Philips CD-i
Apple Pippin
WonderSwan
WonderSwan Color
N-Gage
Gizmondo
Playdate
Evercade
Arcade
```

Notes:

```txt
Use Pokemon Mini, not corrupted encoded text.
Use Xbox Series X|S consistently.
Use NEC PC Engine / TurboGrafx consistently.
Use NEC PC Engine CD / TurboGrafx-CD consistently.
```

---

# 6. Platform Device Seeder

Table:

```txt
platform_device
```

Seeder should map platform names to allowed device names.

---

## 6.1 Steam Devices

```txt
Steam:
- PC
```

---

## 6.2 Epic Games Devices

```txt
Epic Games:
- PC
- Android
- iOS / iPadOS
```

---

## 6.3 GOG Devices

```txt
GOG:
- PC
```

---

## 6.4 PS Network Devices

```txt
PS Network:
- PS1
- PS2
- PS3
- PS4
- PS5
- PSP
- PSVita
```

---

## 6.5 Xbox Devices

```txt
Xbox:
- PC
- Android
- iOS / iPadOS
- Switch
- Switch 2
- Original Xbox
- Xbox 360
- Xbox One
- Xbox Series X|S
```

---

## 6.6 EA App Devices

```txt
EA App:
- PC
```

---

## 6.7 Ubisoft Connect Devices

```txt
Ubisoft Connect:
- PC
```

---

## 6.8 Google Play Games Devices

```txt
Google Play Games:
- PC
- Android
```

---

## 6.9 Game Center Devices

```txt
Game Center:
- PC
- iOS / iPadOS
```

---

## 6.10 RetroAchievements Devices

```txt
RetroAchievements:
- NES / Famicom
- Famicom Disk System
- SNES / Super Famicom
- Nintendo 64
- GameCube
- Wii
- Game Boy
- Game Boy Color
- Game Boy Advance
- Nintendo DS
- Nintendo DSi
- Nintendo 3DS
- Pokemon Mini
- Virtual Boy
- PS1
- PS2
- PSP
- Atari 2600
- Atari 7800
- Atari Jaguar
- Atari Jaguar CD
- Atari Lynx
- Sega SG-1000
- Sega Master System
- Sega Genesis / Mega Drive
- Sega 32X
- Sega CD / Mega CD
- Sega Saturn
- Sega Dreamcast
- Sega Game Gear
- NEC PC-8000/8800
- NEC PC Engine / TurboGrafx
- NEC PC Engine CD / TurboGrafx-CD
- NEC PC-FX
- Neo Geo CD
- Neo Geo Pocket
- 3DO Interactive Multiplayer
- Amstrad CPC
- Apple II
- Arcade
- Arcadia 2001
- Arduboy
- ColecoVision
- Elektor TV Games Computer
- Fairchild Channel F
- Intellivision
- Interton VC 4000
- Magnavox Odyssey 2
- Mega Duck
- MSX
- Standalone
- Uzebox
- Vectrex
- WASM-4
- Watara Supervision
- WonderSwan
- WonderSwan Color
```

Notes:

```txt
Removed duplicated Sega 32X.
Added Game Boy Color because it exists in the devices list and is relevant.
Added Nintendo 3DS because it exists in the devices list and is relevant.
```

---

## 6.11 Itch.io Devices

```txt
Itch.io:
- PC
- Android
```

---

## 6.12 Nintendo Devices

```txt
Nintendo:
- NES / Famicom
- Famicom Disk System
- SNES / Super Famicom
- Nintendo 64
- GameCube
- Nintendo 64DD
- Wii
- Wii U
- Switch
- Switch 2
- Game & Watch
- Virtual Boy
- Game Boy
- Game Boy Color
- Game Boy Advance
- Nintendo DS
- Nintendo DSi
- Nintendo 3DS
- Pokemon Mini
```

---

## 6.13 Own Launcher Devices

```txt
Own Launcher:
- PC
- Android
```

---

## 6.14 Other Devices

```txt
Other:
- PC
- Android
- iOS / iPadOS
- Original Xbox
- Xbox 360
- Xbox One
- Xbox Series X|S
- PS1
- PS2
- PS3
- PS4
- PS5
- PSP
- PSVita
- NES / Famicom
- Famicom Disk System
- SNES / Super Famicom
- Nintendo 64
- GameCube
- Nintendo 64DD
- Wii
- Wii U
- Switch
- Switch 2
- Game & Watch
- Virtual Boy
- Game Boy
- Game Boy Color
- Game Boy Advance
- Nintendo DS
- Nintendo DSi
- Nintendo 3DS
- Pokemon Mini
- Sega SG-1000
- Sega Master System
- Sega Genesis / Mega Drive
- Sega CD / Mega CD
- Sega 32X
- Sega Saturn
- Sega Dreamcast
- Sega Game Gear
- Sega Pico
- Atari 2600
- Atari 5200
- Atari 7800
- Atari Lynx
- Atari Jaguar
- Atari Jaguar CD
- NEC PC-8000/8800
- NEC PC Engine / TurboGrafx
- NEC PC Engine CD / TurboGrafx-CD
- NEC PC-FX
- Neo Geo AES
- Neo Geo MVS
- Neo Geo CD
- Neo Geo Pocket
- Neo Geo Pocket Color
- Magnavox Odyssey
- ColecoVision
- Intellivision
- Vectrex
- Commodore 64
- ZX Spectrum
- Amiga
- Amstrad CPC
- Apple II
- Arcadia 2001
- Arduboy
- Elektor TV Games Computer
- Fairchild Channel F
- Interton VC 4000
- Magnavox Odyssey 2
- Mega Duck
- MSX
- Standalone
- Uzebox
- WASM-4
- Watara Supervision
- 3DO Interactive Multiplayer
- Amiga CD32
- Philips CD-i
- Apple Pippin
- WonderSwan
- WonderSwan Color
- N-Gage
- Gizmondo
- Playdate
- Evercade
- Arcade
```

---

# 7. Platform Ownership Type Seeder

Table:

```txt
platform_ownership_type
```

Seeder should map platform names to allowed ownership type names.

---

## 7.1 Steam Ownership Types

```txt
Steam:
- Digital
- Family Sharing
- EA Play
```

---

## 7.2 Epic Games Ownership Types

```txt
Epic Games:
- Digital
- EA Play
```

---

## 7.3 GOG Ownership Types

```txt
GOG:
- Digital
```

---

## 7.4 PS Network Ownership Types

```txt
PS Network:
- Digital
- Physical
- PS Plus
- EA Play
- U+
- Family Sharing
- Pre-owned
- Borrowed
```

---

## 7.5 Xbox Ownership Types

```txt
Xbox:
- Digital
- Physical
- Game Pass
- EA Play
- U+
- Family Sharing
- Pre-owned
- Borrowed
```

---

## 7.6 EA App Ownership Types

```txt
EA App:
- Digital
- EA Play
```

---

## 7.7 Ubisoft Connect Ownership Types

```txt
Ubisoft Connect:
- Digital
- U+
```

---

## 7.8 Google Play Games Ownership Types

```txt
Google Play Games:
- Digital
- Play Pass
```

---

## 7.9 Game Center Ownership Types

```txt
Game Center:
- Digital
- Apple Arcade
```

---

## 7.10 RetroAchievements Ownership Types

```txt
RetroAchievements:
- Emulation
```

---

## 7.11 Itch.io Ownership Types

```txt
Itch.io:
- Digital
```

---

## 7.12 Nintendo Ownership Types

```txt
Nintendo:
- Digital
- Physical
- Nintendo Switch Online
- Family Sharing
- Borrowed
- Pre-owned
```

---

## 7.13 Own Launcher Ownership Types

```txt
Own Launcher:
- Digital
```

---

## 7.14 Other Ownership Types

```txt
Other:
- Crack
- Physical
- Emulation
- Borrowed
- Pre-owned
- Digital
```

Notes:

```txt
Added Digital to Other to allow normal uncategorized digital entries.
```

---

# 8. Providers Seeder

If a `providers` table is created, seed it with:

```txt
IGDB
IsThereAnyDeal
Steam
Manual
```

Recommended provider keys for code:

```txt
igdb
itad
steam
manual
```

---

# 9. Currency Seeder

If a `currencies` table is created, seed at least:

```txt
USD
EUR
MAD
GBP
JPY
CAD
AUD
BRL
MXN
TRY
```

Default app currency:

```txt
USD
```

---

# 10. Seeder Implementation Rules

## 10.1 Idempotency

Seeders must be idempotent.

Use update-or-create style logic.

Do not create duplicates when seeders are run multiple times.

## 10.2 Name Matching

Relationships should be created by matching names, not hardcoded IDs.

Example:

```txt
Find platform by name: Steam
Find device by name: PC
Create platform_device relation
```

## 10.3 Constraints

Recommended unique constraints:

```txt
statuses.name
physical_statuses.name
platforms.name
devices.name
ownership_types.name
platform_device(platform_id, device_id)
platform_ownership_type(platform_id, ownership_type_id)
```

## 10.4 Spelling Rules

Use these corrected spellings everywhere:

```txt
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

---

# 11. Suggested Laravel Seeder Files

Recommended seeder classes:

```txt
PhysicalStatusSeeder
StatusSeeder
PlatformSeeder
DeviceSeeder
OwnershipTypeSeeder
PlatformDeviceSeeder
PlatformOwnershipTypeSeeder
ProviderSeeder
CurrencySeeder
```

Recommended call order in `DatabaseSeeder`:

```txt
PhysicalStatusSeeder
StatusSeeder
PlatformSeeder
DeviceSeeder
OwnershipTypeSeeder
ProviderSeeder
CurrencySeeder
PlatformDeviceSeeder
PlatformOwnershipTypeSeeder
```

Relationship seeders must run after the base tables are seeded.

