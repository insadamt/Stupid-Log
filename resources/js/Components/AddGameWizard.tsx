import { router } from "@inertiajs/react";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Database,
    Gamepad2,
    Layers3,
    Loader2,
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

type ProviderMode = "igdb" | "steam";

type OwnershipCopyDraft = {
    ownership_type_id: number;
    physical_status_id: number | null;
    edition_name: string;
    base_price: string;
    purchased_price: string;
    purchased_at: string;
};

type Draft = {
    title: string;
    source: "manual" | "igdb" | "steam";
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
    status_id: number;
    playtime_hours: string;
    earned_achievements: string;
    first_played_at: string;
    last_played_at: string;
    completed_at: string;
};

const physicalLike = ["Physical", "Pre-owned", "Borrowed"];
const steps = ["Search", "Inspect", "Platform", "Devices", "Ownership", "Progress", "Review"];

function firstByName<T extends { id: number; name: string }>(items: T[], name: string, fallback?: T): T {
    return items.find((item) => item.name === name) ?? fallback ?? items[0];
}

function numberText(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return "Unknown";
    return String(value);
}

function money(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return "Unknown";
    const parsed = Number(value);
    return Number.isNaN(parsed) ? String(value) : `$${parsed.toFixed(2)}`;
}

function Pill({ children, active = false }: { children: ReactNode; active?: boolean }) {
    return (
        <span className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${active ? "bg-[#b7ff63] text-black" : "bg-black text-white"}`}>
            {children}
        </span>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-black/40">{label}</span>
            {children}
        </label>
    );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`rounded-[20px] border border-black/10 bg-[#f3f4ed] px-4 py-4 text-base font-black outline-none transition focus:border-black ${props.className ?? ""}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={`min-h-28 rounded-[20px] border border-black/10 bg-[#f3f4ed] px-4 py-4 text-base font-bold outline-none transition focus:border-black ${props.className ?? ""}`} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className={`rounded-[20px] border border-black/10 bg-[#f3f4ed] px-4 py-4 text-base font-black outline-none transition focus:border-black ${props.className ?? ""}`} />;
}

function Metric({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
    return (
        <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_16px_40px_rgb(0_0_0/0.06)]">
            <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-black/35">{label}</div>
                {icon && <div className="text-black/30">{icon}</div>}
            </div>
            <div className="mt-2 text-3xl font-black tracking-[-0.04em] text-black">{value}</div>
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
    const defaultPlatform = firstByName(references.platforms, "Steam", references.platforms[0]);
    const defaultStatus = firstByName(references.statuses, "Not Played", references.statuses[0]);

    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [providerMode, setProviderMode] = useState<ProviderMode>("igdb");
    const [providerResults, setProviderResults] = useState<ProviderSearchResult[]>([]);
    const [providerWarnings, setProviderWarnings] = useState<string[]>([]);
    const [searchingProviders, setSearchingProviders] = useState(false);
    const [enrichingSelection, setEnrichingSelection] = useState(false);
    const [searchError, setSearchError] = useState("");
    const searchRequestId = useRef(0);

    const [draft, setDraft] = useState<Draft>(() => ({
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
            ownership_type_id: defaultPlatform?.ownership_types[0]?.id ?? 0,
            physical_status_id: null,
            edition_name: "",
            base_price: "",
            purchased_price: "",
            purchased_at: "",
        }],
        status_id: defaultStatus?.id ?? 0,
        playtime_hours: "0",
        earned_achievements: "0",
        first_played_at: "",
        last_played_at: "",
        completed_at: "",
    }));

    const platform = useMemo(() => references.platforms.find((item) => item.id === draft.platform_id), [draft.platform_id, references.platforms]);
    const status = useMemo(() => references.statuses.find((item) => item.id === draft.status_id), [draft.status_id, references.statuses]);
    const ownershipById = useMemo(() => new Map(references.ownershipTypes.map((item) => [item.id, item.name])), [references.ownershipTypes]);
    const deviceById = useMemo(() => new Map(references.devices.map((item) => [item.id, item.name])), [references.devices]);
    const hasAchievements = Number(draft.total_achievements || 0) > 0;
    const availableStatuses = references.statuses.filter((item) => hasAchievements || item.name !== "100%");

    const selectedDeviceNames = draft.device_ids.map((id) => deviceById.get(id)).filter(Boolean);
    const selectedOwnershipNames = draft.ownership_copies.map((copy) => ownershipById.get(copy.ownership_type_id)).filter(Boolean);

    function update<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function applyResult(result: ProviderSearchResult) {
        const basePrice = result.base_price_default === null || result.base_price_default === undefined ? "" : String(result.base_price_default);
        const totalAchievements = result.total_achievements === null || result.total_achievements === undefined ? "" : String(result.total_achievements);

        setDraft((current) => ({
            ...current,
            title: result.title,
            source: result.source,
            external_id: result.external_id,
            steam_app_id: result.steam_app_id ?? current.steam_app_id,
            cover_url_original: result.cover_url_original ?? current.cover_url_original,
            publisher: result.publisher ?? current.publisher,
            release_date: result.release_date ?? current.release_date,
            description: result.description ?? current.description,
            total_achievements: totalAchievements || current.total_achievements,
            base_price_default: basePrice || current.base_price_default,
            ownership_copies: current.ownership_copies.map((copy) => ({
                ...copy,
                base_price: copy.base_price === "" ? basePrice : copy.base_price,
            })),
        }));
    }

    async function searchProviders(searchQuery = draft.title.trim(), mode = providerMode) {
        const query = searchQuery.trim();

        if (query.length < 2) {
            setProviderResults([]);
            setProviderWarnings([]);
            setSearchError("");
            return;
        }

        const requestId = ++searchRequestId.current;
        setSearchingProviders(true);
        setSearchError("");

        try {
            const params = new URLSearchParams({
                query,
                provider: mode,
                enrich: mode === "steam" ? "1" : "0",
            });

            const response = await fetch(`/provider-search?${params.toString()}`);
            if (!response.ok) throw new Error("Provider search failed.");

            const data = (await response.json()) as ProviderSearchResponse;
            if (requestId !== searchRequestId.current) return;

            setProviderResults(data.results);
            setProviderWarnings(data.warnings);
        } catch (error) {
            if (requestId !== searchRequestId.current) return;
            setProviderResults([]);
            setProviderWarnings([]);
            setSearchError(error instanceof Error ? error.message : "Provider search failed.");
        } finally {
            if (requestId === searchRequestId.current) setSearchingProviders(false);
        }
    }

    async function enrichSelectedSteamData(result: ProviderSearchResult) {
        if (!result.steam_app_id) return result;

        setEnrichingSelection(true);
        try {
            const params = new URLSearchParams({
                query: result.title,
                provider: "steam",
                enrich: "1",
                steam_app_id: result.steam_app_id,
            });

            const response = await fetch(`/provider-search?${params.toString()}`);
            if (!response.ok) return result;

            const data = (await response.json()) as ProviderSearchResponse;
            setProviderWarnings(data.warnings);
            return data.results[0] ?? result;
        } catch {
            return result;
        } finally {
            setEnrichingSelection(false);
        }
    }

    async function selectProviderResult(result: ProviderSearchResult) {
        applyResult(result);
        setStep(1);

        if (result.steam_app_id) {
            const enriched = await enrichSelectedSteamData(result);
            applyResult({ ...result, ...enriched });
        }
    }

    function useManualEntry() {
        setDraft((current) => ({
            ...current,
            source: "manual",
            external_id: "",
            steam_app_id: "",
            cover_url_original: "",
            total_achievements: "",
            base_price_default: "",
            ownership_copies: current.ownership_copies.map((copy) => ({ ...copy, base_price: "" })),
        }));
        setStep(1);
    }

    function choosePlatform(platformId: number) {
        const nextPlatform = references.platforms.find((item) => item.id === platformId);
        if (!nextPlatform) return;

        setDraft((current) => ({
            ...current,
            platform_id: platformId,
            device_ids: nextPlatform.devices[0] ? [nextPlatform.devices[0].id] : [],
            ownership_copies: [{
                ownership_type_id: nextPlatform.ownership_types[0]?.id ?? 0,
                physical_status_id: null,
                edition_name: "",
                base_price: current.base_price_default,
                purchased_price: "",
                purchased_at: "",
            }],
        }));
    }

    function toggleDevice(deviceId: number) {
        setDraft((current) => ({
            ...current,
            device_ids: current.device_ids.includes(deviceId)
                ? current.device_ids.filter((id) => id !== deviceId)
                : [...current.device_ids, deviceId],
        }));
    }

    function updateCopy(index: number, patch: Partial<OwnershipCopyDraft>) {
        setDraft((current) => ({
            ...current,
            ownership_copies: current.ownership_copies.map((copy, copyIndex) => copyIndex === index ? { ...copy, ...patch } : copy),
        }));
    }

    function addCopy() {
        const used = new Set(draft.ownership_copies.map((copy) => copy.ownership_type_id));
        const nextType = platform?.ownership_types.find((item) => !used.has(item.id)) ?? platform?.ownership_types[0];
        if (!nextType) return;

        setDraft((current) => ({
            ...current,
            ownership_copies: [...current.ownership_copies, {
                ownership_type_id: nextType.id,
                physical_status_id: null,
                edition_name: "",
                base_price: current.base_price_default,
                purchased_price: "",
                purchased_at: "",
            }],
        }));
    }

    function removeCopy(index: number) {
        setDraft((current) => ({
            ...current,
            ownership_copies: current.ownership_copies.filter((_, copyIndex) => copyIndex !== index),
        }));
    }

    function canContinue() {
        if (step === 0) return draft.title.trim().length >= 2;
        if (step === 1) return draft.title.trim().length > 0;
        if (step === 2) return Boolean(draft.platform_id);
        if (step === 3) return draft.device_ids.length > 0;
        if (step === 4) {
            const ids = draft.ownership_copies.map((copy) => copy.ownership_type_id);
            const unique = new Set(ids);
            return draft.ownership_copies.length > 0 && unique.size === ids.length && draft.ownership_copies.every((copy) => {
                const name = ownershipById.get(copy.ownership_type_id);
                return !name || !physicalLike.includes(name) || Boolean(copy.physical_status_id);
            });
        }
        if (step === 5) {
            const total = Number(draft.total_achievements || 0);
            const earned = Number(draft.earned_achievements || 0);
            return earned >= 0 && (total <= 0 || earned <= total) && (status?.name !== "100%" || (total > 0 && earned === total));
        }
        return true;
    }

    function next() {
        if (canContinue()) setStep((current) => Math.min(current + 1, steps.length - 1));
    }

    function previous() {
        setStep((current) => Math.max(current - 1, 0));
    }

    function submit() {
        const externalIds: Record<string, string> = {};
        if (draft.source === "igdb" && draft.external_id) externalIds.igdb = draft.external_id;
        if (draft.source === "steam" && draft.external_id) externalIds.steam = draft.external_id;
        if (draft.steam_app_id) externalIds.steam = draft.steam_app_id;

        router.post("/library-games", {
            game: {
                title: draft.title,
                publisher: draft.publisher || null,
                release_date: draft.release_date || null,
                description: draft.description || null,
                source: draft.source,
                external_ids: externalIds,
                steam_app_id: draft.steam_app_id || null,
                cover_url_original: draft.cover_url_original || null,
                total_achievements: draft.total_achievements === "" ? null : Number(draft.total_achievements),
                total_achievements_source: draft.total_achievements === "" ? null : "steam",
                base_price_default: draft.base_price_default === "" ? null : Number(draft.base_price_default),
                base_price_source: draft.base_price_default === "" ? null : "steam",
                create_duplicate_anyway: true,
            },
            platform_id: draft.platform_id,
            device_ids: draft.device_ids,
            ownership_copies: draft.ownership_copies.map((copy) => ({
                ownership_type_id: copy.ownership_type_id,
                physical_status_id: copy.physical_status_id,
                edition_name: copy.edition_name || null,
                base_price: copy.base_price === "" ? null : Number(copy.base_price),
                purchased_price: copy.purchased_price === "" ? null : Number(copy.purchased_price),
                purchased_at: copy.purchased_at || null,
            })),
            progress: {
                status_id: draft.status_id,
                playtime_hours: Number(draft.playtime_hours || 0),
                earned_achievements: draft.earned_achievements === "" ? null : Number(draft.earned_achievements),
                first_played_at: draft.first_played_at || null,
                last_played_at: draft.last_played_at || null,
                completed_at: draft.completed_at || null,
            },
        });
    }

    useEffect(() => {
        if (!open || step !== 0) return;
        const query = draft.title.trim();

        if (query.length < 3) {
            setProviderResults([]);
            setProviderWarnings([]);
            setSearchError("");
            return;
        }

        const timeout = window.setTimeout(() => {
            void searchProviders(query, providerMode);
        }, providerMode === "igdb" ? 280 : 420);

        return () => window.clearTimeout(timeout);
    }, [draft.title, providerMode, open, step]);

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
                {buttonContent ?? (
                    <span className="flex h-full w-full items-center justify-center gap-4">
                        <span className="grid size-11 place-items-center rounded-2xl bg-black text-[#b7ff63]"><Plus size={28} strokeWidth={4} /></span>
                        <span>Add Game</span>
                    </span>
                )}
            </button>

            {open && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-5 py-6 backdrop-blur-md">
                    <section className="grid max-h-[94vh] w-full max-w-[1280px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[36px] border border-white/20 bg-[#eff1ea] shadow-[0_40px_140px_rgb(0_0_0/0.5)]">
                        <header className="border-b border-black/10 bg-[#b7ff63] px-8 py-6">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <div className="text-sm font-black uppercase tracking-[0.34em] text-black/45">Stupid Log Archive Builder</div>
                                    <h2 className="mt-1 text-5xl font-black leading-none tracking-[-0.055em] text-black">Add Game</h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Pill>{steps[step]}</Pill>
                                    <button type="button" onClick={() => setOpen(false)} className="grid size-12 place-items-center rounded-full bg-black text-white"><X /></button>
                                </div>
                            </div>
                            <div className="mt-6 grid grid-cols-7 gap-2">
                                {steps.map((label, index) => <button key={label} type="button" onClick={() => index <= step && setStep(index)} className={`h-2 rounded-full ${index <= step ? "bg-black" : "bg-white/70"}`} aria-label={label} />)}
                            </div>
                        </header>

                        <main className="sl-scrollbar overflow-auto p-7">
                            <div className="grid gap-7 lg:grid-cols-[320px_1fr]">
                                <aside className="space-y-5">
                                    <div className="rounded-[34px] bg-black p-3 shadow-[0_24px_70px_rgb(0_0_0/0.25)]">
                                        {draft.cover_url_original ? <img src={draft.cover_url_original} alt="" className="h-[430px] w-full rounded-[26px] object-cover" /> : (
                                            <div className="grid h-[430px] place-items-center rounded-[26px] bg-[#181a18] text-center">
                                                <div>
                                                    <div className="mx-auto grid size-20 place-items-center rounded-[24px] bg-[#b7ff63] text-4xl font-black text-black">SL</div>
                                                    <div className="mt-5 text-xs font-black uppercase tracking-[0.26em] text-white/35">No Cover</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-[28px] border border-black/10 bg-white p-5">
                                        <div className="text-xs font-black uppercase tracking-[0.22em] text-black/35">Current Draft</div>
                                        <h3 className="mt-2 line-clamp-2 text-3xl font-black tracking-[-0.05em]">{draft.title || "Untitled Game"}</h3>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <Pill>{draft.source}</Pill>
                                            {draft.steam_app_id && <Pill active>Steam {draft.steam_app_id}</Pill>}
                                        </div>
                                    </div>
                                </aside>

                                <section className="min-w-0">
                                    {step === 0 && (
                                        <div className="grid gap-5">
                                            <div className="rounded-[34px] bg-black p-6 text-white">
                                                <div className="flex flex-wrap items-center justify-between gap-4">
                                                    <div>
                                                        <div className="text-sm font-black uppercase tracking-[0.28em] text-[#b7ff63]">Fast Search</div>
                                                        <h3 className="mt-2 text-5xl font-black tracking-[-0.06em]">Choose the source.</h3>
                                                        <p className="mt-3 max-w-2xl text-lg font-bold text-white/55">IGDB is fast metadata. Steam is direct store data. No hidden fallback.</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 rounded-[22px] bg-white/10 p-1">
                                                        <button type="button" onClick={() => setProviderMode("igdb")} className={`rounded-[18px] px-6 py-3 text-sm font-black uppercase tracking-[0.16em] ${providerMode === "igdb" ? "bg-[#b7ff63] text-black" : "text-white/55"}`}><Database className="mr-2 inline size-4" /> IGDB</button>
                                                        <button type="button" onClick={() => setProviderMode("steam")} className={`rounded-[18px] px-6 py-3 text-sm font-black uppercase tracking-[0.16em] ${providerMode === "steam" ? "bg-[#b7ff63] text-black" : "text-white/55"}`}><Gamepad2 className="mr-2 inline size-4" /> Steam</button>
                                                    </div>
                                                </div>

                                                <label className="mt-7 flex h-18 items-center rounded-[24px] bg-white px-5 text-black">
                                                    <input value={draft.title} onChange={(event) => update("title", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchProviders(); } }} placeholder={providerMode === "igdb" ? "Search IGDB metadata" : "Search Steam store"} className="min-w-0 flex-1 bg-transparent text-2xl font-black outline-none placeholder:text-black/25" autoFocus />
                                                    <button type="button" onClick={() => void searchProviders()} disabled={searchingProviders || draft.title.trim().length < 2} className="grid size-14 place-items-center rounded-2xl bg-black text-white disabled:opacity-40">
                                                        {searchingProviders ? <Loader2 className="animate-spin" /> : <Search />}
                                                    </button>
                                                </label>
                                            </div>

                                            <div className="grid gap-4 rounded-[28px] border border-black/10 bg-white p-5 md:grid-cols-[1fr_auto] md:items-center">
                                                <div><div className="text-2xl font-black">Manual entry is always available.</div><div className="mt-1 text-base font-bold text-black/45">Use it when providers return noise.</div></div>
                                                <button type="button" onClick={useManualEntry} className="rounded-[20px] bg-black px-7 py-4 text-lg font-black text-white">Manual Entry</button>
                                            </div>

                                            {searchError && <div className="rounded-[24px] bg-[#ff3038] px-6 py-4 text-lg font-black text-white">{searchError}</div>}
                                            {providerWarnings.length > 0 && <div className="rounded-[24px] border border-black/10 bg-white px-6 py-4 text-sm font-bold text-black/55">{providerWarnings.slice(0, 2).map((warning) => <div key={warning}>{warning}</div>)}</div>}

                                            <div className="grid gap-4">
                                                {providerResults.map((result) => (
                                                    <button key={`${result.source}-${result.external_id}`} type="button" onClick={() => void selectProviderResult(result)} className="group grid gap-5 rounded-[30px] border border-black/10 bg-white p-4 text-left shadow-[0_14px_35px_rgb(0_0_0/0.07)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgb(0_0_0/0.14)] md:grid-cols-[96px_1fr_auto]">
                                                        {result.cover_url_original ? <img src={result.cover_url_original} alt="" className="h-[132px] w-[96px] rounded-[20px] object-cover" /> : <div className="grid h-[132px] w-[96px] place-items-center rounded-[20px] bg-black/10 text-xs font-black uppercase tracking-[0.14em] text-black/35">No Cover</div>}
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap gap-2"><Pill>{result.source}</Pill>{result.steam_app_id && <Pill active>Steam {result.steam_app_id}</Pill>}</div>
                                                            <div className="mt-3 truncate text-3xl font-black tracking-[-0.05em]">{result.title}</div>
                                                            <div className="mt-1 truncate text-base font-bold text-black/45">{result.publisher || "Unknown Publisher"}{result.release_date ? ` | ${result.release_date}` : ""}</div>
                                                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                                                <div className="rounded-[18px] bg-black/[0.04] px-4 py-3"><div className="text-xs font-black uppercase tracking-[0.18em] text-black/35">Steam Price</div><div className="mt-1 text-xl font-black">{money(result.base_price_default)}</div></div>
                                                                <div className="rounded-[18px] bg-black/[0.04] px-4 py-3"><div className="text-xs font-black uppercase tracking-[0.18em] text-black/35">Achievements</div><div className="mt-1 text-xl font-black">{numberText(result.total_achievements)}</div></div>
                                                            </div>
                                                        </div>
                                                        <div className="grid place-items-center"><span className="rounded-full bg-black px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-white group-hover:bg-[#b7ff63] group-hover:text-black">Select</span></div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {step === 1 && (
                                        <div className="grid gap-6">
                                            <div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Inspect Import</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Clean the record.</h3></div>
                                            {enrichingSelection && <div className="flex items-center gap-3 rounded-[24px] bg-black px-6 py-4 text-lg font-black text-white"><Loader2 className="animate-spin" /> Fetching Steam price and achievements...</div>}
                                            <div className="grid gap-5 rounded-[34px] border border-black/10 bg-white p-6">
                                                <div className="grid gap-5 md:grid-cols-2"><Field label="Title"><TextInput value={draft.title} onChange={(event) => update("title", event.target.value)} /></Field><Field label="Publisher"><TextInput value={draft.publisher} onChange={(event) => update("publisher", event.target.value)} placeholder="Unknown Publisher" /></Field><Field label="Release Date"><TextInput value={draft.release_date} onChange={(event) => update("release_date", event.target.value)} type="date" /></Field><Field label="Steam App ID"><TextInput value={draft.steam_app_id} onChange={(event) => update("steam_app_id", event.target.value)} placeholder="Optional" /></Field></div>
                                                <div className="grid gap-5 md:grid-cols-2"><Field label="Steam Base Price"><TextInput value={draft.base_price_default} onChange={(event) => update("base_price_default", event.target.value)} type="number" step="0.01" placeholder="Unknown" /></Field><Field label="Total Achievements"><TextInput value={draft.total_achievements} onChange={(event) => update("total_achievements", event.target.value)} type="number" placeholder="Unknown" /></Field></div>
                                                <Field label="Description"><TextArea value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="No description" /></Field>
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-3"><Metric label="Source" value={draft.source} icon={<ShieldCheck />} /><Metric label="Steam Price" value={money(draft.base_price_default)} icon={<Gamepad2 />} /><Metric label="Achievements" value={numberText(draft.total_achievements)} icon={<Sparkles />} /></div>
                                        </div>
                                    )}

                                    {step === 2 && <div className="grid gap-6"><div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Platform</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Choose the ecosystem.</h3></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{references.platforms.map((item) => <button key={item.id} type="button" onClick={() => choosePlatform(item.id)} className={`rounded-[28px] border px-6 py-7 text-left transition hover:-translate-y-1 ${draft.platform_id === item.id ? "border-black bg-black text-white" : "border-black/10 bg-white text-black"}`}><div className="text-3xl font-black tracking-[-0.04em]">{item.name}</div><div className="mt-3 text-sm font-bold opacity-50">{item.devices.length} devices | {item.ownership_types.length} ownerships</div></button>)}</div></div>}

                                    {step === 3 && <div className="grid gap-6"><div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Devices</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Where can you play it?</h3></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{platform?.devices.map((device) => <button key={device.id} type="button" onClick={() => toggleDevice(device.id)} className={`rounded-[24px] border px-6 py-5 text-left text-xl font-black ${draft.device_ids.includes(device.id) ? "border-black bg-black text-white" : "border-black/10 bg-white text-black"}`}>{device.name}</button>)}</div></div>}

                                    {step === 4 && <div className="grid gap-6"><div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Ownership</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">How do you own it?</h3></div><div className="grid gap-5">{draft.ownership_copies.map((copy, index) => { const name = ownershipById.get(copy.ownership_type_id); const needsPhysical = name ? physicalLike.includes(name) : false; return <div key={index} className="rounded-[30px] border border-black/10 bg-white p-5"><div className="mb-5 flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-[0.22em] text-black/35">Copy {index + 1}</div><div className="text-2xl font-black">{name || "Ownership"}</div></div><button type="button" onClick={() => removeCopy(index)} disabled={draft.ownership_copies.length === 1} className="rounded-[18px] bg-[#ff3038] px-5 py-3 text-sm font-black text-white disabled:opacity-35">Remove</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Type"><Select value={copy.ownership_type_id} onChange={(event) => updateCopy(index, { ownership_type_id: Number(event.target.value), physical_status_id: null })}>{platform?.ownership_types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Edition"><TextInput value={copy.edition_name} onChange={(event) => updateCopy(index, { edition_name: event.target.value })} placeholder="Standard" /></Field><Field label="Base Price"><TextInput value={copy.base_price} onChange={(event) => updateCopy(index, { base_price: event.target.value })} type="number" step="0.01" placeholder="Unknown" /></Field><Field label="Paid"><TextInput value={copy.purchased_price} onChange={(event) => updateCopy(index, { purchased_price: event.target.value })} type="number" step="0.01" placeholder="Unknown" /></Field>{needsPhysical && <Field label="Physical Status"><Select value={copy.physical_status_id ?? ""} onChange={(event) => updateCopy(index, { physical_status_id: Number(event.target.value) || null })}><option value="">Required</option>{references.physicalStatuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>}<Field label="Purchased At"><TextInput value={copy.purchased_at} onChange={(event) => updateCopy(index, { purchased_at: event.target.value })} type="date" /></Field></div></div>; })}<button type="button" onClick={addCopy} className="flex items-center justify-center gap-3 rounded-[24px] bg-black px-8 py-5 text-xl font-black text-white"><Plus /> Add Ownership Copy</button></div></div>}

                                    {step === 5 && <div className="grid gap-6"><div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Progress</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Track the state.</h3></div><div className="grid gap-5 rounded-[34px] border border-black/10 bg-white p-6 md:grid-cols-2"><Field label="Status"><Select value={draft.status_id} onChange={(event) => update("status_id", Number(event.target.value))}>{availableStatuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Playtime Hours"><TextInput value={draft.playtime_hours} onChange={(event) => update("playtime_hours", event.target.value)} type="number" step="0.1" /></Field><Field label="Earned Achievements"><TextInput value={draft.earned_achievements} onChange={(event) => update("earned_achievements", event.target.value)} type="number" placeholder={hasAchievements ? `0 / ${draft.total_achievements}` : "No achievements"} /></Field><Field label="First Played"><TextInput value={draft.first_played_at} onChange={(event) => update("first_played_at", event.target.value)} type="date" /></Field><Field label="Last Played"><TextInput value={draft.last_played_at} onChange={(event) => update("last_played_at", event.target.value)} type="date" /></Field><Field label="Completed At"><TextInput value={draft.completed_at} onChange={(event) => update("completed_at", event.target.value)} type="date" /></Field></div></div>}

                                    {step === 6 && <div className="grid gap-6"><div><div className="text-sm font-black uppercase tracking-[0.28em] text-black/35">Review</div><h3 className="mt-1 text-5xl font-black tracking-[-0.06em]">Ready to save.</h3></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Metric label="Platform" value={platform?.name || "Missing"} icon={<Gamepad2 />} /><Metric label="Devices" value={selectedDeviceNames.length} icon={<Layers3 />} /><Metric label="Ownership" value={draft.ownership_copies.length} icon={<Database />} /><Metric label="Status" value={status?.name || "Missing"} icon={<ShieldCheck />} /><Metric label="Playtime" value={`${draft.playtime_hours || 0}h`} icon={<Clock3 />} /><Metric label="Achievements" value={`${draft.earned_achievements || 0} / ${draft.total_achievements || "Unknown"}`} icon={<Sparkles />} /></div><div className="rounded-[30px] border border-black/10 bg-white p-6 text-lg font-bold text-black/55">{selectedDeviceNames.length > 0 && <>Devices: {selectedDeviceNames.join(", ")}. </>}{selectedOwnershipNames.length > 0 && <>Ownership: {selectedOwnershipNames.join(", ")}.</>}</div></div>}
                                </section>
                            </div>
                        </main>

                        <footer className="flex items-center justify-between border-t border-black/10 bg-white px-8 py-6">
                            <button type="button" onClick={previous} disabled={step === 0} className="flex items-center gap-3 rounded-[22px] bg-black/[0.06] px-8 py-4 text-xl font-black disabled:opacity-35"><ChevronLeft /> Back</button>
                            <div className="text-sm font-black uppercase tracking-[0.2em] text-black/35">{step + 1} / {steps.length}</div>
                            {step < steps.length - 1 ? <button type="button" onClick={next} disabled={!canContinue()} className="flex items-center gap-3 rounded-[22px] bg-black px-8 py-4 text-xl font-black text-white disabled:opacity-35">Next <ChevronRight /></button> : <button type="button" onClick={submit} disabled={!canContinue()} className="flex items-center gap-3 rounded-[22px] bg-black px-8 py-4 text-xl font-black text-white disabled:opacity-35"><Check /> Save Game</button>}
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
}
