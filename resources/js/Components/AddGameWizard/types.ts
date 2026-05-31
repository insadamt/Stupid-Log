import { ProviderSearchResponse, ProviderSearchResult } from "../../types";

export type GameSource = "manual" | "igdb" | "steam";
export type ProviderMode = "igdb" | "steam";
export type StepKey = "search" | "basics" | "steam" | "platform" | "devices" | "ownership" | "dlcs" | "progress" | "review";

export type WizardSearchResult = ProviderSearchResult & {
    dlcs?: Array<{
        id?: number | null;
        steam_app_id?: string | null;
        title: string;
        base_price?: number | string | null;
    }>;
};

export type WizardSearchResponse = Omit<ProviderSearchResponse, "results"> & {
    results: WizardSearchResult[];
};

export type SteamOriginal = {
    steam_app_id: string;
    base_price_default: string;
    total_achievements: string;
};

export type OwnershipCopyDraft = {
    local_id: string;
    ownership_type_id: number;
    physical_status_id: number | null;
    edition_name: string;
    base_price: string;
    purchased_price: string;
    purchased_at: string;
};

export type DlcCatalogItem = {
    id?: number | null;
    steam_app_id: string;
    title: string;
    base_price?: number | string | null;
};

export type OwnedDlcDraft = {
    steam_app_id: string;
    acquisition_type: "Owned" | "Edition Included" | "Free";
    purchased_price: string;
    purchased_at: string;
};

export type Draft = {
    import_draft_id: number | null;
    title: string;
    source: GameSource;
    external_id: string;
    steam_app_id: string;
    cover_url_original: string;
    cover_path: string;
    publisher: string;
    release_date: string;
    description: string;
    total_achievements: string;
    base_price_default: string;
    platform_id: number;
    device_ids: number[];
    ownership_copies: OwnershipCopyDraft[];
    dlcs: DlcCatalogItem[];
    owned_dlcs: OwnedDlcDraft[];
    status_id: number;
    playtime_hours: string;
    earned_achievements: string;
    first_played_at: string;
    last_played_at: string;
    completed_at: string;
    existing_game_id: number | null;
    create_duplicate_anyway: boolean;
};

export type ManualDuplicate = {
    id: number;
    title: string;
    release_year?: string | null;
    publisher?: string | null;
    cover_url?: string | null;
};
