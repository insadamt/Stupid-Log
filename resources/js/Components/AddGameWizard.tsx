import { router } from "@inertiajs/react";
import {
    AlertTriangle,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Database,
    Gamepad2,
    Layers3,
    Loader2,
    Package,
    Plus,
    Search,
    ShieldCheck,
    Sparkles,
    X,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
    ProviderSearchResponse,
    ProviderSearchResult,
    ReferenceData,
} from "../types";

type GameSource = "manual" | "igdb" | "steam";
type ProviderMode = "igdb" | "steam";
type StepKey = "search" | "basics" | "enrich" | "platform" | "devices" | "ownership" | "dlcs" | "progress" | "review";
type DlcState = "Not Owned" | "Owned" | "Edition Included" | "Free";

type DlcPreview = {
    id?: number | null;
    steam_app_id?: string | null;
    title: string;
    cover_url_original?: string | null;
    base_price?: number | string | null;
};

type WizardSearchResult = ProviderSearchResult & {
    dlcs?: DlcPreview[];
};

type WizardSearchResponse = Omit<ProviderSearchResponse, "results"> & {
    results: WizardSearchResult[];
};

type OwnershipCopyDraft = {
    local_id: string;
    ownership_type_id: number;
    physical_status_id: number | null;
    edition_name: string;
    base_price: string;
    purchased_price: string;
    purchased_at: string;
};

type DlcDraft = DlcPreview & {
    state: DlcState;
    purchased_price: string;
    purchased_at: string;
};

type Draft = {
    title: string;
    source: GameSource;
    external_id: string;
    steam_app_id: string;
    cover_url_original: string;
    publisher: string;
    release_date: string;
    description: string;
    total_achievements: string;
    base_price_default: string;
    platform_id: number;
    device_ids: number[];
    ownership_copies: OwnershipCopyDraft[];
    dlcs: DlcDraft[];
    status_id: number;
    playtime_hours: string;
    earned_achievements: string;
    first_played_at: string;
    last_played_at: string;
    completed_at: string;
};

const physicalLike = ["Physical", "Pre-owned", "Borrowed"];
const steps: Array<{ key: StepKey; label: string; hint: string }> = [
    { key: "search", label: "Search", hint: "IGDB → Steam → Manual" },
    { key: "basics", label: "Basics", hint: "Clean imported metadata" },
    { key: "enrich", label: "Steam", hint: "Price, achievements, DLCs" },
    { key: "platform", label: "Platform", hint: "One ecosystem" },
    { key: "devices", label: "Devices", hint: "Multiple allowed" },
    { key: "ownership", label: "Ownership", hint: "Copies and prices" },
    { key: "dlcs", label: "DLCs", hint: "Extras checkpoint" },
    { key: "progress", label: "Progress", hint: "Status and achievements" },
    { key: "review", label: "Review", hint: "Verify before save" },
];

