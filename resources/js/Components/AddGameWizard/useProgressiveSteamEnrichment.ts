import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import {
    createImportDraft,
    fetchSteamAchievements,
    fetchSteamDlcs,
    fetchSteamMetadata,
} from "./api";
import {
    Draft,
    SteamEnrichmentChannel,
    SteamEnrichmentState,
    SteamDlcData,
    SteamOriginal,
    WizardSearchResult,
} from "./types";
import { importDraftResultFromDraft, toDateInput } from "./utils";

const idleState: SteamEnrichmentState = {
    metadata: "idle",
    achievements: "idle",
    dlcs: "idle",
};

type EditableSteamField = "publisher" | "release_date" | "description" | "base_price_default" | "total_achievements";

export function useProgressiveSteamEnrichment({
    draft,
    setDraft,
    setSteamOriginal,
    setWarnings,
    setCreatingImportDraft,
}: {
    draft: Draft;
    setDraft: Dispatch<SetStateAction<Draft>>;
    setSteamOriginal: Dispatch<SetStateAction<SteamOriginal | null>>;
    setWarnings: Dispatch<SetStateAction<string[]>>;
    setCreatingImportDraft: Dispatch<SetStateAction<boolean>>;
}) {
    const [state, setState] = useState<SteamEnrichmentState>(idleState);
    const draftRef = useRef(draft);
    const requestId = useRef(0);
    const abortController = useRef<AbortController | null>(null);
    const editedFields = useRef(new Set<EditableSteamField>());
    const selectedSteamAppId = useRef("");
    const [dlcSummary, setDlcSummary] = useState<SteamDlcData | null>(null);

    useEffect(() => {
        draftRef.current = draft;
    }, [draft]);

    function updateDraft(updater: (current: Draft) => Draft) {
        setDraft((current) => {
            const next = updater(current);
            draftRef.current = next;
            return next;
        });
    }

    function markFieldEdited(field: keyof Draft) {
        if (isEditableSteamField(field)) {
            editedFields.current.add(field);
        }
    }

    function cancel() {
        requestId.current++;
        abortController.current?.abort();
        abortController.current = null;
        setState(idleState);
        setCreatingImportDraft(false);
        selectedSteamAppId.current = "";
        setDlcSummary(null);
    }

    async function start(result: WizardSearchResult) {
        const steamAppId = result.steam_app_id;
        if (!steamAppId) return;

        cancel();
        const activeRequest = requestId.current;
        const controller = new AbortController();
        abortController.current = controller;
        selectedSteamAppId.current = steamAppId;
        editedFields.current.clear();
        setWarnings([]);
        setCreatingImportDraft(true);
        setState({ metadata: "loading", achievements: "loading", dlcs: "loading" });

        const requests = [
            loadMetadata(steamAppId, activeRequest, controller.signal),
            loadAchievements(steamAppId, activeRequest, controller.signal),
            loadDlcs(steamAppId, activeRequest, controller.signal),
        ];

        await Promise.allSettled(requests);
        if (!isActive(activeRequest)) return;

        try {
            const importDraft = await createImportDraft(importDraftResultFromDraft(draftRef.current));
            if (!isActive(activeRequest)) return;
            updateDraft((current) => ({ ...current, import_draft_id: importDraft.id }));
        } catch (error) {
            if (!isActive(activeRequest)) return;
            appendWarnings([error instanceof Error ? error.message : "Provider import draft failed."]);
        } finally {
            if (isActive(activeRequest)) {
                setCreatingImportDraft(false);
                abortController.current = null;
            }
        }
    }

    async function loadMetadata(appId: string, activeRequest: number, signal: AbortSignal) {
        try {
            const response = await fetchSteamMetadata(appId, signal);
            if (!isActive(activeRequest)) return;

            const basePrice = response.data.base_price_default === null ? "" : String(response.data.base_price_default);
            const releaseDate = toDateInput(response.data.release_date);

            setSteamOriginal((current) => ({
                steam_app_id: appId,
                publisher: response.data.publisher ?? current?.publisher ?? "",
                release_date: releaseDate || current?.release_date || "",
                description: response.data.description ?? current?.description ?? "",
                base_price_default: basePrice || current?.base_price_default || "",
                total_achievements: current?.total_achievements ?? "",
            }));
            updateDraft((current) => ({
                ...current,
                publisher: fieldValue("publisher", response.data.publisher, current.publisher),
                release_date: fieldValue("release_date", releaseDate, current.release_date),
                description: fieldValue("description", response.data.description, current.description),
                base_price_default: fieldValue("base_price_default", basePrice, current.base_price_default),
                ownership_copies: current.ownership_copies.map((copy) => ({
                    ...copy,
                    base_price: copy.base_price || basePrice,
                })),
            }));
            completeChannel("metadata", response.warnings);
        } catch (error) {
            handleChannelError("metadata", error);
        }
    }

    async function loadAchievements(appId: string, activeRequest: number, signal: AbortSignal) {
        try {
            const response = await fetchSteamAchievements(appId, signal);
            if (!isActive(activeRequest)) return;

            const total = response.data.total_achievements === null ? "" : String(response.data.total_achievements);
            setSteamOriginal((current) => ({
                steam_app_id: appId,
                publisher: current?.publisher ?? "",
                release_date: current?.release_date ?? "",
                description: current?.description ?? "",
                base_price_default: current?.base_price_default ?? "",
                total_achievements: total || current?.total_achievements || "",
            }));
            updateDraft((current) => ({
                ...current,
                total_achievements: fieldValue("total_achievements", total, current.total_achievements),
            }));
            completeChannel("achievements", response.warnings);
        } catch (error) {
            handleChannelError("achievements", error);
        }
    }

    async function loadDlcs(appId: string, activeRequest: number, signal: AbortSignal) {
        try {
            const response = await fetchSteamDlcs(appId, signal);
            if (!isActive(activeRequest)) return;

            setDlcSummary(response.data);
            if (response.data.requires_confirmation) {
                setState((current) => ({ ...current, dlcs: "choice" }));
                return;
            }

            updateDraft((current) => ({
                ...current,
                dlcs: response.data.dlcs,
                owned_dlcs: current.owned_dlcs.filter((ownedDlc) =>
                    response.data.dlcs.some((dlc) => dlc.steam_app_id === ownedDlc.steam_app_id),
                ),
            }));
            completeChannel("dlcs", response.warnings);
        } catch (error) {
            handleChannelError("dlcs", error);
        }
    }

    async function retryMetadata() {
        await retryCoreChannel("metadata");
    }

    async function retryAchievements() {
        await retryCoreChannel("achievements");
    }

    async function retryCoreChannel(channel: "metadata" | "achievements") {
        const appId = selectedSteamAppId.current;
        if (!appId) return;

        const activeRequest = requestId.current;
        const controller = new AbortController();
        abortController.current = controller;
        setCreatingImportDraft(true);
        setState((current) => ({ ...current, [channel]: "loading" }));

        if (channel === "metadata") {
            await loadMetadata(appId, activeRequest, controller.signal);
        } else {
            await loadAchievements(appId, activeRequest, controller.signal);
        }

        if (isActive(activeRequest)) {
            setCreatingImportDraft(false);
            abortController.current = null;
        }
    }

    async function loadLargeDlcCatalog() {
        const appId = selectedSteamAppId.current;
        if (!appId) return;

        const activeRequest = requestId.current;
        const controller = new AbortController();
        abortController.current = controller;
        setCreatingImportDraft(true);
        setState((current) => ({ ...current, dlcs: "loading" }));

        try {
            const response = await fetchSteamDlcs(appId, controller.signal, true);
            if (!isActive(activeRequest)) return;

            setDlcSummary(response.data);
            const nextDraft = {
                ...draftRef.current,
                import_draft_id: null,
                dlcs: response.data.dlcs,
                owned_dlcs: draftRef.current.owned_dlcs.filter((ownedDlc) =>
                    response.data.dlcs.some((dlc) => dlc.steam_app_id === ownedDlc.steam_app_id),
                ),
            };
            draftRef.current = nextDraft;
            setDraft(nextDraft);
            completeChannel("dlcs", response.warnings);

            const importDraft = await createImportDraft(importDraftResultFromDraft(nextDraft));
            if (!isActive(activeRequest)) return;
            updateDraft((current) => ({ ...current, import_draft_id: importDraft.id }));
        } catch (error) {
            handleChannelError("dlcs", error);
        } finally {
            if (isActive(activeRequest)) {
                setCreatingImportDraft(false);
                abortController.current = null;
            }
        }
    }

    function deferDlcCatalog() {
        setState((current) => ({ ...current, dlcs: "complete" }));
    }

    function fieldValue(field: EditableSteamField, incoming: string | null, current: string) {
        if (incoming === null || incoming === "") return current;
        return editedFields.current.has(field) ? current : incoming;
    }

    function completeChannel(channel: SteamEnrichmentChannel, warnings: string[]) {
        setState((current) => ({
            ...current,
            [channel]: warnings.length ? "warning" : "complete",
        }));
        appendWarnings(warnings);
    }

    function handleChannelError(channel: SteamEnrichmentChannel, error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState((current) => ({ ...current, [channel]: "warning" }));
        appendWarnings([error instanceof Error ? error.message : `Steam ${channel} enrichment failed.`]);
    }

    function appendWarnings(nextWarnings: string[]) {
        if (nextWarnings.length === 0) return;
        setWarnings((current) => [...new Set([...current, ...nextWarnings])]);
    }

    function isActive(activeRequest: number) {
        return requestId.current === activeRequest;
    }

    return {
        state,
        dlcSummary,
        markFieldEdited,
        start,
        cancel,
        retryMetadata,
        retryAchievements,
        loadLargeDlcCatalog,
        deferDlcCatalog,
    };
}

function isEditableSteamField(field: keyof Draft): field is EditableSteamField {
    return ["publisher", "release_date", "description", "base_price_default", "total_achievements"].includes(field);
}
