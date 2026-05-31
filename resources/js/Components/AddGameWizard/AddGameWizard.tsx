import { router } from "@inertiajs/react";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Package,
    Plus,
    X,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "../../animation";
import { statusPillStyle } from "../../statusColors";
import { ReferenceData } from "../../types";
import { checkManualDuplicates as checkManualDuplicatesRequest, createImportDraft, providerSearch, uploadCover as uploadCoverRequest } from "./api";
import { physicalLike, steps } from "./constants";
import CoverImage from "./components/CoverImage";
import CompletionDateModal from "./modals/CompletionDateModal";
import DuplicateCandidatesModal from "./modals/DuplicateCandidatesModal";
import BasicsStep from "./steps/BasicsStep";
import DevicesStep from "./steps/DevicesStep";
import DlcsStep from "./steps/DlcsStep";
import OwnershipStep from "./steps/OwnershipStep";
import PlatformStep from "./steps/PlatformStep";
import ProgressStep from "./steps/ProgressStep";
import ReviewStep from "./steps/ReviewStep";
import SearchStep from "./steps/SearchStep";
import SteamStep from "./steps/SteamStep";
import { Draft, ManualDuplicate, OwnedDlcDraft, OwnershipCopyDraft, ProviderMode, SteamOriginal, StepKey, WizardSearchResult } from "./types";
import { dlcCatalogFromResult, firstByName, integerOrNull, localId, numberOrNull, preferredResultCover, sourceName, toDateInput, today } from "./utils";