function localId() {
    return Math.random().toString(36).slice(2, 10);
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function toDateInput(value: string | null | undefined) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function num(value: string) {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function intNum(value: string) {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
}

function money(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return "Unknown";
    const parsed = Number(value);
    return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : String(value);
}

function sourceName(source: GameSource) {
    if (source === "igdb") return "IGDB";
    if (source === "steam") return "Steam";
    return "Manual";
}

function firstByName<T extends { id: number; name: string }>(items: T[], name: string) {
    return items.find((item) => item.name === name) ?? items[0];
}

function Pill({ children, active = false, muted = false }: { children: ReactNode; active?: boolean; muted?: boolean }) {
    return (
        <span className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${active ? "bg-[#b7ff63] text-black" : muted ? "bg-black/5 text-black/45" : "bg-black text-white"}`}>
            {children}
        </span>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-black/40">{label}</span>
            {children}
        </label>
    );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`h-[58px] rounded-[20px] border border-black/10 bg-[#f4f5ef] px-4 text-base font-bold text-black outline-none transition placeholder:text-black/30 focus:border-black ${props.className ?? ""}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={`min-h-[132px] rounded-[22px] border border-black/10 bg-[#f4f5ef] px-4 py-4 text-base font-bold text-black outline-none transition placeholder:text-black/30 focus:border-black ${props.className ?? ""}`} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className={`h-[58px] rounded-[20px] border border-black/10 bg-[#f4f5ef] px-4 text-base font-bold text-black outline-none transition focus:border-black ${props.className ?? ""}`} />;
}

function Metric({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
    return (
        <div className="rounded-[26px] border border-black/10 bg-white p-5 shadow-[0_16px_42px_rgb(0_0_0/0.055)]">
            <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-black/35">{label}</div>
                {icon && <div className="text-black/30">{icon}</div>}
            </div>
            <div className="mt-2 text-3xl font-black tracking-[-0.05em] text-black">{value}</div>
        </div>
    );
}

function Notice({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warning" | "danger" }) {
    return (
        <div className={`rounded-[24px] border px-5 py-4 text-sm font-black leading-relaxed ${tone === "danger" ? "border-red-500/20 bg-red-500/10 text-red-700" : tone === "warning" ? "border-black/10 bg-[#fff3c4] text-black" : "border-black/10 bg-white text-black/55"}`}>
            {children}
        </div>
    );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="grid min-h-[230px] place-items-center rounded-[32px] border border-dashed border-black/15 bg-white/70 p-8 text-center">
            <div>
                <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-black text-[#b7ff63]"><Package /></div>
                <div className="mt-5 text-3xl font-black tracking-[-0.05em]">{title}</div>
                <p className="mx-auto mt-2 max-w-xl text-base font-bold text-black/45">{body}</p>
            </div>
        </div>
    );
}

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
        title: "",
        source: "manual",
        external_id: "",
        steam_app_id: "",
        cover_url_original: "",
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
        status_id: defaultStatus?.id ?? 0,
        playtime_hours: "0",
        earned_achievements: "0",
        first_played_at: "",
        last_played_at: "",
        completed_at: "",
    });

    const [open, setOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [draft, setDraft] = useState<Draft>(makeDraft);
    const [results, setResults] = useState<WizardSearchResult[]>([]);
    const [selectedResultKey, setSelectedResultKey] = useState("");
    const [warnings, setWarnings] = useState<string[]>([]);
    const [notice, setNotice] = useState("");
    const [searching, setSearching] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [deviceQuery, setDeviceQuery] = useState("");
    const [saving, setSaving] = useState(false);
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
    const searchId = useRef(0);

    const step = steps[stepIndex];
    const platform = useMemo(() => references.platforms.find((item) => item.id === draft.platform_id), [draft.platform_id, references.platforms]);
    const status = useMemo(() => references.statuses.find((item) => item.id === draft.status_id), [draft.status_id, references.statuses]);
    const ownershipById = useMemo(() => new Map(references.ownershipTypes.map((item) => [item.id, item.name])), [references.ownershipTypes]);
    const deviceById = useMemo(() => new Map(references.devices.map((item) => [item.id, item.name])), [references.devices]);
    const hasAchievements = Number(draft.total_achievements || 0) > 0;
    const availableStatuses = references.statuses.filter((item) => hasAchievements || item.name !== "100%");
    const selectedDevices = draft.device_ids.map((id) => deviceById.get(id)).filter(Boolean) as string[];
    const selectedOwnerships = draft.ownership_copies.map((copy) => ownershipById.get(copy.ownership_type_id)).filter(Boolean) as string[];
    const hasEditionCopy = draft.ownership_copies.some((copy) => copy.edition_name.trim().length > 0);
    const visibleDevices = (platform?.devices ?? []).filter((device) => device.name.toLowerCase().includes(deviceQuery.trim().toLowerCase()));

    function update<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function resetAndOpen() {
        setDraft(makeDraft());
        setStepIndex(0);
        setResults([]);
        setSelectedResultKey("");
        setWarnings([]);
        setNotice("");
        setServerErrors({});
        setOpen(true);
    }

    async function providerSearch(query: string, provider: ProviderMode, enrich = false, steamAppId?: string): Promise<WizardSearchResponse> {
        const params = new URLSearchParams({ query, provider, enrich: enrich ? "1" : "0" });
        if (steamAppId) params.set("steam_app_id", steamAppId);

        const response = await fetch(`/provider-search?${params.toString()}`);
        if (!response.ok) throw new Error(provider === "igdb" ? "IGDB search failed." : "Steam search failed.");
        return await response.json() as WizardSearchResponse;
    }

    async function runSearch(queryInput = draft.title) {
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
            const igdb = await providerSearch(query, "igdb", false);
            if (requestId !== searchId.current) return;

            if (igdb.results.length > 0) {
                setResults(igdb.results);
                setWarnings(igdb.warnings);
                setNotice("IGDB results loaded. Select a result to inspect it.");
                return;
            }

            const steam = await providerSearch(query, "steam", true);
            if (requestId !== searchId.current) return;

            setResults(steam.results);
            setWarnings([...igdb.warnings, ...steam.warnings, "No IGDB result found. Steam fallback was used."]);
            setNotice(steam.results.length ? "Steam fallback results loaded." : "No provider result found. Use manual entry.");
        } catch (error) {
            if (requestId !== searchId.current) return;
            setResults([]);
            setWarnings([error instanceof Error ? error.message : "Provider search failed."]);
            setNotice("Provider search failed. Manual entry is still available.");
        } finally {
            if (requestId === searchId.current) setSearching(false);
        }
    }

    function resultKey(result: WizardSearchResult) {
        return `${result.source}:${result.external_id}`;
    }

    function dlcsFrom(result: WizardSearchResult): DlcDraft[] {
        return (result.dlcs ?? []).map((dlc) => ({ ...dlc, state: "Not Owned", purchased_price: "", purchased_at: "" }));
    }

    function applyResult(result: WizardSearchResult) {
        const basePrice = result.base_price_default === null || result.base_price_default === undefined ? "" : String(result.base_price_default);
        const totalAchievements = result.total_achievements === null || result.total_achievements === undefined ? "" : String(result.total_achievements);

        setDraft((current) => ({
            ...current,
            title: result.title,
            source: result.source,
            external_id: result.external_id,
            steam_app_id: result.steam_app_id ?? "",
            cover_url_original: result.cover_url_original ?? "",
            publisher: result.publisher ?? "",
            release_date: toDateInput(result.release_date),
            description: result.description ?? "",
            total_achievements: totalAchievements,
            base_price_default: basePrice,
            dlcs: dlcsFrom(result),
            ownership_copies: current.ownership_copies.map((copy) => ({ ...copy, base_price: copy.base_price || basePrice })),
        }));
    }

    function mergeEnrichment(result: WizardSearchResult) {
        const basePrice = result.base_price_default === null || result.base_price_default === undefined ? "" : String(result.base_price_default);
        const totalAchievements = result.total_achievements === null || result.total_achievements === undefined ? "" : String(result.total_achievements);

        setDraft((current) => ({
            ...current,
            steam_app_id: current.steam_app_id || result.steam_app_id || "",
            cover_url_original: current.cover_url_original || result.cover_url_original || "",
            publisher: current.publisher || result.publisher || "",
            release_date: current.release_date || toDateInput(result.release_date),
            description: current.description || result.description || "",
            total_achievements: totalAchievements || current.total_achievements,
            base_price_default: basePrice || current.base_price_default,
            dlcs: result.dlcs?.length ? dlcsFrom(result) : current.dlcs,
            ownership_copies: current.ownership_copies.map((copy) => ({ ...copy, base_price: copy.base_price || basePrice })),
        }));
    }

    async function selectResult(result: WizardSearchResult) {
        applyResult(result);
        setSelectedResultKey(resultKey(result));
        setStepIndex(1);

        if (!result.steam_app_id) return;

        setEnriching(true);
        try {
            const enriched = await providerSearch(result.title, "steam", true, result.steam_app_id);
            setWarnings(enriched.warnings);
            if (enriched.results[0]) mergeEnrichment(enriched.results[0]);
        } catch {
            setWarnings((current) => [...current, "Steam enrichment failed. Continue manually."]);
        } finally {
            setEnriching(false);
        }
    }

    function manualEntry() {
        const title = draft.title.trim();
        if (title.length < 2) return;

        setDraft((current) => ({
            ...current,
            title,
            source: "manual",
            external_id: "",
            steam_app_id: "",
            cover_url_original: "",
            publisher: "",
            release_date: "",
            description: "",
            total_achievements: "",
            base_price_default: "",
            dlcs: [],
            ownership_copies: current.ownership_copies.map((copy) => ({ ...copy, base_price: "" })),
        }));
        setSelectedResultKey("manual");
        setStepIndex(1);
    }

    async function enrichCurrent() {
        if (!draft.steam_app_id.trim()) {
            setWarnings(["Add a Steam App ID first."]);
            return;
        }

        setEnriching(true);
        try {
            const enriched = await providerSearch(draft.title || `Steam App ${draft.steam_app_id}`, "steam", true, draft.steam_app_id.trim());
            setWarnings(enriched.warnings);
            if (enriched.results[0]) mergeEnrichment(enriched.results[0]);
        } catch {
            setWarnings(["Steam enrichment failed. Continue manually."]);
        } finally {
            setEnriching(false);
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
                ? current.device_ids.filter((id) => id !== deviceId)
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

    function updateDlc(index: number, patch: Partial<DlcDraft>) {
        setDraft((current) => ({
            ...current,
            dlcs: current.dlcs.map((dlc, dlcIndex) => dlcIndex === index ? { ...dlc, ...patch } : dlc),
        }));
    }

    function chooseStatus(statusId: number) {
        const nextStatus = references.statuses.find((item) => item.id === statusId);
        setDraft((current) => ({
            ...current,
            status_id: statusId,
            earned_achievements: nextStatus?.name === "100%" && Number(current.total_achievements) > 0 ? current.total_achievements : current.earned_achievements,
            completed_at: nextStatus?.name === "Completed" || nextStatus?.name === "100%" ? current.completed_at || today() : current.completed_at,
        }));
    }

    function errorFor(stepKey: StepKey): string | null {
        if (stepKey === "search") return selectedResultKey ? null : "Select a result or use manual entry.";
        if (stepKey === "basics") return draft.title.trim() ? null : "Title is required.";
        if (stepKey === "enrich") return null;
        if (stepKey === "platform") return draft.platform_id ? null : "Select one platform.";
        if (stepKey === "devices") return draft.device_ids.length ? null : "Select at least one device.";

        if (stepKey === "ownership") {
            if (!draft.ownership_copies.length) return "Add at least one ownership copy.";
            const ids = draft.ownership_copies.map((copy) => copy.ownership_type_id);
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
        if (!currentError) setStepIndex((current) => Math.min(current + 1, steps.length - 1));
    }

    function previous() {
        setStepIndex((current) => Math.max(current - 1, 0));
    }

    function submit() {
        const reviewError = errorFor("review");
        if (reviewError) return;

        const externalIds: Record<string, string> = {};
        if (draft.source === "igdb" && draft.external_id) externalIds.igdb = draft.external_id;
        if (draft.source === "steam" && draft.external_id) externalIds.steam = draft.external_id;
        if (draft.steam_app_id) externalIds.steam = draft.steam_app_id;

        const ownedDlcs = draft.dlcs
            .filter((dlc) => dlc.state !== "Not Owned")
            .filter((dlc) => typeof dlc.id === "number")
            .map((dlc) => ({
                dlc_id: dlc.id,
                acquisition_type: dlc.state,
                purchased_price: dlc.state === "Edition Included" || dlc.state === "Free" ? 0 : num(dlc.purchased_price),
                purchased_at: dlc.purchased_at || null,
            }));

        router.post("/library-games", {
            game: {
                title: draft.title.trim(),
                publisher: draft.publisher || null,
                release_date: draft.release_date || null,
                description: draft.description || null,
                source: draft.source,
                external_ids: externalIds,
                steam_app_id: draft.steam_app_id || null,
                cover_url_original: draft.cover_url_original || null,
                total_achievements: intNum(draft.total_achievements),
                total_achievements_source: draft.total_achievements.trim() === "" ? null : "steam",
                base_price_default: num(draft.base_price_default),
                base_price_source: draft.base_price_default.trim() === "" ? null : "steam",
                create_duplicate_anyway: draft.source === "manual",
            },
            platform_id: draft.platform_id,
            device_ids: draft.device_ids,
            ownership_copies: draft.ownership_copies.map((copy) => ({
                ownership_type_id: copy.ownership_type_id,
                physical_status_id: copy.physical_status_id,
                edition_name: copy.edition_name || null,
                base_price: num(copy.base_price),
                purchased_price: num(copy.purchased_price),
                purchased_at: copy.purchased_at || null,
            })),
            progress: {
                status_id: draft.status_id,
                playtime_hours: Number(draft.playtime_hours || 0),
                earned_achievements: intNum(draft.earned_achievements),
                first_played_at: draft.first_played_at || null,
                last_played_at: draft.last_played_at || null,
                completed_at: draft.completed_at || null,
            },
            owned_dlcs: ownedDlcs,
        }, {
            preserveScroll: true,
            onStart: () => { setSaving(true); setServerErrors({}); },
            onFinish: () => setSaving(false),
            onSuccess: () => setOpen(false),
            onError: (errors) => setServerErrors(errors),
        });
    }

    useEffect(() => {
        if (!open || step.key !== "search") return;
        setSelectedResultKey("");

        const query = draft.title.trim();
        if (query.length < 2) {
            setResults([]);
            setWarnings([]);
            setNotice("");
            return;
        }

        const timeout = window.setTimeout(() => void runSearch(query), 360);
        return () => window.clearTimeout(timeout);
    }, [draft.title, open, step.key]);

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
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-5 backdrop-blur-md">
                    <section className="grid max-h-[94vh] w-full max-w-[1320px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[36px] border border-white/20 bg-[#eff1ea] shadow-[0_44px_150px_rgb(0_0_0/0.55)]">
                        <header className="border-b border-black/10 bg-[#b7ff63] px-7 py-6">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <div className="text-sm font-black uppercase tracking-[0.35em] text-black/45">Stupid Log Archive Builder</div>
                                    <h2 className="mt-1 text-5xl font-black leading-none tracking-[-0.06em] text-black">Add Game</h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Pill>{step.label}</Pill>
                                    <button type="button" onClick={() => setOpen(false)} className="grid size-12 place-items-center rounded-full bg-black text-white transition hover:scale-105"><X /></button>
                                </div>
                            </div>
                            <div className="mt-6 grid grid-cols-9 gap-2">
                                {steps.map((item, index) => (
                                    <button key={item.key} type="button" disabled={!canOpenStep(index)} onClick={() => canOpenStep(index) && setStepIndex(index)} className={`h-2 rounded-full transition ${index <= stepIndex ? "bg-black" : "bg-white/70"} ${!canOpenStep(index) ? "cursor-not-allowed opacity-50" : ""}`} aria-label={item.label} />
                                ))}
                            </div>
                        </header>

                        <main className="overflow-y-auto p-7">
                            <div className={step.key === "search" ? "grid gap-7" : "grid gap-7 lg:grid-cols-[300px_1fr]"}>
                                {step.key !== "search" && (
                                    <aside className="space-y-5">
                                        <div className="rounded-[34px] bg-black p-3 shadow-[0_24px_70px_rgb(0_0_0/0.25)]">
                                            {draft.cover_url_original ? <img src={draft.cover_url_original} alt="" className="h-[420px] w-full rounded-[26px] object-cover" /> : (
                                                <div className="grid h-[420px] place-items-center rounded-[26px] bg-[#171a17] text-center">
                                                    <div>
                                                        <div className="mx-auto grid size-20 place-items-center rounded-[24px] bg-[#b7ff63] text-4xl font-black text-black">SL</div>
                                                        <div className="mt-5 text-xs font-black uppercase tracking-[0.26em] text-white/35">No Cover</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="rounded-[28px] border border-black/10 bg-white p-5">
                                            <div className="text-xs font-black uppercase tracking-[0.22em] text-black/35">Current Draft</div>
                                            <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">{draft.title || "Untitled Game"}</h3>
                                            <div className="mt-4 flex flex-wrap gap-2"><Pill>{sourceName(draft.source)}</Pill>{draft.steam_app_id && <Pill active>Steam {draft.steam_app_id}</Pill>}</div>
                                        </div>
                                    </aside>
                                )}

                                <section className="min-w-0">
                                    {step.key === "search" && (
                                        <div className="grid gap-5">
                                            <div className="rounded-[36px] bg-black p-7 text-white">
                                                <div className="flex flex-wrap items-end justify-between gap-5">
                                                    <div>
                                                        <div className="text-sm font-black uppercase tracking-[0.3em] text-[#b7ff63]">Search</div>
                                                        <h3 className="mt-2 text-6xl font-black tracking-[-0.07em]">Find the game first.</h3>
                                                        <p className="mt-3 max-w-3xl text-lg font-bold text-white/55">No provider tabs. The flow tries IGDB first, then Steam fallback. Manual entry stays available.</p>
                                                    </div>
                                                    <div className="rounded-full bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-white/60">IGDB → Steam → Manual</div>
                                                </div>

                                                <label className="mt-8 flex h-[76px] items-center gap-4 rounded-[26px] bg-white px-5 text-black">
                                                    <Search className="size-7 shrink-0 text-black/35" />
                                                    <input value={draft.title} onChange={(event) => update("title", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void runSearch(); } }} placeholder="Type a game name..." className="min-w-0 flex-1 bg-transparent text-3xl font-black tracking-[-0.04em] outline-none placeholder:text-black/25" autoFocus />
                                                    <button type="button" onClick={() => void runSearch()} disabled={searching || draft.title.trim().length < 2} className="grid size-14 place-items-center rounded-2xl bg-black text-white disabled:opacity-40">{searching ? <Loader2 className="animate-spin" /> : <ChevronRight />}</button>
                                                </label>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                                                <Notice><span className="font-black">Manual entry:</span> Type a title first, then use manual mode. This avoids empty records.</Notice>
                                                <button type="button" onClick={manualEntry} disabled={draft.title.trim().length < 2} className="rounded-[22px] bg-black px-8 py-5 text-lg font-black text-white transition hover:-translate-y-0.5 disabled:opacity-35">Manual Entry</button>
                                            </div>

                                            {notice && <Notice>{notice}</Notice>}
                                            {warnings.length > 0 && <Notice tone="warning"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div className="space-y-1">{warnings.slice(0, 3).map((warning) => <p key={warning}>{warning}</p>)}</div></div></Notice>}
                                            {results.length === 0 && draft.title.trim().length >= 2 && !searching && <EmptyCard title="No result selected yet." body="Search results appear here. If providers fail, manual entry is the correct path." />}

                                            <div className="grid gap-4">
                                                {results.map((result) => (
                                                    <button key={resultKey(result)} type="button" onClick={() => void selectResult(result)} className={`group grid gap-5 rounded-[32px] border bg-white p-4 text-left shadow-[0_14px_35px_rgb(0_0_0/0.07)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgb(0_0_0/0.14)] md:grid-cols-[104px_1fr_auto] ${selectedResultKey === resultKey(result) ? "border-black" : "border-black/10"}`}>
                                                        {result.cover_url_original ? <img src={result.cover_url_original} alt="" className="h-[142px] w-[104px] rounded-[22px] object-cover" /> : <div className="grid h-[142px] w-[104px] place-items-center rounded-[22px] bg-black/10 text-xs font-black uppercase tracking-[0.14em] text-black/35">No Cover</div>}
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap gap-2"><Pill>{sourceName(result.source)}</Pill>{result.steam_app_id && <Pill active>Steam {result.steam_app_id}</Pill>}{result.total_achievements !== null && <Pill muted>{result.total_achievements} achievements</Pill>}</div>
                                                            <div className="mt-3 truncate text-4xl font-black tracking-[-0.06em]">{result.title}</div>
                                                            <div className="mt-1 truncate text-base font-bold text-black/45">{result.publisher || "Unknown Publisher"}{result.release_date ? ` · ${result.release_date}` : ""}</div>
                                                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                                                <div className="rounded-[18px] bg-black/[0.04] px-4 py-3"><div className="text-xs font-black uppercase tracking-[0.18em] text-black/35">Price</div><div className="mt-1 text-xl font-black">{money(result.base_price_default)}</div></div>
                                                                <div className="rounded-[18px] bg-black/[0.04] px-4 py-3"><div className="text-xs font-black uppercase tracking-[0.18em] text-black/35">Release</div><div className="mt-1 text-xl font-black">{result.release_date || "Unknown"}</div></div>
                                                                <div className="rounded-[18px] bg-black/[0.04] px-4 py-3"><div className="text-xs font-black uppercase tracking-[0.18em] text-black/35">DLCs</div><div className="mt-1 text-xl font-black">{result.dlcs?.length ?? "After save"}</div></div>
                                                            </div>
                                                        </div>
                                                        <div className="grid place-items-center"><span className="rounded-full bg-black px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white group-hover:bg-[#b7ff63] group-hover:text-black">Select</span></div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {step.key === "basics" && (
                                        <div className="grid gap-6">
                                            <div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Metadata</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Fix the record.</h3></div>
                                            {enriching && <Notice><span className="inline-flex items-center gap-3"><Loader2 className="size-5 animate-spin" /> Fetching Steam enrichment...</span></Notice>}
                                            <div className="grid gap-5 rounded-[34px] border border-black/10 bg-white p-6">
                                                <div className="grid gap-5 md:grid-cols-2">
                                                    <Field label="Title"><TextInput value={draft.title} onChange={(event) => update("title", event.target.value)} /></Field>
                                                    <Field label="Publisher"><TextInput value={draft.publisher} onChange={(event) => update("publisher", event.target.value)} placeholder="Unknown" /></Field>
                                                    <Field label="Release Date"><TextInput value={draft.release_date} onChange={(event) => update("release_date", event.target.value)} type="date" /></Field>
                                                    <Field label="Cover URL"><TextInput value={draft.cover_url_original} onChange={(event) => update("cover_url_original", event.target.value)} placeholder="https://..." /></Field>
                                                </div>
                                                <Field label="Description"><TextArea value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="No description" /></Field>
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-3"><Metric label="Source" value={sourceName(draft.source)} icon={<ShieldCheck />} /><Metric label="Steam App" value={draft.steam_app_id || "Missing"} icon={<Gamepad2 />} /><Metric label="DLC Preview" value={draft.dlcs.length || "After save"} icon={<Package />} /></div>
                                        </div>
                                    )}

                                    {step.key === "enrich" && (
                                        <div className="grid gap-6">
                                            <div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Steam Enrichment</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Price, achievements, DLC catalog.</h3></div>
                                            <Notice tone="warning">Achievements and base price are Steam-based hints. Double-check them for non-Steam platforms.</Notice>
                                            <div className="grid gap-5 rounded-[34px] border border-black/10 bg-white p-6">
                                                <div className="grid gap-5 md:grid-cols-[1fr_auto]"><Field label="Steam App ID"><TextInput value={draft.steam_app_id} onChange={(event) => update("steam_app_id", event.target.value)} placeholder="Optional" /></Field><button type="button" onClick={() => void enrichCurrent()} disabled={enriching || draft.steam_app_id.trim().length === 0} className="self-end rounded-[22px] bg-black px-8 py-4 text-lg font-black text-white disabled:opacity-35">{enriching ? "Fetching..." : "Fetch Steam Data"}</button></div>
                                                <div className="grid gap-5 md:grid-cols-2"><Field label="Default Base Price"><TextInput value={draft.base_price_default} onChange={(event) => update("base_price_default", event.target.value)} type="number" step="0.01" placeholder="Unknown" /></Field><Field label="Total Achievements"><TextInput value={draft.total_achievements} onChange={(event) => update("total_achievements", event.target.value)} type="number" placeholder="Unknown" /></Field></div>
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-3"><Metric label="Base Price" value={money(draft.base_price_default)} icon={<Database />} /><Metric label="Achievements" value={draft.total_achievements || "Unknown"} icon={<Sparkles />} /><Metric label="DLCs" value={draft.dlcs.length || "Imported on save"} icon={<Package />} /></div>
                                        </div>
                                    )}

                                    {step.key === "platform" && <div className="grid gap-6"><div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Platform</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Choose the ecosystem.</h3></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{references.platforms.map((item) => <button key={item.id} type="button" onClick={() => choosePlatform(item.id)} className={`rounded-[28px] border px-6 py-7 text-left transition hover:-translate-y-1 ${draft.platform_id === item.id ? "border-black bg-black text-white" : "border-black/10 bg-white text-black"}`}><div className="text-3xl font-black tracking-[-0.04em]">{item.name}</div><div className="mt-3 text-sm font-bold opacity-50">{item.devices.length} devices · {item.ownership_types.length} ownership types</div></button>)}</div></div>}

                                    {step.key === "devices" && <div className="grid gap-6"><div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Devices</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Where can you play it?</h3></div><div className="rounded-[30px] border border-black/10 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[0.22em] text-black/35">Selected</div><div className="mt-2 flex flex-wrap gap-2">{selectedDevices.length ? selectedDevices.map((name) => <Pill key={name} active>{name}</Pill>) : <Pill muted>None</Pill>}</div></div><TextInput value={deviceQuery} onChange={(event) => setDeviceQuery(event.target.value)} placeholder="Filter devices..." className="w-full md:w-[320px]" /></div></div><div className="max-h-[520px] overflow-y-auto pr-1"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleDevices.map((device) => <button key={device.id} type="button" onClick={() => toggleDevice(device.id)} className={`rounded-[24px] border px-6 py-5 text-left text-lg font-black transition hover:-translate-y-0.5 ${draft.device_ids.includes(device.id) ? "border-black bg-black text-white" : "border-black/10 bg-white text-black"}`}>{device.name}</button>)}</div></div></div>}

                                    {step.key === "ownership" && (
                                        <div className="grid gap-6">
                                            <div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Ownership</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Select your copies.</h3></div>
                                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                {platform?.ownership_types.map((type) => {
                                                    const selected = draft.ownership_copies.some((copy) => copy.ownership_type_id === type.id);
                                                    return <button key={type.id} type="button" onClick={() => selected ? removeCopy(draft.ownership_copies.find((copy) => copy.ownership_type_id === type.id)?.local_id ?? "") : addCopy(type.id)} className={`rounded-[24px] border px-5 py-5 text-left font-black transition hover:-translate-y-0.5 ${selected ? "border-black bg-black text-white" : "border-black/10 bg-white text-black"}`}><div className="text-xl">{type.name}</div><div className="mt-2 text-xs uppercase tracking-[0.18em] opacity-45">{selected ? "Selected" : "Add copy"}</div></button>;
                                                })}
                                            </div>

                                            <div className="grid gap-5">
                                                {draft.ownership_copies.map((copy, index) => {
                                                    const name = ownershipById.get(copy.ownership_type_id);
                                                    const needsPhysical = !!name && physicalLike.includes(name);
                                                    return <div key={copy.local_id} className="rounded-[32px] border border-black/10 bg-white p-5"><div className="mb-5 flex items-center justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[0.22em] text-black/35">Copy {index + 1}</div><div className="text-3xl font-black tracking-[-0.05em]">{name || "Ownership"}</div></div><button type="button" onClick={() => removeCopy(copy.local_id)} disabled={draft.ownership_copies.length === 1} className="rounded-[18px] bg-red-500/15 px-5 py-3 text-sm font-black text-red-700 disabled:opacity-35">Remove</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Type"><Select value={copy.ownership_type_id} onChange={(event) => updateCopy(copy.local_id, { ownership_type_id: Number(event.target.value), physical_status_id: null })}>{platform?.ownership_types.map((item) => { const used = draft.ownership_copies.some((usedCopy) => usedCopy.local_id !== copy.local_id && usedCopy.ownership_type_id === item.id); return <option key={item.id} value={item.id} disabled={used}>{item.name}</option>; })}</Select></Field><Field label="Edition"><TextInput value={copy.edition_name} onChange={(event) => updateCopy(copy.local_id, { edition_name: event.target.value })} placeholder="Standard" /></Field><Field label="Base Price"><TextInput value={copy.base_price} onChange={(event) => updateCopy(copy.local_id, { base_price: event.target.value })} type="number" step="0.01" placeholder="Unknown" /></Field><Field label="Paid"><TextInput value={copy.purchased_price} onChange={(event) => updateCopy(copy.local_id, { purchased_price: event.target.value })} type="number" step="0.01" placeholder="Unknown" /></Field>{needsPhysical && <Field label="Physical Status"><Select value={copy.physical_status_id ?? ""} onChange={(event) => updateCopy(copy.local_id, { physical_status_id: Number(event.target.value) || null })}><option value="">Required</option>{references.physicalStatuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>}<Field label="Purchased At"><TextInput value={copy.purchased_at} onChange={(event) => updateCopy(copy.local_id, { purchased_at: event.target.value })} type="date" /></Field></div></div>;
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {step.key === "dlcs" && (
                                        <div className="grid gap-6">
                                            <div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">DLCs</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Expansion ownership.</h3></div>
                                            <Notice tone="warning">Steam DLC catalog is imported during save. This checkpoint supports DLC previews only when the backend returns real DLC IDs. Otherwise, edit DLC ownership from the details page after save.</Notice>
                                            {draft.dlcs.length === 0 ? <EmptyCard title="No DLC preview available." body={draft.steam_app_id ? "DLC catalog will be imported when the game is saved." : "No Steam App ID is attached, so the wizard cannot discover DLCs."} /> : <div className="grid gap-4">{draft.dlcs.map((dlc, index) => <div key={`${dlc.steam_app_id ?? dlc.title}-${index}`} className="grid gap-4 rounded-[28px] border border-black/10 bg-white p-4 md:grid-cols-[1fr_auto]"><div><div className="text-2xl font-black tracking-[-0.04em]">{dlc.title}</div><div className="mt-1 text-sm font-bold text-black/45">Base price: {money(dlc.base_price)}</div></div><div className="grid gap-3 md:min-w-[360px]"><div className="grid grid-cols-2 gap-2">{(["Not Owned", "Owned", "Edition Included", "Free"] as DlcState[]).filter((state) => state !== "Edition Included" || hasEditionCopy).map((state) => <button key={state} type="button" onClick={() => updateDlc(index, { state, purchased_price: state === "Free" || state === "Edition Included" ? "0" : dlc.purchased_price })} className={`rounded-[16px] px-3 py-3 text-xs font-black uppercase tracking-[0.12em] ${dlc.state === state ? "bg-black text-white" : "bg-black/5 text-black/45"}`}>{state}</button>)}</div>{dlc.state === "Owned" && <div className="grid gap-2 sm:grid-cols-2"><TextInput value={dlc.purchased_price} onChange={(event) => updateDlc(index, { purchased_price: event.target.value })} type="number" step="0.01" placeholder="Paid" /><TextInput value={dlc.purchased_at} onChange={(event) => updateDlc(index, { purchased_at: event.target.value })} type="date" /></div>}</div></div>)}</div>}
                                        </div>
                                    )}

                                    {step.key === "progress" && <div className="grid gap-6"><div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Progress</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Track the state.</h3></div>{!hasAchievements && <Notice>100% status is hidden because this game has no achievement total.</Notice>}<div className="grid gap-5 rounded-[34px] border border-black/10 bg-white p-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{availableStatuses.map((item) => <button key={item.id} type="button" onClick={() => chooseStatus(item.id)} className={`rounded-[22px] border px-5 py-5 text-left text-lg font-black transition hover:-translate-y-0.5 ${draft.status_id === item.id ? "border-black bg-black text-white" : "border-black/10 bg-[#f4f5ef] text-black"}`}>{item.name}</button>)}</div><div className="grid gap-5 md:grid-cols-2"><Field label="Playtime Hours"><TextInput value={draft.playtime_hours} onChange={(event) => update("playtime_hours", event.target.value)} type="number" step="0.1" /></Field><Field label="Earned Achievements"><TextInput value={draft.earned_achievements} onChange={(event) => update("earned_achievements", event.target.value)} type="number" placeholder={hasAchievements ? `0 / ${draft.total_achievements}` : "No achievements"} /></Field><Field label="First Played"><TextInput value={draft.first_played_at} onChange={(event) => update("first_played_at", event.target.value)} type="date" /></Field><Field label="Last Played"><TextInput value={draft.last_played_at} onChange={(event) => update("last_played_at", event.target.value)} type="date" /></Field><Field label="Completed At"><TextInput value={draft.completed_at} onChange={(event) => update("completed_at", event.target.value)} type="date" /></Field></div></div></div>}

                                    {step.key === "review" && <div className="grid gap-6"><div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Review</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Ready to save.</h3></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Metric label="Platform" value={platform?.name || "Missing"} icon={<Gamepad2 />} /><Metric label="Devices" value={selectedDevices.length} icon={<Layers3 />} /><Metric label="Ownership" value={draft.ownership_copies.length} icon={<Database />} /><Metric label="Status" value={status?.name || "Missing"} icon={<ShieldCheck />} /><Metric label="Playtime" value={`${draft.playtime_hours || 0}h`} icon={<Clock3 />} /><Metric label="Achievements" value={`${draft.earned_achievements || 0} / ${draft.total_achievements || "Unknown"}`} icon={<Sparkles />} /></div><div className="rounded-[30px] border border-black/10 bg-white p-6 text-lg font-bold text-black/60"><p><span className="font-black text-black">Game:</span> {draft.title}</p><p><span className="font-black text-black">Devices:</span> {selectedDevices.length ? selectedDevices.join(", ") : "Missing"}</p><p><span className="font-black text-black">Ownership:</span> {selectedOwnerships.length ? selectedOwnerships.join(", ") : "Missing"}</p><p><span className="font-black text-black">DLC states:</span> {draft.dlcs.filter((dlc) => dlc.state !== "Not Owned").length || "None selected"}</p></div></div>}

                                    {Object.keys(serverErrors).length > 0 && <div className="mt-6 rounded-[24px] border border-red-500/20 bg-red-500/10 p-5 text-sm font-black text-red-700"><div className="mb-2 text-base">Backend rejected the save:</div><ul className="list-inside list-disc space-y-1">{Object.entries(serverErrors).map(([key, value]) => <li key={key}>{key}: {value}</li>)}</ul></div>}
                                </section>
                            </div>
                        </main>

                        <footer className="flex items-center justify-between gap-5 border-t border-black/10 bg-white px-7 py-5">
                            <button type="button" onClick={previous} disabled={stepIndex === 0} className="flex items-center gap-3 rounded-[22px] bg-black/[0.06] px-8 py-4 text-lg font-black disabled:opacity-35"><ChevronLeft /> Back</button>
                            <div className="hidden min-w-0 flex-1 text-center text-sm font-black uppercase tracking-[0.18em] text-black/35 md:block">{currentError ? currentError : `${stepIndex + 1} / ${steps.length} · ${step.hint}`}</div>
                            {stepIndex < steps.length - 1 ? <button type="button" onClick={next} disabled={!!currentError} className="flex items-center gap-3 rounded-[22px] bg-black px-8 py-4 text-lg font-black text-white disabled:opacity-35">Next <ChevronRight /></button> : <button type="button" onClick={submit} disabled={!!currentError || saving} className="flex items-center gap-3 rounded-[22px] bg-black px-8 py-4 text-lg font-black text-white disabled:opacity-35">{saving ? <><Loader2 className="animate-spin" /> Saving</> : <><Check /> Save Game</>}</button>}
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
}