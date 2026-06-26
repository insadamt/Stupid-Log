export type StatusColorData = {
    color_key?: string | null;
    color_hex?: string | null;
};

export type GameCardData = {
    id: number;
    title: string;
    publisher?: string | null;
    description?: string | null;
    cover_path?: string | null;
    cover_url?: string | null;
    platform: string;
    status: string;
    status_color_key?: string | null;
    status_color_hex?: string | null;
    playtime_hours: number;
    earned_achievements: number;
    total_achievements: number;
    first_played_at?: string | null;
    last_played_at?: string | null;
    completed_at?: string | null;
    progress: number;
    effective_progress?: EffectiveProgressData;
    local_progress?: LocalProgressData;
    linked_progress?: LinkedProgressData | null;
    ownership: string[];
    devices: string[];
    base_price_default?: string | number | null;
};

export type LinkedProgressFieldSources = {
    playtime: 'local' | 'source';
    achievements: 'local' | 'source';
    dates: 'local' | 'source';
    status: 'local' | 'source';
};

export type EffectiveProgressData = {
    status_id: number;
    status: string;
    status_color_key?: string | null;
    status_color_hex?: string | null;
    playtime_hours: number;
    earned_achievements: number;
    total_achievements: number;
    first_played_at?: string | null;
    last_played_at?: string | null;
    completed_at?: string | null;
    progress: number;
    field_sources: LinkedProgressFieldSources;
};

export type LocalProgressData = Omit<EffectiveProgressData, 'progress' | 'field_sources'>;

export type LinkedProgressSourceData = {
    id: number;
    title: string;
    platform: string;
    status: string;
    status_color_key?: string | null;
    status_color_hex?: string | null;
    playtime_hours: number;
    earned_achievements: number;
    total_achievements: number;
    first_played_at?: string | null;
    last_played_at?: string | null;
    completed_at?: string | null;
};

export type LinkedProgressData = {
    id: number;
    target_library_game_id: number;
    source_library_game_id: number;
    sync_playtime: boolean;
    sync_achievements: boolean;
    sync_dates: boolean;
    sync_status: boolean;
    source: LinkedProgressSourceData;
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
    copy_base_value: number;
    copy_purchased_value: number;
    dlc_base_value: number;
    dlc_purchased_value: number;
    subscription_allocated_value: number;
    subscription_unallocated_value: number;
    subscription_total_value: number;
    in_app_purchase_allocated_value: number;
    in_app_purchase_unallocated_value: number;
    in_app_purchase_total_value: number;
    in_app_purchase_value: number;
    base_value: number;
    purchased_value: number;
    breakdowns: StatsBreakdowns;
    archive: StatsArchive;
};

export type HomeWidgetsData = {
    lastAddedGame: GameCardData | null;
    randomGame: GameCardData | null;
    lastCompletedGame: GameCardData | null;
};

export type PlatformBreakdown = {
    platform_id: number | null;
    label: string;
    color_key?: string | null;
    color_hex?: string | null;
    library_games: number;
    completed: number;
    playtime_hours: number;
    earned_achievements: number;
    total_achievements: number;
    achievement_progress: number;
    copy_base_value?: number;
    copy_purchased_value?: number;
    dlc_base_value?: number;
    dlc_purchased_value?: number;
    subscription_allocated_value?: number;
    subscription_unallocated_value?: number;
    subscription_total_value?: number;
    in_app_purchase_allocated_value?: number;
    in_app_purchase_unallocated_value?: number;
    in_app_purchase_total_value?: number;
    in_app_purchase_value?: number;
    base_value: number;
    purchased_value: number;
    base_value_without_dlcs?: number;
    purchased_value_without_dlcs?: number;
    statuses?: StatusBreakdown[];
};

export type StatusBreakdown = {
    label: string;
    color_key?: string | null;
    color_hex?: string | null;
    library_games: number;
    playtime_hours: number;
};

export type OwnershipTypeBreakdown = {
    label: string;
    ownership_copies: number;
    copy_base_value?: number;
    copy_purchased_value?: number;
    subscription_allocated_value?: number;
    subscription_unallocated_value?: number;
    subscription_total_value?: number;
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
    status_color_key?: string | null;
    status_color_hex?: string | null;
    playtime_hours: number;
    copy_purchased_value?: number;
    dlc_purchased_value?: number;
    subscription_allocated_value?: number;
    in_app_purchase_allocated_value?: number;
    in_app_purchase_value?: number;
    base_value: number;
    purchased_value: number;
};

export type StatsArchive = {
    most_played: StatsArchiveGame[];
    playtime_rankings?: StatsArchiveGame[];
    biggest_base_price: StatsArchiveGame[];
    biggest_paid_price: StatsArchiveGame[];
    unallocated_financial: {
        subscription_unallocated_value: number;
        in_app_purchase_unallocated_value: number;
        total_unallocated_value: number;
    };
};

export type GrowthMetric = {
    delta: number;
    percentage: number | null;
    deltaDecimals?: number;
};

export type ReferenceData = {
    platforms: Array<{
        id: number;
        name: string;
        color_key?: string | null;
        color_hex?: string | null;
        devices: Array<{ id: number; name: string }>;
        ownership_types: Array<{ id: number; name: string; is_subscription?: boolean }>;
    }>;
    devices: Array<{ id: number; name: string }>;
    ownershipTypes: Array<{ id: number; name: string; is_subscription?: boolean }>;
    physicalStatuses: Array<{ id: number; name: string }>;
    statuses: Array<{ id: number; name: string; color_key?: string | null; color_hex?: string | null }>;
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
    copy_base_value: number;
    copy_purchased_value: number;
    dlc_base_value: number;
    dlc_purchased_value: number;
    subscription_allocated_value: number;
    subscription_unallocated_value: number;
    subscription_total_value: number;
    in_app_purchase_allocated_value: number;
    in_app_purchase_unallocated_value: number;
    in_app_purchase_total_value: number;
    in_app_purchase_value: number;
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
    status_color_key?: string | null;
    status_color_hex?: string | null;
    playtime_hours: number;
    earned_achievements: number;
    total_achievements: number;
};

export type SnapshotGameRow = {
    library_game_id: number;
    title: string;
    platform: string;
    status: string;
    status_color_key?: string | null;
    status_color_hex?: string | null;
    playtime_hours: number;
    earned_achievements: number;
    total_achievements: number;
};

export type SnapshotDetailsData = ConfirmedYearStats & {
    games: SnapshotGameRow[];
    games_next_cursor?: string | null;
    eligible_best_games: SnapshotBestGame[];
    eligible_best_games_next_cursor?: string | null;
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