export default function AddGameWizard({
    references,
    buttonClassName = "fixed bottom-10 right-10 rounded-[18px] bg-[#b7ff63] px-20 py-8 text-3xl font-black shadow-[0_20px_55px_rgb(0_0_0/0.22)]",
    buttonContent,
}: {
    references: ReferenceData;
    buttonClassName?: string;
    buttonContent?: ReactNode;
}) {
    const defaultPlatform = firstByName(references.platforms, "Steam");
    const defaultStatus = firstByName(references.statuses, "Not Played");

    const makeDraft = (): Draft => ({
        import_draft_id: null,
        title: "",
        source: "manual",
        external_id: "",
        steam_app_id: "",
        cover_url_original: "",
        cover_path: "",
        publisher: "",
        release_date: "",
        description: "",
        total_achievements: "",
        base_price_default: "",
        platform_id: defaultPlatform?.id ?? 0,
        device_ids: defaultPlatform?.devices[0] ? [defaultPlatform.devices[0].id] : [],
        ownership_copies: [{
            local_id: localId(),
            ownership_type_id: defaultPlatform?.ownership_types[0]?.id ?? 0,
            physical_status_id: null,
            edition_name: "",
            base_price: "",
            purchased_price: "",
            purchased_at: "",
        }],
        dlcs: [],
        owned_dlcs: [],
        status_id: defaultStatus?.id ?? 0,
        playtime_hours: "0",
        earned_achievements: "0",
        first_played_at: "",
        last_played_at: "",
        completed_at: "",
        existing_game_id: null,
        create_duplicate_anyway: false,
    });

    const [open, setOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [providerMode, setProviderMode] = useState<ProviderMode>("igdb");
    const [draft, setDraft] = useState<Draft>(makeDraft);
    const [steamOriginal, setSteamOriginal] = useState<SteamOriginal | null>(null);
    const [providerCoverUrl, setProviderCoverUrl] = useState("");
    const [localCoverPreview, setLocalCoverPreview] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<WizardSearchResult[]>([]);
    const [selectedResultKey, setSelectedResultKey] = useState("");
    const [warnings, setWarnings] = useState<string[]>([]);
    const [notice, setNotice] = useState("");
    const [searching, setSearching] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [creatingImportDraft, setCreatingImportDraft] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [coverError, setCoverError] = useState("");
    const [platformQuery, setPlatformQuery] = useState("");
    const [deviceQuery, setDeviceQuery] = useState("");
    const [dlcQuery, setDlcQuery] = useState("");
    const [saving, setSaving] = useState(false);
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
    const [duplicateCandidates, setDuplicateCandidates] = useState<ManualDuplicate[]>([]);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);
    const [completionDateDraft, setCompletionDateDraft] = useState(today());
    const searchId = useRef(0);
    const coverInputRef = useRef<HTMLInputElement | null>(null);
    const backdropRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLElement | null>(null);
    const stepShellRef = useRef<HTMLDivElement | null>(null);
    const stepContentRef = useRef<HTMLElement | null>(null);
    const stepExitClone = useRef<HTMLElement | null>(null);
    const stepDirection = useRef(1);

    const step = steps[stepIndex];
    const platform = useMemo(() => references.platforms.find((item) => item.id === draft.platform_id), [draft.platform_id, references.platforms]);
    const status = useMemo(() => references.statuses.find((item) => item.id === draft.status_id), [draft.status_id, references.statuses]);
    const ownershipById = useMemo(() => new Map(references.ownershipTypes.map((item) => [item.id, item.name])), [references.ownershipTypes]);
    const deviceById = useMemo(() => new Map(references.devices.map((item) => [item.id, item.name])), [references.devices]);
    const hasAchievements = Number(draft.total_achievements || 0) > 0;
    const availableStatuses = references.statuses.filter((item) => hasAchievements || item.name !== "100%");
    const selectedDevices = draft.device_ids.map((idValue) => deviceById.get(idValue)).filter(Boolean) as string[];
    const selectedOwnerships = draft.ownership_copies.map((copy) => ownershipById.get(copy.ownership_type_id)).filter(Boolean) as string[];
    const filteredPlatforms = references.platforms.filter((item) => item.name.toLowerCase().includes(platformQuery.trim().toLowerCase()));
    const filteredDevices = (platform?.devices ?? []).filter((item) => item.name.toLowerCase().includes(deviceQuery.trim().toLowerCase()));
    const filteredDlcs = draft.dlcs.filter((dlc) => dlc.title.toLowerCase().includes(dlcQuery.trim().toLowerCase()));
    const ownedDlcCount = draft.owned_dlcs.length;
    const coverPreview = localCoverPreview || draft.cover_url_original;
    const stepProgress = ((stepIndex + 1) / steps.length) * 100;
    const visibleStepQueue = steps.slice(stepIndex, Math.min(stepIndex + 2, steps.length));

    useGSAP(() => {
        if (!open) return;

        const backdrop = backdropRef.current;
        const panel = panelRef.current;
        if (!backdrop || !panel) return;

        if (prefersReducedMotion()) {
            gsap.set([backdrop, panel], { autoAlpha: 1, clearProps: "transform,visibility,opacity" });
            return;
        }

        const header = panel.querySelector(".sl-wizard-header");
        const sidebar = panel.querySelector(".sl-wizard-sidebar");
        const main = panel.querySelector(".sl-wizard-main");
        const footer = panel.querySelector("footer");
        const stepButtons = panel.querySelectorAll(".sl-wizard-step");
        const timeline = gsap.timeline({ defaults: { ease: "expo.out" } });

        timeline
            .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.24, clearProps: "visibility,opacity" }, 0)
            .fromTo(
                panel,
                { autoAlpha: 0, y: 34, scale: 0.94, rotationX: 4, transformPerspective: 1000 },
                { autoAlpha: 1, y: 0, scale: 1, rotationX: 0, duration: 0.58, clearProps: "transform,visibility,opacity" },
                0.04,
            )
            .fromTo(header, { y: -18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.42, clearProps: "transform,visibility,opacity" }, 0.14)
            .fromTo(sidebar, { x: -24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.44, clearProps: "transform,visibility,opacity" }, 0.18)
            .fromTo(main, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.44, clearProps: "transform,visibility,opacity" }, 0.2)
            .fromTo(footer, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.36, clearProps: "transform,visibility,opacity" }, 0.26)
            .fromTo(stepButtons, { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.28, stagger: 0.025, clearProps: "transform,visibility,opacity" }, 0.28);
    }, { scope: backdropRef, dependencies: [open] });

    useGSAP(() => {
        if (!open) return;

        const stepNode = stepContentRef.current;
        if (!stepNode) return;

        if (prefersReducedMotion()) {
            stepExitClone.current?.remove();
            stepExitClone.current = null;
            gsap.set(stepNode, { autoAlpha: 1, clearProps: "transform,visibility,opacity" });
            return;
        }

        const children = Array.from(stepNode.firstElementChild?.children ?? []);
        const direction = stepDirection.current >= 0 ? 1 : -1;
        const exitClone = stepExitClone.current;
        const timeline = gsap.timeline({
            defaults: { ease: "expo.inOut" },
            onComplete: () => {
                exitClone?.remove();
                if (stepExitClone.current === exitClone) stepExitClone.current = null;
                stepShellRef.current?.style.removeProperty("min-height");
            },
        });

        if (exitClone) {
            timeline.to(
                exitClone,
                {
                    autoAlpha: 0,
                    xPercent: -18 * direction,
                    rotationY: -9 * direction,
                    scale: 0.965,
                    filter: "blur(5px)",
                    duration: 0.54,
                },
                0,
            );
        }

        gsap.set(stepNode, {
            transformPerspective: 900,
            transformOrigin: direction > 0 ? "left center" : "right center",
        });

        timeline.fromTo(
            stepNode,
            {
                autoAlpha: exitClone ? 0.38 : 0,
                xPercent: exitClone ? 16 * direction : 0,
                y: exitClone ? 0 : 14,
                rotationY: exitClone ? 8 * direction : 0,
                scale: exitClone ? 0.975 : 0.985,
                filter: exitClone ? "blur(4px)" : "blur(0px)",
            },
            {
                autoAlpha: 1,
                xPercent: 0,
                y: 0,
                rotationY: 0,
                scale: 1,
                filter: "blur(0px)",
                duration: exitClone ? 0.54 : 0.38,
                clearProps: "transform,visibility,opacity,filter",
            },
            0,
        );

        if (children.length) {
            timeline.fromTo(
                children,
                { autoAlpha: 0, y: exitClone ? 18 : 10, scale: 0.985 },
                {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.3,
                    stagger: 0.045,
                    clearProps: "transform,visibility,opacity",
                },
                exitClone ? 0.2 : 0.08,
            );
        }
    }, { scope: stepContentRef, dependencies: [open, step.key] });

    function closeWizard() {
        const backdrop = backdropRef.current;
        const panel = panelRef.current;

        if (!backdrop || !panel || prefersReducedMotion()) {
            setOpen(false);
            return;
        }

        gsap.timeline({
            defaults: { ease: "power3.inOut" },
            onComplete: () => setOpen(false),
        })
            .to(panel, { autoAlpha: 0, y: 18, scale: 0.975, duration: 0.24 }, 0)
            .to(backdrop, { autoAlpha: 0, duration: 0.2 }, 0.04);
    }

    function setWizardStep(index: number) {
        if (index === stepIndex) return;

        const direction = index >= stepIndex ? 1 : -1;
        stepDirection.current = direction;

        const shell = stepShellRef.current;
        const currentStep = stepContentRef.current;
        if (open && shell && currentStep && !prefersReducedMotion()) {
            stepExitClone.current?.remove();

            const shellRect = shell.getBoundingClientRect();
            const stepRect = currentStep.getBoundingClientRect();
            const clone = currentStep.cloneNode(true) as HTMLElement;

            clone.style.position = "absolute";
            clone.style.left = `${stepRect.left - shellRect.left}px`;
            clone.style.top = `${stepRect.top - shellRect.top}px`;
            clone.style.width = `${stepRect.width}px`;
            clone.style.minHeight = `${stepRect.height}px`;
            clone.style.margin = "0";
            clone.style.pointerEvents = "none";
            clone.style.zIndex = "20";
            clone.style.transformPerspective = "900px";
            clone.style.transformOrigin = direction > 0 ? "right center" : "left center";
            clone.setAttribute("aria-hidden", "true");

            shell.style.minHeight = `${stepRect.height}px`;
            shell.appendChild(clone);
            stepExitClone.current = clone;
        }

        setStepIndex(index);
    }

    function update<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function resetAndOpen() {
        setDraft(makeDraft());
        setStepIndex(0);
        setProviderMode("igdb");
        setSteamOriginal(null);
        setProviderCoverUrl("");
        setLocalCoverPreview("");
        setSearchQuery("");
        setResults([]);
        setSelectedResultKey("");
        setWarnings([]);
        setNotice("");
        setCoverError("");
        setServerErrors({});
        setDlcQuery("");
        setOpen(true);
    }

    function importDraftResultFromCurrentDraft(): WizardSearchResult {
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

    async function ensureImportDraft(): Promise<number | null> {
        if (draft.source === "manual") return null;
        if (draft.import_draft_id) return draft.import_draft_id;

        const result = importDraftResultFromCurrentDraft();
        if (!result.external_id || !result.title) {
            throw new Error("Provider import is missing the selected game identity.");
        }

        setCreatingImportDraft(true);
        try {
            const importDraft = await createImportDraft(result);
            setDraft((current) => ({ ...current, import_draft_id: importDraft.id }));
            return importDraft.id;
        } finally {
            setCreatingImportDraft(false);
        }
    }

    async function runSearch(queryInput = searchQuery, provider = providerMode) {
        const query = queryInput.trim();
        if (query.length < 2) {
            setResults([]);
            setWarnings([]);
            setNotice("");
            return;
        }

        const requestId = ++searchId.current;
        setSearching(true);
        setWarnings([]);
        setNotice("");
        setServerErrors({});

        try {
            const data = await providerSearch(query, provider, provider === "steam");
            if (requestId !== searchId.current) return;
            setResults(data.results);
            setWarnings(data.warnings);
            setNotice(data.results.length ? `${provider === "igdb" ? "IGDB" : "Steam"} results loaded.` : `No ${provider === "igdb" ? "IGDB" : "Steam"} result found.`);
        } catch (error) {
            if (requestId !== searchId.current) return;
            setResults([]);
            setWarnings([error instanceof Error ? error.message : "Provider search failed."]);
            setNotice("Search failed. Try the other source or use manual entry.");
        } finally {
            if (requestId === searchId.current) setSearching(false);
        }
    }

    function resultKey(result: WizardSearchResult) {
        return `${result.source}:${result.external_id}`;
    }

    function setOriginalFromResult(result: WizardSearchResult) {
        const basePrice = result.base_price_default === null || result.base_price_default === undefined ? "" : String(result.base_price_default);
        const totalAchievements = result.total_achievements === null || result.total_achievements === undefined ? "" : String(result.total_achievements);
        if (!result.steam_app_id && !basePrice && !totalAchievements) return;

        setSteamOriginal({
            steam_app_id: result.steam_app_id ?? "",
            base_price_default: basePrice,
            total_achievements: totalAchievements,
        });
    }

    function applyResult(result: WizardSearchResult) {
        const basePrice = result.base_price_default === null || result.base_price_default === undefined ? "" : String(result.base_price_default);
        const totalAchievements = result.total_achievements === null || result.total_achievements === undefined ? "" : String(result.total_achievements);
        const cover = preferredResultCover(result);
        const dlcs = dlcCatalogFromResult(result);

        setProviderCoverUrl(cover);
        setLocalCoverPreview("");
        setOriginalFromResult(result);
        setDraft((current) => ({
            ...current,
            import_draft_id: null,
            title: result.title,
            source: result.source,
            external_id: result.external_id,
            steam_app_id: result.steam_app_id ?? "",
            cover_url_original: cover,
            cover_path: "",
            publisher: result.publisher ?? "",
            release_date: toDateInput(result.release_date),
            description: result.description ?? "",
            total_achievements: totalAchievements,
            base_price_default: basePrice,
            ownership_copies: current.ownership_copies.map((copy) => ({ ...copy, base_price: copy.base_price || basePrice })),
            dlcs,
            owned_dlcs: [],
            existing_game_id: null,
            create_duplicate_anyway: false,
        }));
    }

    function mergeSteamEnrichment(result: WizardSearchResult) {
        const basePrice = result.base_price_default === null || result.base_price_default === undefined ? "" : String(result.base_price_default);
        const totalAchievements = result.total_achievements === null || result.total_achievements === undefined ? "" : String(result.total_achievements);
        const cover = preferredResultCover(result);
        const dlcs = dlcCatalogFromResult(result);
    
        if (cover) {
            setProviderCoverUrl(cover);
        }
    
        setOriginalFromResult(result);
        setDraft((current) => ({
            ...current,
            steam_app_id: current.steam_app_id || result.steam_app_id || "",
            cover_url_original: cover || current.cover_url_original,
            publisher: result.publisher ?? current.publisher,
            release_date: toDateInput(result.release_date) || current.release_date,
            description: result.description ?? current.description,
            base_price_default: basePrice || current.base_price_default,
            total_achievements: totalAchievements || current.total_achievements,
            ownership_copies: current.ownership_copies.map((copy) => ({ ...copy, base_price: copy.base_price || basePrice })),
            dlcs: dlcs.length ? dlcs : current.dlcs,
            owned_dlcs: dlcs.length
                ? current.owned_dlcs.filter((ownedDlc) => dlcs.some((dlc) => dlc.steam_app_id === ownedDlc.steam_app_id))
                : current.owned_dlcs,
        }));
    }

    async function selectResult(result: WizardSearchResult) {
        applyResult(result);
        setSelectedResultKey(resultKey(result));
        setStepIndex(1);

        if (!result.steam_app_id) {
            setCreatingImportDraft(true);
            try {
                const importDraft = await createImportDraft(result);
                setDraft((current) => ({ ...current, import_draft_id: importDraft.id }));
            } catch {
                setWarnings((current) => [...current, "Provider import draft failed. Select the result again before saving."]);
            } finally {
                setCreatingImportDraft(false);
            }
            return;
        }

        const resultAlreadyEnriched = result.source === "steam" && (result.dlcs?.length ?? 0) > 0;

        if (resultAlreadyEnriched) {
            setCreatingImportDraft(true);
            try {
                const importDraft = await createImportDraft(result);
                setDraft((current) => ({ ...current, import_draft_id: importDraft.id }));
            } catch {
                setWarnings((current) => [...current, "Provider import draft failed. Select the result again before saving."]);
            } finally {
                setCreatingImportDraft(false);
            }
            return;
        }

        setEnriching(true);
        setCreatingImportDraft(true);
        try {
            const enriched = await providerSearch(result.title, "steam", true, result.steam_app_id);
            setWarnings(enriched.warnings);
            const enrichedResult = enriched.results[0] ?? result;
            if (enriched.results[0]) mergeSteamEnrichment(enrichedResult);
            const importDraft = await createImportDraft(enrichedResult);
            setDraft((current) => ({ ...current, import_draft_id: importDraft.id }));
        } catch {
            try {
                const importDraft = await createImportDraft(result);
                setDraft((current) => ({ ...current, import_draft_id: importDraft.id }));
                setWarnings((current) => [...current, "Steam enrichment failed. The game can be saved with the provider data already loaded."]);
            } catch {
                setWarnings((current) => [...current, "Steam enrichment or import draft creation failed. Select the result again before saving."]);
            }
        } finally {
            setEnriching(false);
            setCreatingImportDraft(false);
        }
    }

    function manualEntry() {
        const title = (draft.title || searchQuery).trim();
    
        setDraft((current) => ({
            ...current,
            import_draft_id: null,
            title,
            source: "manual",
            external_id: "",
            steam_app_id: "",
            cover_url_original: "",
            cover_path: "",
            publisher: "",
            release_date: "",
            description: "",
            total_achievements: "",
            base_price_default: "",
            ownership_copies: current.ownership_copies.map((copy) => ({ ...copy, base_price: "" })),
            dlcs: [],
            owned_dlcs: [],
            existing_game_id: null,
            create_duplicate_anyway: false,
        }));
    
        setProviderCoverUrl("");
        setLocalCoverPreview("");
        setSteamOriginal(null);
        setSelectedResultKey("manual");
        setDlcQuery("");
        setWarnings([]);
        setNotice("");
        setResults([]);
        setStepIndex(1);
    }

    async function uploadCover(file: File) {
        const previewUrl = URL.createObjectURL(file);
        setLocalCoverPreview(previewUrl);

        setUploadingCover(true);
        setCoverError("");

        try {
            const data = await uploadCoverRequest(file);
            setDraft((current) => ({
                ...current,
                cover_path: data.path,
            }));
        } catch (error) {
            setCoverError(error instanceof Error ? error.message : "The cover failed to upload.");
        } finally {
            setUploadingCover(false);
        }
    }

    function choosePlatform(platformId: number) {
        const nextPlatform = references.platforms.find((item) => item.id === platformId);
        if (!nextPlatform) return;

        setDraft((current) => ({
            ...current,
            platform_id: platformId,
            device_ids: nextPlatform.devices[0] ? [nextPlatform.devices[0].id] : [],
            ownership_copies: [{
                local_id: localId(),
                ownership_type_id: nextPlatform.ownership_types[0]?.id ?? 0,
                physical_status_id: null,
                edition_name: "",
                base_price: current.base_price_default,
                purchased_price: "",
                purchased_at: "",
            }],
        }));
        setDeviceQuery("");
    }

    function toggleDevice(deviceId: number) {
        setDraft((current) => ({
            ...current,
            device_ids: current.device_ids.includes(deviceId)
                ? current.device_ids.filter((idValue) => idValue !== deviceId)
                : [...current.device_ids, deviceId],
        }));
    }

    function addCopy(ownershipTypeId?: number) {
        const used = new Set(draft.ownership_copies.map((copy) => copy.ownership_type_id));
        const nextType = platform?.ownership_types.find((item) => ownershipTypeId ? item.id === ownershipTypeId : !used.has(item.id));
        if (!nextType || used.has(nextType.id)) return;

        setDraft((current) => ({
            ...current,
            ownership_copies: [...current.ownership_copies, {
                local_id: localId(),
                ownership_type_id: nextType.id,
                physical_status_id: null,
                edition_name: "",
                base_price: current.base_price_default,
                purchased_price: "",
                purchased_at: "",
            }],
        }));
    }

    function removeCopy(localIdValue: string) {
        setDraft((current) => ({
            ...current,
            ownership_copies: current.ownership_copies.length === 1
                ? current.ownership_copies
                : current.ownership_copies.filter((copy) => copy.local_id !== localIdValue),
        }));
    }

    function updateCopy(localIdValue: string, patch: Partial<OwnershipCopyDraft>) {
        setDraft((current) => ({
            ...current,
            ownership_copies: current.ownership_copies.map((copy) => copy.local_id === localIdValue ? { ...copy, ...patch } : copy),
        }));
    }

    function ownedDlcFor(steamAppId: string) {
        return draft.owned_dlcs.find((ownedDlc) => ownedDlc.steam_app_id === steamAppId);
    }

    function updateOwnedDlc(steamAppId: string, patch: Partial<OwnedDlcDraft>) {
        setDraft((current) => {
            const existing = current.owned_dlcs.find((ownedDlc) => ownedDlc.steam_app_id === steamAppId);
            const nextOwnedDlc: OwnedDlcDraft = {
                steam_app_id: steamAppId,
                acquisition_type: "Owned",
                purchased_price: "",
                purchased_at: "",
                ...existing,
                ...patch,
            };

            if (["Edition Included", "Free"].includes(nextOwnedDlc.acquisition_type)) {
                nextOwnedDlc.purchased_price = "0";
            }

            return {
                ...current,
                owned_dlcs: existing
                    ? current.owned_dlcs.map((ownedDlc) => ownedDlc.steam_app_id === steamAppId ? nextOwnedDlc : ownedDlc)
                    : [...current.owned_dlcs, nextOwnedDlc],
            };
        });
    }

    function removeOwnedDlc(steamAppId: string) {
        setDraft((current) => ({
            ...current,
            owned_dlcs: current.owned_dlcs.filter((ownedDlc) => ownedDlc.steam_app_id !== steamAppId),
        }));
    }

    function chooseStatus(statusId: number) {
        const nextStatus = references.statuses.find((item) => item.id === statusId);
        if (nextStatus?.name === "Completed" || nextStatus?.name === "100%") {
            setPendingStatusId(statusId);
            setCompletionDateDraft(draft.completed_at || today());
            return;
        }

        setDraft((current) => ({
            ...current,
            status_id: statusId,
            earned_achievements: nextStatus?.name === "100%" && Number(current.total_achievements) > 0 ? current.total_achievements : current.earned_achievements,
            completed_at: "",
        }));
    }

    function applyCompletedStatus() {
        if (!pendingStatusId) return;
        const nextStatus = references.statuses.find((item) => item.id === pendingStatusId);

        setDraft((current) => ({
            ...current,
            status_id: pendingStatusId,
            earned_achievements: nextStatus?.name === "100%" && Number(current.total_achievements) > 0 ? current.total_achievements : current.earned_achievements,
            completed_at: completionDateDraft || today(),
        }));
        setPendingStatusId(null);
    }

    async function checkManualDuplicates() {
        setCheckingDuplicates(true);
        try {
            const duplicates = await checkManualDuplicatesRequest(draft.title.trim(), draft.release_date);
            setDuplicateCandidates(duplicates);
            return duplicates;
        } catch {
            return [];
        } finally {
            setCheckingDuplicates(false);
        }
    }

    function errorFor(stepKey: StepKey): string | null {
        if (stepKey === "search") return selectedResultKey ? null : "Select a result or use manual entry.";
        if (stepKey === "basics") return draft.title.trim() ? null : "Title is required.";
        if (stepKey === "steam") return null;
        if (stepKey === "platform") return draft.platform_id ? null : "Select one platform.";
        if (stepKey === "devices") return draft.device_ids.length ? null : "Select at least one device.";

        if (stepKey === "ownership") {
            const ids = draft.ownership_copies.map((copy) => copy.ownership_type_id);
            if (!ids.length) return "Add at least one ownership copy.";
            if (new Set(ids).size !== ids.length) return "Duplicate ownership type is not allowed.";
            for (const copy of draft.ownership_copies) {
                const name = ownershipById.get(copy.ownership_type_id);
                if (name && physicalLike.includes(name) && !copy.physical_status_id) return `${name} requires physical status.`;
            }
            return null;
        }

        if (stepKey === "dlcs") return null;

        if (stepKey === "progress") {
            const earned = Number(draft.earned_achievements || 0);
            const total = Number(draft.total_achievements || 0);
            if (!draft.status_id) return "Select a status.";
            if (!Number.isFinite(Number(draft.playtime_hours || 0))) return "Playtime must be valid.";
            if (!Number.isFinite(earned) || earned < 0) return "Earned achievements must be zero or higher.";
            if (total > 0 && earned > total) return "Earned achievements cannot exceed total achievements.";
            if (status?.name === "100%" && (!total || earned !== total)) return "100% requires earned achievements to equal total achievements.";
            return null;
        }

        for (const item of steps) {
            if (item.key === "review") break;
            const stepError = errorFor(item.key);
            if (stepError) return stepError;
        }
        return null;
    }

    function canOpenStep(index: number) {
        if (index <= stepIndex) return true;
        for (let i = 0; i < index; i += 1) {
            if (errorFor(steps[i].key)) return false;
        }
        return true;
    }

    const currentError = errorFor(step.key);

    function next() {
        if (!currentError) setWizardStep(Math.min(stepIndex + 1, steps.length - 1));
    }

    function previous() {
        setWizardStep(Math.max(stepIndex - 1, 0));
    }

    async function submit(forceCreateDuplicate = false) {
        const reviewError = errorFor("review");
        if (reviewError) return;

        if (draft.source === "manual" && !draft.existing_game_id && !draft.create_duplicate_anyway && !forceCreateDuplicate) {
            const duplicates = await checkManualDuplicates();
            if (duplicates.length > 0) return;
        }

        const externalIds: Record<string, string> = {};
        if (draft.source === "igdb" && draft.external_id) externalIds.igdb = draft.external_id;
        if (draft.source === "steam" && draft.external_id) externalIds.steam = draft.external_id;
        if (draft.steam_app_id) externalIds.steam = draft.steam_app_id;

        let importDraftId = draft.import_draft_id;
        if (draft.source !== "manual") {
            try {
                importDraftId = await ensureImportDraft();
            } catch (error) {
                setServerErrors({
                    import_draft_id: error instanceof Error ? error.message : "Provider import could not be prepared.",
                });
                return;
            }
        }

        router.post("/library-games", {
            game: {
                title: draft.title.trim(),
                publisher: draft.publisher || null,
                release_date: draft.release_date || null,
                description: draft.description || null,
                source: draft.source,
                external_ids: externalIds,
                steam_app_id: draft.steam_app_id || null,
                cover_url_original: draft.cover_path ? null : (draft.cover_url_original || null),
                cover_path: draft.cover_path || null,
                total_achievements: integerOrNull(draft.total_achievements),
                total_achievements_source: draft.total_achievements.trim() === "" ? null : "steam",
                base_price_default: numberOrNull(draft.base_price_default),
                base_price_source: draft.base_price_default.trim() === "" ? null : "steam",
                existing_game_id: draft.existing_game_id,
                create_duplicate_anyway: draft.create_duplicate_anyway || forceCreateDuplicate,
            },
            import_draft_id: importDraftId,
            platform_id: draft.platform_id,
            device_ids: draft.device_ids,
            ownership_copies: draft.ownership_copies.map((copy) => ({
                ownership_type_id: copy.ownership_type_id,
                physical_status_id: copy.physical_status_id,
                edition_name: copy.edition_name || null,
                base_price: numberOrNull(copy.base_price),
                purchased_price: numberOrNull(copy.purchased_price),
                purchased_at: copy.purchased_at || null,
            })),
            progress: {
                status_id: draft.status_id,
                playtime_hours: Number(draft.playtime_hours || 0),
                earned_achievements: integerOrNull(draft.earned_achievements),
                first_played_at: draft.first_played_at || null,
                last_played_at: draft.last_played_at || null,
                completed_at: draft.completed_at || null,
            },
            owned_dlcs: draft.owned_dlcs.map((ownedDlc) => ({
                steam_app_id: ownedDlc.steam_app_id,
                acquisition_type: ownedDlc.acquisition_type,
                purchased_price: numberOrNull(ownedDlc.purchased_price),
                purchased_at: ownedDlc.purchased_at || null,
            })),
        }, {
            preserveScroll: true,
            onStart: () => { setSaving(true); setServerErrors({}); },
            onFinish: () => setSaving(false),
            onSuccess: () => closeWizard(),
            onError: (errors) => setServerErrors(errors),
        });
    }

    useEffect(() => {
        if (!open || step.key !== "search") return;
        setSelectedResultKey("");

        const query = searchQuery.trim();
        if (query.length < 2) {
            setResults([]);
            setWarnings([]);
            setNotice("");
            return;
        }

        const timeout = window.setTimeout(() => void runSearch(query, providerMode), 360);
        return () => window.clearTimeout(timeout);
    }, [searchQuery, providerMode, open, step.key]);

    const resetButtons = steamOriginal && (
        <div className="flex flex-wrap gap-2">
            {draft.base_price_default !== steamOriginal.base_price_default && steamOriginal.base_price_default && <button type="button" onClick={() => update("base_price_default", steamOriginal.base_price_default)} className="rounded-full bg-black/5 px-4 py-2 text-xs font-black text-black/55">Reset Price</button>}
            {draft.total_achievements !== steamOriginal.total_achievements && steamOriginal.total_achievements && <button type="button" onClick={() => update("total_achievements", steamOriginal.total_achievements)} className="rounded-full bg-black/5 px-4 py-2 text-xs font-black text-black/55">Reset Achievements</button>}
        </div>
    );

    return (
        <>
            <button type="button" onClick={resetAndOpen} className={buttonClassName}>
                {buttonContent ?? (
                    <span className="flex h-full w-full items-center justify-center gap-4">
                        <span className="grid size-11 place-items-center rounded-2xl bg-black text-[#b7ff63]"><Plus size={28} strokeWidth={4} /></span>
                        <span>Add Game</span>
                    </span>
                )}
            </button>

            {open && (
                <div ref={backdropRef} className="sl-wizard-modal fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-5 backdrop-blur-md">
                    <section ref={panelRef} className="sl-wizard-panel grid max-h-[94vh] w-full max-w-[1380px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[34px] border border-white/15 bg-[#e9eee9] shadow-[0_44px_150px_rgb(0_0_0/0.6)]">
                        <header className="sl-wizard-header relative overflow-hidden border-b border-white/10 bg-black px-6 py-5 text-white md:px-8">
                            <div className="relative z-10 flex items-start justify-between gap-6">
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="grid size-16 shrink-0 place-items-center rounded-[20px] bg-[#b7ff63] p-1.5 shadow-[0_16px_30px_rgb(0_0_0/0.28)]">
                                        <img
                                            src="/images/stupid-log/stupid-log.png"
                                            alt=""
                                            className="size-full object-contain"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black uppercase tracking-[0.35em] text-[#b7ff63]/70">Stupid Log Archive Builder</div>
                                        <h2 className="mt-1 text-[42px] font-black leading-none tracking-[-0.06em] text-white">Add Game</h2>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                    <span className="hidden rounded-full bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/60 ring-1 ring-white/10 md:inline-flex">{stepIndex + 1} / {steps.length}</span>
                                    <span className="rounded-full bg-[#b7ff63] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[0_12px_30px_rgb(183_255_99/0.16)]">{step.label}</span>
                                    <button type="button" onClick={closeWizard} className="grid size-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/10 transition hover:scale-105 hover:bg-white/16"><X size={20} /></button>
                                </div>
                            </div>
                            <div className="relative z-10 mt-5 h-2 overflow-hidden rounded-full bg-black/18">
                                <div className="h-full rounded-full bg-black transition-[width] duration-300" style={{ width: `${stepProgress}%` }} />
                            </div>
                        </header>

                        <main className="sl-wizard-main overflow-y-auto bg-[#e8eee8] p-0">
                            <div className="grid min-h-[640px] lg:grid-cols-[300px_minmax(0,1fr)]">
                                <aside className="relative overflow-hidden p-5 text-black lg:p-6">
                                    <div className="relative z-10 grid gap-5">
                                        <div className="rounded-[28px] bg-black/[0.06] p-2 ring-1 ring-black/10">
                                            <CoverImage src={coverPreview} className="h-[260px] w-full rounded-[22px]" />
                                        </div>
                                        <div className="rounded-[26px] bg-black/[0.045] p-4 ring-1 ring-black/10">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/42">Current Draft</div>
                                            <div className="sl-wizard-draft-title mt-2 font-black text-black">{draft.title || "Untitled Game"}</div>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-black px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white">{sourceName(draft.source)}</span>
                                                {draft.steam_app_id && <span className="rounded-full bg-[#b7ff63] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-black">Steam {draft.steam_app_id}</span>}
                                            </div>
                                        </div>
                                        <div className="sl-wizard-rail relative grid gap-3">
                                            {visibleStepQueue.map((item, queueIndex) => {
                                                const index = stepIndex + queueIndex;
                                                const active = queueIndex === 0;

                                                return (
                                                    <button
                                                        key={item.key}
                                                        type="button"
                                                        disabled={!canOpenStep(index)}
                                                        onClick={() => canOpenStep(index) && setWizardStep(index)}
                                                        className={`sl-wizard-step grid grid-cols-[36px_1fr] items-center gap-3 rounded-[20px] px-3.5 py-3 text-left opacity-100 transition ${active ? "is-active bg-[#b7ff63] text-black" : "bg-black/[0.055] text-black/58"} ${!canOpenStep(index) ? "cursor-not-allowed opacity-45" : "hover:bg-black/10"}`}
                                                    >
                                                        <span className={`grid size-9 place-items-center rounded-xl text-xs font-black ${active ? "bg-black text-[#b7ff63]" : "bg-black/10 text-black"}`}>{index + 1}</span>
                                                        <span className="min-w-0">
                                                            <span className={`block text-[9px] font-black uppercase tracking-[0.16em] ${active ? "text-black/45" : "text-black/35"}`}>{active ? "Current" : "Next"}</span>
                                                            <span className="mt-1 block truncate text-xs font-black uppercase tracking-[0.1em]">{item.label}</span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                            {stepIndex === steps.length - 1 && (
                                                <div className="sl-wizard-step rounded-[20px] bg-black/[0.045] px-3.5 py-3 text-black/40 ring-1 ring-black/10">
                                                    <div className="text-[9px] font-black uppercase tracking-[0.16em]">Next</div>
                                                    <div className="mt-1 text-xs font-black uppercase tracking-[0.1em]">Ready to save</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </aside>

                                <div className="min-w-0 p-5 md:p-7">
                                    <div ref={stepShellRef} className="sl-wizard-step-shell relative min-w-0 overflow-hidden">
                                    <section ref={stepContentRef} className="sl-wizard-step-content relative z-10 min-w-0">
                                {step.key === "search" && (
                                    <SearchStep providerMode={providerMode} setProviderMode={setProviderMode} searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedResultKey={selectedResultKey} update={update} runSearch={runSearch} searching={searching} warnings={warnings} results={results} manualEntry={manualEntry} resultKey={resultKey} selectResult={selectResult} />
                                )}

                                    {step.key === "basics" && (
                                        <BasicsStep enriching={enriching} coverPreview={coverPreview} coverInputRef={coverInputRef} uploadCover={uploadCover} uploadingCover={uploadingCover} providerCoverUrl={providerCoverUrl} draft={draft} localCoverPreview={localCoverPreview} setLocalCoverPreview={setLocalCoverPreview} setDraft={setDraft} coverError={coverError} update={update} />
                                    )}

                                    {step.key === "steam" && (
                                        <SteamStep draft={draft} update={update} resetButtons={resetButtons} />
                                    )}

                                    {step.key === "platform" && (
                                        <PlatformStep platformQuery={platformQuery} setPlatformQuery={setPlatformQuery} filteredPlatforms={filteredPlatforms} draft={draft} choosePlatform={choosePlatform} />
                                    )}

                                    {step.key === "devices" && (
                                        <DevicesStep selectedDevices={selectedDevices} deviceQuery={deviceQuery} setDeviceQuery={setDeviceQuery} filteredDevices={filteredDevices} toggleDevice={toggleDevice} draft={draft} />
                                    )}

                                    {step.key === "ownership" && (
                                        <OwnershipStep platform={platform} draft={draft} addCopy={addCopy} removeCopy={removeCopy} ownershipById={ownershipById} updateCopy={updateCopy} references={references} />
                                    )}

                                    {step.key === "dlcs" && (
                                        <DlcsStep enriching={enriching} draft={draft} dlcQuery={dlcQuery} setDlcQuery={setDlcQuery} ownedDlcCount={ownedDlcCount} filteredDlcs={filteredDlcs} ownedDlcFor={ownedDlcFor} removeOwnedDlc={removeOwnedDlc} updateOwnedDlc={updateOwnedDlc} />
                                    )}

                                    {step.key === "progress" && (
                                        <ProgressStep availableStatuses={availableStatuses} chooseStatus={chooseStatus} draft={draft} statusPillStyle={statusPillStyle} update={update} hasAchievements={hasAchievements} status={status} />
                                    )}

                                    {step.key === "review" && <ReviewStep draft={draft} platform={platform} selectedDevices={selectedDevices} selectedOwnerships={selectedOwnerships} ownedDlcCount={ownedDlcCount} status={status} statusPillStyle={statusPillStyle} coverPreview={coverPreview} />}

                                    {Object.keys(serverErrors).length > 0 && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm font-black text-red-700"><div className="mb-2 text-base">Backend rejected the save:</div><ul className="list-inside list-disc space-y-1">{Object.entries(serverErrors).map(([key, value]) => <li key={key}>{key}: {value}</li>)}</ul></div>}
                                </section>
                                </div>
                                </div>
                            </div>
                        </main>

                        <footer className="sl-wizard-footer flex items-center justify-between gap-5 border-t border-black/10 bg-[#f6faf4] px-7 py-5">
                            <button type="button" onClick={previous} disabled={stepIndex === 0} className="flex items-center gap-3 rounded-2xl bg-black px-7 py-3.5 text-base font-black text-white transition hover:-translate-y-0.5 disabled:bg-black/[0.06] disabled:text-black/35 disabled:opacity-100 disabled:hover:translate-y-0"><ChevronLeft size={18} /> Back</button>
                            <div className={`hidden min-w-0 flex-1 text-center text-xs font-black uppercase tracking-[0.18em] md:block ${currentError ? "rounded-full bg-red-500/10 px-4 py-2 text-red-700" : "text-black/35"}`}>{currentError ? currentError : `${stepIndex + 1} / ${steps.length}`}</div>
                            {stepIndex < steps.length - 1 ? <button type="button" onClick={next} disabled={!!currentError} className="flex items-center gap-3 rounded-2xl bg-black px-7 py-3.5 text-base font-black text-white disabled:opacity-35">Next <ChevronRight size={18} /></button> : <button type="button" onClick={() => void submit()} disabled={!!currentError || saving || checkingDuplicates || creatingImportDraft} className="flex items-center gap-3 rounded-2xl bg-[#b7ff63] px-7 py-3.5 text-base font-black text-black disabled:opacity-35">{saving || checkingDuplicates || creatingImportDraft ? <><Loader2 className="animate-spin" size={18} /> {creatingImportDraft ? "Preparing" : "Saving"}</> : <><Check size={18} /> Save Game</>}</button>}
                        </footer>
                    </section>

                    {pendingStatusId && (
                        <CompletionDateModal completionDateDraft={completionDateDraft} setCompletionDateDraft={setCompletionDateDraft} setPendingStatusId={setPendingStatusId} applyCompletedStatus={applyCompletedStatus} />
                    )}

                    {duplicateCandidates.length > 0 && (
                        <DuplicateCandidatesModal duplicateCandidates={duplicateCandidates} setDraft={setDraft} setDuplicateCandidates={setDuplicateCandidates} submit={submit} />
                    )}
                </div>
            )}
        </>
    );
}
