export type GameCardData = {
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

export type StatsData = {
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

export type ReferenceData = {
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
