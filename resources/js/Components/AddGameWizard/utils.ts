import { DlcCatalogItem, Draft, GameSource, WizardSearchResult } from "./types";

export function localId() {
    return Math.random().toString(36).slice(2, 10);
}

export function today() {
    return new Date().toISOString().slice(0, 10);
}

export function year(value: string | null | undefined) {
    return value ? value.slice(0, 4) : "Unknown year";
}

export function toDateInput(value: string | null | undefined) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function money(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return "Unknown";
    const parsed = Number(value);
    return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : String(value);
}

export function numberOrNull(value: string) {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function integerOrNull(value: string) {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
}

export function sourceName(source: GameSource) {
    if (source === "igdb") return "IGDB";
    if (source === "steam") return "Steam";
    return "Manual";
}

export function firstByName<T extends { id: number; name: string }>(items: T[], name: string) {
    return items.find((item) => item.name === name) ?? items[0];
}

export function steamPortraitUrl(appId: string | null | undefined) {
    return appId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg` : "";
}

export function preferredResultCover(result: WizardSearchResult) {
    if (result.source === "steam" && result.steam_app_id) return steamPortraitUrl(result.steam_app_id);
    return result.cover_url_original ?? "";
}

export function fallbackResultCover(result: WizardSearchResult) {
    const preferred = preferredResultCover(result);
    return result.cover_url_original && result.cover_url_original !== preferred ? result.cover_url_original : "";
}

export function dlcCatalogFromResult(result: WizardSearchResult): DlcCatalogItem[] {
    return (result.dlcs ?? [])
        .filter((dlc) => !!dlc.steam_app_id)
        .map((dlc) => ({
            id: dlc.id ?? null,
            steam_app_id: String(dlc.steam_app_id),
            title: dlc.title,
            base_price: dlc.base_price ?? null,
        }));
}

export function importDraftResultFromDraft(draft: Draft): WizardSearchResult {
    return {
        source: draft.source === "manual" ? "steam" : draft.source,
        external_id: draft.external_id || draft.steam_app_id,
        title: draft.title.trim(),
        cover_url_original: draft.cover_url_original || null,
        publisher: draft.publisher || null,
        release_date: draft.release_date || null,
        description: draft.description || null,
        steam_app_id: draft.steam_app_id || null,
        base_price_default: numberOrNull(draft.base_price_default),
        base_price_source: draft.base_price_default.trim() === "" ? null : "steam",
        total_achievements: integerOrNull(draft.total_achievements),
        total_achievements_source: draft.total_achievements.trim() === "" ? null : "steam",
        dlcs: draft.dlcs.map((dlc) => ({
            steam_app_id: dlc.steam_app_id,
            title: dlc.title,
            base_price: dlc.base_price ?? null,
        })),
    };
}

export function uploadErrorMessage(payload: unknown) {
    if (!payload || typeof payload !== "object") return "The cover failed to upload.";
    const data = payload as { message?: string; errors?: Record<string, string[]> };
    return data.errors?.cover?.[0] ?? data.message ?? "The cover failed to upload.";
}

export function requestErrorMessage(payload: unknown, fallback: string) {
    if (!payload || typeof payload !== "object") return fallback;
    const data = payload as { message?: string; errors?: Record<string, string[]> };
    const firstError = data.errors ? Object.values(data.errors)[0]?.[0] : null;
    return firstError ?? data.message ?? fallback;
}
