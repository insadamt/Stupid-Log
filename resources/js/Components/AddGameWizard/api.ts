import {
    ManualDuplicate,
    ProviderMode,
    SteamAchievementData,
    SteamDlcData,
    SteamEnrichmentResponse,
    SteamMetadataData,
    WizardSearchResponse,
    WizardSearchResult,
} from "./types";
import { requestErrorMessage, uploadErrorMessage } from "./utils";

function csrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "";
}

export async function providerSearch(query: string, provider: ProviderMode, enrich = false, steamAppId?: string): Promise<WizardSearchResponse> {
    const params = new URLSearchParams({ query, provider, enrich: enrich ? "1" : "0" });
    if (steamAppId) params.set("steam_app_id", steamAppId);

    const response = await fetch(`/provider-search?${params.toString()}`);
    if (!response.ok) throw new Error(provider === "igdb" ? "IGDB search failed." : "Steam search failed.");
    return await response.json() as WizardSearchResponse;
}

async function steamEnrichmentRequest<Data>(appId: string, channel: string, signal: AbortSignal): Promise<SteamEnrichmentResponse<Data>> {
    const response = await fetch(`/steam-enrichment/${encodeURIComponent(appId)}/${channel}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(requestErrorMessage(data, `Steam ${channel} enrichment failed.`));
    return data as SteamEnrichmentResponse<Data>;
}

export function fetchSteamMetadata(appId: string, signal: AbortSignal) {
    return steamEnrichmentRequest<SteamMetadataData>(appId, "metadata", signal);
}

export function fetchSteamAchievements(appId: string, signal: AbortSignal) {
    return steamEnrichmentRequest<SteamAchievementData>(appId, "achievements", signal);
}

export function fetchSteamDlcs(appId: string, signal: AbortSignal, load = false) {
    const channel = load ? "dlcs?load=1" : "dlcs";
    return steamEnrichmentRequest<SteamDlcData>(appId, channel, signal);
}

export async function createImportDraft(result: WizardSearchResult) {
    const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    };
    const token = csrfToken();
    if (token) headers["X-CSRF-TOKEN"] = token;

    const response = await fetch("/provider-import-drafts", {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ result }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(requestErrorMessage(data, "Provider import draft failed."));

    return data as { id: number; cover_path?: string | null };
}

export async function uploadCover(file: File) {
    const body = new FormData();
    body.append("cover", file);

    const headers: Record<string, string> = {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
    };
    const token = csrfToken();
    if (token) headers["X-CSRF-TOKEN"] = token;

    const response = await fetch("/library-games/cover", {
        method: "POST",
        headers,
        body,
        credentials: "same-origin",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(uploadErrorMessage(data));

    return data as { path: string };
}

export async function checkManualDuplicates(title: string, releaseDate: string) {
    const params = new URLSearchParams({ title });
    if (releaseDate) params.set("release_date", releaseDate);

    const response = await fetch(`/library-games/manual-duplicates?${params.toString()}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
    });
    if (!response.ok) throw new Error("Duplicate check failed.");
    const data = await response.json() as { duplicates: ManualDuplicate[] };
    return data.duplicates;
}
