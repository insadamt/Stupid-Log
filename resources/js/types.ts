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
    completed_at?: string | null;
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
    breakdowns: StatsBreakdowns;
    archive: StatsArchive;
};

export type PlatformBreakdown = {
    label: string;
    library_games: number;
    completed: number;
    playtime_hours: number;
    earned_achievements: number;
    total_achievements: number;
    achievement_progress: number;
    base_value: number;
    purchased_value: number;
    base_value_without_dlcs?: number;
    purchased_value_without_dlcs?: number;
    dlc_base_value?: number;
    dlc_purchased_value?: number;
    statuses?: StatusBreakdown[];
};

export type StatusBreakdown = {
    label: string;
    library_games: number;
    playtime_hours: number;
};

export type OwnershipTypeBreakdown = {
    label: string;
    ownership_copies: number;
    base_value: number;
    purchased_value: number;
};

export type StatsBreakdowns = {
    platforms: PlatformBreakdown[];
    statuses: StatusBreakdown[];
    ownership_types: OwnershipTypeBreakdown[];
};

export type StatsArchiveGame = {
    library_game_id: number;
    game_id: number;
    title: string;
    cover_url?: string | null;
    platform: string;
    status: string;
    playtime_hours: number;
    base_value: number;
    purchased_value: number;
};

export type StatsArchive = {
    most_played: StatsArchiveGame[];
    biggest_base_price: StatsArchiveGame[];
    biggest_paid_price: StatsArchiveGame[];
};

export type GrowthMetric = {
    delta: number;
    percentage: number | null;
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
    snapshot_id: number;
    year: number;
    status: SnapshotStatus;
    created_at: string | null;
    confirmed_at: string | null;
    unique_titles: number;
    library_games: number;
    ownership_copies: number;
    owned_dlcs: number;
    completed: number;
    hundred_percent: number;
    playtime_hours: number;
    earned_achievements: number;
    total_achievements: number;
    achievement_progress: number;
    base_value: number;
    purchased_value: number;
    breakdowns: StatsBreakdowns;
    archive: StatsArchive;
    best_games: SnapshotBestGame[];
    growth: Record<string, GrowthMetric>;
};

export type SnapshotBestGame = {
    rank?: number;
    note?: string | null;
    library_game_id: number;
    game_id: number;
    title: string;
    cover_url?: string | null;
    platform: string;
    status: string;
    playtime_hours: number;
    earned_achievements: number;
    total_achievements: number;
};

export type SnapshotGameRow = {
    library_game_id: number;
    title: string;
    platform: string;
    status: string;
    playtime_hours: number;
    earned_achievements: number;
    total_achievements: number;
};

export type SnapshotDetailsData = ConfirmedYearStats & {
    games: SnapshotGameRow[];
    eligible_best_games: SnapshotBestGame[];
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
