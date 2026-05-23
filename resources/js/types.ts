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

export type SnapshotStatus = 'draft' | 'confirmed';

export type SnapshotRunData = {
    id: number;
    user_id: number;
    year: number;
    status: SnapshotStatus;
    confirmed_at: string | null;
    created_at: string;
    updated_at: string;
};

export type ConfirmedYearStats = {
    year: number;
    library_games: number;
    playtime_hours: number;
    earned_achievements: number;
    snapshot_id: number;
};

export type ProviderSearchResult = {
    source: 'igdb' | 'steam';
    external_id: string;
    title: string;
    cover_url_original: string | null;
    publisher: string | null;
    release_date: string | null;
    description: string | null;
    steam_app_id: string | null;
    base_price_default: number | string | null;
    base_price_source: 'steam' | null;
    total_achievements: number | null;
    total_achievements_source: 'steam' | null;
};

export type ProviderSearchResponse = {
    query: string;
    source_order: Array<'igdb' | 'steam' | 'manual'>;
    results: ProviderSearchResult[];
    manual_available: boolean;
    warnings: string[];
    notice: string;
};
