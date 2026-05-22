<?php

namespace Database\Seeders;

use App\Models\StupidLog\Currency;
use App\Models\StupidLog\Device;
use App\Models\StupidLog\OwnershipType;
use App\Models\StupidLog\PhysicalStatus;
use App\Models\StupidLog\Platform;
use App\Models\StupidLog\Provider;
use App\Models\StupidLog\Status;
use Illuminate\Database\Seeder;

class StupidLogReferenceSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['Loose', 'Complete', 'New'] as $name) {
            PhysicalStatus::updateOrCreate(['name' => $name], []);
        }

        foreach (['Not Played', 'In Progress', 'Dropped', 'Completed', '100%'] as $name) {
            Status::updateOrCreate(['name' => $name], []);
        }

        foreach (['manual' => 'Manual', 'igdb' => 'IGDB', 'itad' => 'IsThereAnyDeal', 'steam' => 'Steam'] as $key => $name) {
            Provider::updateOrCreate(['key' => $key], ['name' => $name]);
        }

        foreach (['USD', 'EUR', 'MAD', 'GBP', 'JPY', 'CAD', 'AUD', 'BRL', 'MXN', 'TRY'] as $code) {
            Currency::updateOrCreate(['code' => $code], []);
        }

        foreach ($this->platforms() as $name) {
            Platform::updateOrCreate(['name' => $name], []);
        }

        foreach ($this->ownershipTypes() as $name) {
            OwnershipType::updateOrCreate(['name' => $name], []);
        }

        foreach ($this->devices() as $name) {
            Device::updateOrCreate(['name' => $name], []);
        }

        foreach ($this->platformDevices() as $platformName => $deviceNames) {
            $platform = Platform::where('name', $platformName)->firstOrFail();
            $deviceIds = Device::whereIn('name', $deviceNames)->pluck('id');
            $platform->devices()->syncWithoutDetaching($deviceIds);
        }

        foreach ($this->platformOwnershipTypes() as $platformName => $ownershipNames) {
            $platform = Platform::where('name', $platformName)->firstOrFail();
            $ownershipIds = OwnershipType::whereIn('name', $ownershipNames)->pluck('id');
            $platform->ownershipTypes()->syncWithoutDetaching($ownershipIds);
        }
    }

    private function platforms(): array
    {
        return ['Steam', 'Epic Games', 'GOG', 'PS Network', 'Xbox', 'EA App', 'Ubisoft Connect', 'Google Play Games', 'Game Center', 'RetroAchievements', 'Itch.io', 'Nintendo', 'Own Launcher', 'Other'];
    }

    private function ownershipTypes(): array
    {
        return ['Digital', 'Physical', 'Game Pass', 'EA Play', 'U+', 'Family Sharing', 'Pre-owned', 'Borrowed', 'Crack', 'Emulation', 'PS Plus', 'Play Pass', 'Apple Arcade', 'Nintendo Switch Online'];
    }

    private function devices(): array
    {
        return [
            'PC', 'Android', 'iOS / iPadOS', 'Original Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X|S',
            'PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'PSP', 'PSVita',
            'NES / Famicom', 'Famicom Disk System', 'SNES / Super Famicom', 'Nintendo 64', 'GameCube', 'Nintendo 64DD',
            'Wii', 'Wii U', 'Switch', 'Switch 2', 'Game & Watch', 'Virtual Boy', 'Game Boy', 'Game Boy Color',
            'Game Boy Advance', 'Nintendo DS', 'Nintendo DSi', 'Nintendo 3DS', 'Pokemon Mini',
            'Sega SG-1000', 'Sega Master System', 'Sega Genesis / Mega Drive', 'Sega CD / Mega CD', 'Sega 32X',
            'Sega Saturn', 'Sega Dreamcast', 'Sega Game Gear', 'Sega Pico',
            'Atari 2600', 'Atari 5200', 'Atari 7800', 'Atari Lynx', 'Atari Jaguar', 'Atari Jaguar CD',
            'NEC PC-8000/8800', 'NEC PC Engine / TurboGrafx', 'NEC PC Engine CD / TurboGrafx-CD', 'NEC PC-FX',
            'Neo Geo AES', 'Neo Geo MVS', 'Neo Geo CD', 'Neo Geo Pocket', 'Neo Geo Pocket Color',
            'Magnavox Odyssey', 'ColecoVision', 'Intellivision', 'Vectrex', 'Commodore 64', 'ZX Spectrum', 'Amiga',
            'Amstrad CPC', 'Apple II', 'Arcadia 2001', 'Arduboy', 'Elektor TV Games Computer', 'Fairchild Channel F',
            'Interton VC 4000', 'Magnavox Odyssey 2', 'Mega Duck', 'MSX', 'Standalone', 'Uzebox', 'WASM-4',
            'Watara Supervision', '3DO Interactive Multiplayer', 'Amiga CD32', 'Philips CD-i', 'Apple Pippin',
            'WonderSwan', 'WonderSwan Color', 'N-Gage', 'Gizmondo', 'Playdate', 'Evercade', 'Arcade',
        ];
    }

    private function platformDevices(): array
    {
        return [
            'Steam' => ['PC'],
            'Epic Games' => ['PC', 'Android', 'iOS / iPadOS'],
            'GOG' => ['PC'],
            'PS Network' => ['PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'PSP', 'PSVita'],
            'Xbox' => ['PC', 'Android', 'iOS / iPadOS', 'Switch', 'Switch 2', 'Original Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X|S'],
            'EA App' => ['PC'],
            'Ubisoft Connect' => ['PC'],
            'Google Play Games' => ['PC', 'Android'],
            'Game Center' => ['PC', 'iOS / iPadOS'],
            'RetroAchievements' => [
                'NES / Famicom', 'Famicom Disk System', 'SNES / Super Famicom', 'Nintendo 64', 'GameCube', 'Wii',
                'Game Boy', 'Game Boy Color', 'Game Boy Advance', 'Nintendo DS', 'Nintendo DSi', 'Nintendo 3DS',
                'Pokemon Mini', 'Virtual Boy', 'PS1', 'PS2', 'PSP', 'Atari 2600', 'Atari 7800', 'Atari Jaguar',
                'Atari Jaguar CD', 'Atari Lynx', 'Sega SG-1000', 'Sega Master System', 'Sega Genesis / Mega Drive',
                'Sega 32X', 'Sega CD / Mega CD', 'Sega Saturn', 'Sega Dreamcast', 'Sega Game Gear', 'NEC PC-8000/8800',
                'NEC PC Engine / TurboGrafx', 'NEC PC Engine CD / TurboGrafx-CD', 'NEC PC-FX', 'Neo Geo CD',
                'Neo Geo Pocket', '3DO Interactive Multiplayer', 'Amstrad CPC', 'Apple II', 'Arcade', 'Arcadia 2001',
                'Arduboy', 'ColecoVision', 'Elektor TV Games Computer', 'Fairchild Channel F', 'Intellivision',
                'Interton VC 4000', 'Magnavox Odyssey 2', 'Mega Duck', 'MSX', 'Standalone', 'Uzebox', 'Vectrex',
                'WASM-4', 'Watara Supervision', 'WonderSwan', 'WonderSwan Color',
            ],
            'Itch.io' => ['PC', 'Android'],
            'Nintendo' => ['NES / Famicom', 'Famicom Disk System', 'SNES / Super Famicom', 'Nintendo 64', 'GameCube', 'Nintendo 64DD', 'Wii', 'Wii U', 'Switch', 'Switch 2', 'Game & Watch', 'Virtual Boy', 'Game Boy', 'Game Boy Color', 'Game Boy Advance', 'Nintendo DS', 'Nintendo DSi', 'Nintendo 3DS', 'Pokemon Mini'],
            'Own Launcher' => ['PC', 'Android'],
            'Other' => $this->devices(),
        ];
    }

    private function platformOwnershipTypes(): array
    {
        return [
            'Steam' => ['Digital', 'Family Sharing', 'EA Play'],
            'Epic Games' => ['Digital', 'EA Play'],
            'GOG' => ['Digital'],
            'PS Network' => ['Digital', 'Physical', 'PS Plus', 'EA Play', 'U+', 'Family Sharing', 'Pre-owned', 'Borrowed'],
            'Xbox' => ['Digital', 'Physical', 'Game Pass', 'EA Play', 'U+', 'Family Sharing', 'Pre-owned', 'Borrowed'],
            'EA App' => ['Digital', 'EA Play'],
            'Ubisoft Connect' => ['Digital', 'U+'],
            'Google Play Games' => ['Digital', 'Play Pass'],
            'Game Center' => ['Digital', 'Apple Arcade'],
            'RetroAchievements' => ['Emulation'],
            'Itch.io' => ['Digital'],
            'Nintendo' => ['Digital', 'Physical', 'Nintendo Switch Online', 'Family Sharing', 'Borrowed', 'Pre-owned'],
            'Own Launcher' => ['Digital'],
            'Other' => ['Crack', 'Physical', 'Emulation', 'Borrowed', 'Pre-owned', 'Digital'],
        ];
    }
}
