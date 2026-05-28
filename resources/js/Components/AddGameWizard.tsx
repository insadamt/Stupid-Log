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
import { gsap, prefersReducedMotion, useGSAP } from "../animation";
import {
    ProviderSearchResponse,
    ProviderSearchResult,
    ReferenceData,
} from "../types";
import { statusPillStyle } from "../statusColors";
import PlatformIcon from "./PlatformIcon";

type GameSource = "manual" | "igdb" | "steam";
type ProviderMode = "igdb" | "steam";
type StepKey = "search" | "basics" | "steam" | "platform" | "devices" | "ownership" | "dlcs" | "progress" | "review";

type WizardSearchResult = ProviderSearchResult & {
    dlcs?: Array<{
        id?: number | null;
        steam_app_id?: string | null;
        title: string;
        base_price?: number | string | null;
    }>;
};

type WizardSearchResponse = Omit<ProviderSearchResponse, "results"> & {
    results: WizardSearchResult[];
};

type SteamOriginal = {
    steam_app_id: string;
    base_price_default: string;
    total_achievements: string;
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

type DlcCatalogItem = {
    id?: number | null;
    steam_app_id: string;
    title: string;
    base_price?: number | string | null;
};

type OwnedDlcDraft = {
    steam_app_id: string;
    acquisition_type: "Owned" | "Edition Included" | "Free";
    purchased_price: string;
    purchased_at: string;
};

type Draft = {
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

type ManualDuplicate = {
    id: number;
    title: string;
    release_year?: string | null;
    publisher?: string | null;
    cover_url?: string | null;
};

const steps: Array<{ key: StepKey; label: string }> = [
    { key: "search", label: "Search" },
    { key: "basics", label: "Basics" },
    { key: "steam", label: "Steam" },
    { key: "platform", label: "Platform" },
    { key: "devices", label: "Devices" },
    { key: "ownership", label: "Ownership" },
    { key: "dlcs", label: "DLCs" },
    { key: "progress", label: "Progress" },
    { key: "review", label: "Review" },
];

const physicalLike = ["Physical", "Pre-owned", "Borrowed"];
const dlcAcquisitionTypes: OwnedDlcDraft["acquisition_type"][] = ["Owned", "Edition Included", "Free"];

function localId() {
    return Math.random().toString(36).slice(2, 10);
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function year(value: string | null | undefined) {
    return value ? value.slice(0, 4) : "Unknown year";
}

function toDateInput(value: string | null | undefined) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function money(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return "Unknown";
    const parsed = Number(value);
    return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : String(value);
}

function numberOrNull(value: string) {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value: string) {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
}

function sourceName(source: GameSource) {
    if (source === "igdb") return "IGDB";
    if (source === "steam") return "Steam";
    return "Manual";
}

function firstByName<T extends { id: number; name: string }>(items: T[], name: string) {
    return items.find((item) => item.name === name) ?? items[0];
}

function csrfToken() {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "";
}

function steamPortraitUrl(appId: string | null | undefined) {
    return appId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg` : "";
}

function preferredResultCover(result: WizardSearchResult) {
    if (result.source === "steam" && result.steam_app_id) return steamPortraitUrl(result.steam_app_id);
    return result.cover_url_original ?? "";
}

function fallbackResultCover(result: WizardSearchResult) {
    const preferred = preferredResultCover(result);
    return result.cover_url_original && result.cover_url_original !== preferred ? result.cover_url_original : "";
}

function dlcCatalogFromResult(result: WizardSearchResult): DlcCatalogItem[] {
    return (result.dlcs ?? [])
        .filter((dlc) => !!dlc.steam_app_id)
        .map((dlc) => ({
            id: dlc.id ?? null,
            steam_app_id: String(dlc.steam_app_id),
            title: dlc.title,
            base_price: dlc.base_price ?? null,
        }));
}

function uploadErrorMessage(payload: unknown) {
    if (!payload || typeof payload !== "object") return "The cover failed to upload.";
    const data = payload as { message?: string; errors?: Record<string, string[]> };
    return data.errors?.cover?.[0] ?? data.message ?? "The cover failed to upload.";
}

function requestErrorMessage(payload: unknown, fallback: string) {
    if (!payload || typeof payload !== "object") return fallback;
    const data = payload as { message?: string; errors?: Record<string, string[]> };
    const firstError = data.errors ? Object.values(data.errors)[0]?.[0] : null;
    return firstError ?? data.message ?? fallback;
}

function Pill({ children, active = false, muted = false }: { children: ReactNode; active?: boolean; muted?: boolean }) {
    return (
        <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] ${active ? "bg-[#b7ff63] text-black" : muted ? "bg-black/5 text-black/45" : "bg-black text-white"}`}>
            {children}
        </span>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-black/40">{label}</span>
            {children}
        </label>
    );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`h-12 rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold text-black outline-none transition placeholder:text-black/30 focus:border-black ${props.className ?? ""}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={`min-h-[128px] rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm font-bold text-black outline-none transition placeholder:text-black/30 focus:border-black ${props.className ?? ""}`} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className={`h-12 rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold text-black outline-none transition focus:border-black ${props.className ?? ""}`} />;
}

function Notice({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warning" | "danger" }) {
    return (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-relaxed ${tone === "danger" ? "border-red-500/30 bg-red-500/10 text-red-700" : tone === "warning" ? "border-black/10 bg-[#fff4c8] text-black/70" : "border-black/10 bg-white text-black/55"}`}>
            {children}
        </div>
    );
}

function Metric({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
    return (
        <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-black/35">{label}</div>
                {icon && <div className="text-black/25">{icon}</div>}
            </div>
            <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-black">{value}</div>
        </div>
    );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="grid min-h-[220px] place-items-center rounded-[28px] border border-dashed border-black/15 bg-white/60 p-8 text-center">
            <div>
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-black text-[#b7ff63]"><Package size={22} /></div>
                <div className="mt-4 text-2xl font-black tracking-[-0.04em]">{title}</div>
                <p className="mx-auto mt-2 max-w-xl text-sm font-bold text-black/45">{body}</p>
            </div>
        </div>
    );
}

function CoverImage({ src, fallbackSrc = "", alt = "", className = "" }: { src: string; fallbackSrc?: string; alt?: string; className?: string }) {
    const [current, setCurrent] = useState(src);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setCurrent(src);
        setFailed(false);
    }, [src, fallbackSrc]);

    if (!current || failed) {
        return <div className={`grid place-items-center bg-black text-xs font-black uppercase tracking-[0.18em] text-white/35 ${className}`}>No Cover</div>;
    }

    return (
        <img
            src={current}
            alt={alt}
            className={`bg-black object-contain ${className}`}
            onError={() => {
                if (fallbackSrc && current !== fallbackSrc) {
                    setCurrent(fallbackSrc);
                    return;
                }
                setFailed(true);
            }}
        />
    );
}

function BuilderTitle({
    eyebrow,
    title,
    body,
}: {
    eyebrow: string;
    title: string;
    body?: string;
}) {
    return (
        <div>
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#b7ff63]">
                {eyebrow}
            </p>

            <h3 className="mt-2 text-[52px] font-black leading-[0.88] tracking-[-0.065em] text-white">
                {title}
            </h3>

            {body && (
                <p className="mt-4 max-w-2xl text-base font-black leading-relaxed text-white/42">
                    {body}
                </p>
            )}
        </div>
    );
}

function SourceSwitch({
    providerMode,
    setProviderMode,
}: {
    providerMode: ProviderMode;
    setProviderMode: (mode: ProviderMode) => void;
}) {
    return (
        <div className="grid grid-cols-2 rounded-[24px] bg-white/8 p-1.5 ring-1 ring-white/10">
            <button
                type="button"
                onClick={() => setProviderMode("igdb")}
                className={[
                    "h-12 rounded-[18px] px-6 text-sm font-black uppercase tracking-[0.22em] transition",
                    providerMode === "igdb"
                        ? "bg-[#b7ff63] text-black shadow-[0_12px_24px_rgb(183_255_99/0.18)]"
                        : "text-white/42 hover:bg-white/8 hover:text-white",
                ].join(" ")}
            >
                IGDB
            </button>

            <button
                type="button"
                onClick={() => setProviderMode("steam")}
                className={[
                    "h-12 rounded-[18px] px-6 text-sm font-black uppercase tracking-[0.22em] transition",
                    providerMode === "steam"
                        ? "bg-[#b7ff63] text-black shadow-[0_12px_24px_rgb(183_255_99/0.18)]"
                        : "text-white/42 hover:bg-white/8 hover:text-white",
                ].join(" ")}
            >
                Steam
            </button>
        </div>
    );
}

function SearchResultCard({
    result,
    selected,
    onSelect,
}: {
    result: WizardSearchResult;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={[
                "group grid min-h-[172px] grid-cols-[104px_minmax(0,1fr)_auto] items-center gap-5 rounded-[30px] border p-3 text-left transition",
                selected
                    ? "border-[#b7ff63] bg-black text-white shadow-[0_22px_55px_rgb(0_0_0/0.22)]"
                    : "border-black/8 bg-[#edf1ea] text-black hover:-translate-y-0.5 hover:border-black/20 hover:bg-white",
            ].join(" ")}
        >
            <div
                className={[
                    "overflow-hidden rounded-[22px] p-1.5",
                    selected ? "bg-[#b7ff63]" : "bg-[#b7ff63]",
                ].join(" ")}
            >
                <CoverImage
                    src={preferredResultCover(result)}
                    fallbackSrc={fallbackResultCover(result)}
                    alt={result.title}
                    className="h-[136px] w-[92px] rounded-[17px]"
                />
            </div>

            <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                        className={[
                            "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
                            selected ? "bg-[#b7ff63] text-black" : "bg-black text-[#b7ff63]",
                        ].join(" ")}
                    >
                        {sourceName(result.source)}
                    </span>

                    {result.steam_app_id && (
                        <span
                            className={[
                                "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
                                selected ? "bg-white/10 text-white/50" : "bg-black/5 text-black/42",
                            ].join(" ")}
                        >
                            Steam {result.steam_app_id}
                        </span>
                    )}
                </div>

                <h4 className="truncate text-[28px] font-black leading-none tracking-[-0.055em]">
                    {result.title}
                </h4>

                <p
                    className={[
                        "mt-3 truncate text-sm font-black uppercase tracking-[0.16em]",
                        selected ? "text-white/38" : "text-black/38",
                    ].join(" ")}
                >
                    {result.publisher || "Unknown Publisher"} · {year(result.release_date)}
                </p>
            </div>

            <span
                className={[
                    "grid size-14 place-items-center rounded-full transition group-hover:rotate-45",
                    selected ? "bg-[#b7ff63] text-black" : "bg-black text-[#b7ff63]",
                ].join(" ")}
            >
                <ChevronRight size={28} strokeWidth={3.2} />
            </span>
        </button>
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

    async function providerSearch(query: string, provider: ProviderMode, enrich = false, steamAppId?: string): Promise<WizardSearchResponse> {
        const params = new URLSearchParams({ query, provider, enrich: enrich ? "1" : "0" });
        if (steamAppId) params.set("steam_app_id", steamAppId);

        const response = await fetch(`/provider-search?${params.toString()}`);
        if (!response.ok) throw new Error(provider === "igdb" ? "IGDB search failed." : "Steam search failed.");
        return await response.json() as WizardSearchResponse;
    }

    async function createImportDraft(result: WizardSearchResult) {
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

        const body = new FormData();
        body.append("cover", file);
        setUploadingCover(true);
        setCoverError("");

        try {
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
        const params = new URLSearchParams({ title: draft.title.trim() });
        if (draft.release_date) params.set("release_date", draft.release_date);

        setCheckingDuplicates(true);
        try {
            const response = await fetch(`/library-games/manual-duplicates?${params.toString()}`, {
                headers: { Accept: "application/json" },
                credentials: "same-origin",
            });
            if (!response.ok) throw new Error("Duplicate check failed.");
            const data = await response.json() as { duplicates: ManualDuplicate[] };
            setDuplicateCandidates(data.duplicates);
            return data.duplicates;
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
    <div className="grid gap-5">
        <section className="relative overflow-hidden rounded-[38px] bg-black p-6 text-white shadow-[0_28px_80px_rgb(0_0_0/0.24)]">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[#b7ff63]/18 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/4 h-28 w-[520px] rounded-full bg-[#b7ff63]/10 blur-3xl" />

<div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
<BuilderTitle
    eyebrow="Archive Builder"
    title="Find the game file."
/>

<SourceSwitch providerMode={providerMode} setProviderMode={setProviderMode} />
</div>

            <div className="relative z-10 mt-7 grid gap-4 rounded-[30px] bg-white/[0.08] p-3 ring-1 ring-white/10 md:grid-cols-[1fr_auto]">
                <label className="flex h-[76px] items-center gap-4 rounded-[24px] bg-[#eef2ed] px-6 text-black">
                    <Search className="size-7 shrink-0 text-black/35" strokeWidth={3} />

                    <input
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            if (!selectedResultKey) update("title", event.target.value);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                void runSearch(searchQuery, providerMode);
                            }
                        }}
                        placeholder={`Search ${providerMode === "igdb" ? "IGDB" : "Steam"}...`}
                        className="min-w-0 flex-1 bg-transparent text-[30px] font-black tracking-[-0.055em] outline-none placeholder:text-black/25"
                        autoFocus
                    />
                </label>

                <button
                    type="button"
                    onClick={() => void runSearch(searchQuery, providerMode)}
                    disabled={searching || searchQuery.trim().length < 2}
                    className="flex h-[76px] items-center justify-center gap-3 rounded-[24px] bg-[#b7ff63] px-8 text-lg font-black text-black transition hover:-translate-y-0.5 disabled:opacity-40"
                >
                    {searching ? (
                        <>
                            <Loader2 className="animate-spin" size={22} />
                            Scanning
                        </>
                    ) : (
                        <>
                            Scan
                            <ChevronRight size={24} strokeWidth={3} />
                        </>
                    )}
                </button>
            </div>
        </section>


        {warnings.length > 0 && (
            <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-black text-red-700">
                <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                    <div className="space-y-1">
                        {warnings.slice(0, 3).map((warning) => (
                            <p key={warning}>{warning}</p>
                        ))}
                    </div>
                </div>
            </div>
        )}

{results.length === 0 && !searching && (
    <div className="grid min-h-[300px] place-items-center rounded-[34px] border border-dashed border-black/15 bg-[#eef2ed] p-8 text-center shadow-[inset_0_0_0_1px_rgb(255_255_255/0.45)]">
        <div className="max-w-xl">
            <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-black text-[#b7ff63] shadow-[0_18px_34px_rgb(0_0_0/0.16)]">
                <Package size={26} strokeWidth={3} />
            </div>

            <h4 className="mt-5 text-3xl font-black tracking-[-0.05em]">
                Start manually.
            </h4>

            <p className="mx-auto mt-2 max-w-md text-sm font-black leading-relaxed text-black/42">
                Skip provider search and build the game record yourself.
            </p>

            <button
                type="button"
                onClick={manualEntry}
                className="mt-6 inline-flex h-[58px] items-center justify-center gap-3 rounded-[22px] bg-black px-8 text-base font-black text-[#b7ff63] shadow-[0_18px_34px_rgb(0_0_0/0.18)] transition hover:-translate-y-0.5"
            >
                Manual Entry
                <ChevronRight size={22} strokeWidth={3} />
            </button>
        </div>
    </div>
)}

        {results.length > 0 && (
            <section className="rounded-[38px] bg-[#dfe5df] p-5 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.05)]">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-black/36">
                            Search Results
                        </p>

                        <h4 className="mt-1 text-3xl font-black leading-none tracking-[-0.05em]">
                            Pick the correct file.
                        </h4>
                    </div>

                    <span className="rounded-full bg-black px-5 py-2 text-sm font-black text-[#b7ff63]">
                        {results.length} loaded
                    </span>
                </div>

                <div className="grid max-h-[460px] gap-3 overflow-y-auto pr-2">
                    {results.map((result) => (
                        <SearchResultCard
                            key={resultKey(result)}
                            result={result}
                            selected={selectedResultKey === resultKey(result)}
                            onSelect={() => void selectResult(result)}
                        />
                    ))}
                </div>
            </section>
        )}
    </div>
)}

                                    {step.key === "basics" && (
                                        <div className="grid gap-6">
                                            <div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Game Basics</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Clean the record.</h3></div>
                                            {enriching && <Notice><span className="inline-flex items-center gap-3"><Loader2 className="size-5 animate-spin" /> Steam data is being attached in the background.</span></Notice>}
                                            <div className="grid gap-6 rounded-[28px] border border-black/10 bg-white/70 p-5 xl:grid-cols-[280px_1fr]">
                                                <div>
                                                    <div className="rounded-[24px] bg-black p-2">
                                                        <CoverImage src={coverPreview} className="h-[360px] w-full rounded-[18px]" />
                                                    </div>
                                                    <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); event.currentTarget.value = ""; }} />
                                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                                        <button type="button" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover} className="rounded-2xl bg-black px-4 py-3 text-sm font-black text-white disabled:opacity-40">{uploadingCover ? "Uploading" : "Upload"}</button>
                                                        <button type="button" onClick={() => { setLocalCoverPreview(""); setDraft((current) => ({ ...current, cover_url_original: providerCoverUrl, cover_path: "" })); }} disabled={!providerCoverUrl || (!draft.cover_path && !localCoverPreview && draft.cover_url_original === providerCoverUrl)} className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-black text-black/55 disabled:opacity-35">Reset</button>
                                                    </div>
                                                    {draft.cover_path && <div className="mt-3 rounded-2xl bg-[#b7ff63] px-4 py-3 text-sm font-black text-black">Cover uploaded</div>}
                                                    {coverError && <Notice tone="danger"><div className="flex items-center gap-2"><AlertTriangle size={18} /> {coverError}</div></Notice>}
                                                </div>
                                                <div className="grid gap-4 content-start">
                                                    <div className="grid gap-4 md:grid-cols-2"><Field label="Title"><TextInput value={draft.title} onChange={(event) => update("title", event.target.value)} /></Field><Field label="Publisher"><TextInput value={draft.publisher} onChange={(event) => update("publisher", event.target.value)} placeholder="Unknown" /></Field><Field label="Release Date"><TextInput value={draft.release_date} onChange={(event) => update("release_date", event.target.value)} type="date" /></Field></div>
                                                    <Field label="Description"><TextArea value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="No description" /></Field>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {step.key === "steam" && (
                                        <div className="grid gap-6">
                                            <div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Steam Data</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Verify store fields.</h3></div>
                                            <div className="grid gap-4 rounded-[28px] border border-black/10 bg-white/70 p-5 md:grid-cols-2">
                                                <Field label="Base Price"><TextInput value={draft.base_price_default} onChange={(event) => update("base_price_default", event.target.value)} type="number" step="0.01" placeholder="Unknown" /></Field>
                                                <Field label="Total Achievements"><TextInput value={draft.total_achievements} onChange={(event) => update("total_achievements", event.target.value)} type="number" placeholder="Unknown" /></Field>
                                            </div>
                                            {resetButtons}
                                        </div>
                                    )}

                                    {step.key === "platform" && (
                                        <div className="grid gap-6"><div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Platform</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Choose the ecosystem.</h3></div><TextInput value={platformQuery} onChange={(event) => setPlatformQuery(event.target.value)} placeholder="Search platform..." /><div className="grid gap-2 rounded-[28px] border border-black/10 bg-white/70 p-3">{filteredPlatforms.map((item) => { const selected = draft.platform_id === item.id; return <button key={item.id} type="button" onClick={() => choosePlatform(item.id)} className={`flex items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition ${selected ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"}`}><span className="flex min-w-0 items-center gap-3"><PlatformIcon platform={item.name} surface={selected ? "dark" : "light"} size="md" /><span className="truncate text-lg font-black">{item.name}</span></span><span className="shrink-0 text-xs font-black uppercase tracking-[0.16em] opacity-45">{item.devices.length} devices</span></button>; })}</div></div>
                                    )}

                                    {step.key === "devices" && (
                                        <div className="grid gap-6"><div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Devices</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Where can you play it?</h3></div><div className="rounded-[28px] border border-black/10 bg-white/70 p-4"><div className="mb-4 flex flex-wrap gap-2">{selectedDevices.length ? selectedDevices.map((name) => <Pill key={name} active>{name}</Pill>) : <Pill muted>No device selected</Pill>}</div><TextInput value={deviceQuery} onChange={(event) => setDeviceQuery(event.target.value)} placeholder="Search devices..." /></div><div className="grid max-h-[500px] gap-2 overflow-y-auto rounded-[28px] border border-black/10 bg-white/70 p-3">{filteredDevices.map((device) => <button key={device.id} type="button" onClick={() => toggleDevice(device.id)} className={`flex items-center justify-between rounded-2xl px-5 py-4 text-left text-base font-black transition ${draft.device_ids.includes(device.id) ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"}`}><span>{device.name}</span>{draft.device_ids.includes(device.id) && <Check size={18} />}</button>)}</div></div>
                                    )}

                                    {step.key === "ownership" && (
                                        <div className="grid gap-6"><div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Ownership</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Select your copies.</h3></div><div className="flex flex-wrap gap-2">{platform?.ownership_types.map((type) => { const selected = draft.ownership_copies.some((copy) => copy.ownership_type_id === type.id); return <button key={type.id} type="button" onClick={() => selected ? removeCopy(draft.ownership_copies.find((copy) => copy.ownership_type_id === type.id)?.local_id ?? "") : addCopy(type.id)} className={`rounded-2xl px-5 py-3 text-sm font-black ${selected ? "bg-black text-white" : "bg-white text-black/55"}`}>{type.name}</button>; })}</div><div className="grid gap-3">{draft.ownership_copies.map((copy, index) => { const name = ownershipById.get(copy.ownership_type_id); const needsPhysical = !!name && physicalLike.includes(name); return <div key={copy.local_id} className="rounded-[24px] border border-black/10 bg-white/70 p-4"><div className="mb-4 flex items-center justify-between"><div><div className="text-[11px] font-black uppercase tracking-[0.2em] text-black/35">Copy {index + 1}</div><div className="text-2xl font-black tracking-[-0.04em]">{name || "Ownership"}</div></div><button type="button" onClick={() => removeCopy(copy.local_id)} disabled={draft.ownership_copies.length === 1} className="rounded-xl bg-red-500/10 px-4 py-2 text-xs font-black text-red-700 disabled:opacity-35">Remove</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2"><Field label="Edition"><TextInput value={copy.edition_name} onChange={(event) => updateCopy(copy.local_id, { edition_name: event.target.value })} placeholder="Standard" /></Field><Field label="Base Price"><TextInput value={copy.base_price} onChange={(event) => updateCopy(copy.local_id, { base_price: event.target.value })} type="number" step="0.01" placeholder="Unknown" /></Field><Field label="Paid"><TextInput value={copy.purchased_price} onChange={(event) => updateCopy(copy.local_id, { purchased_price: event.target.value })} type="number" step="0.01" placeholder="Unknown" /></Field>{needsPhysical && <Field label="Physical Status"><Select value={copy.physical_status_id ?? ""} onChange={(event) => updateCopy(copy.local_id, { physical_status_id: Number(event.target.value) || null })}><option value="">Required</option>{references.physicalStatuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>}<Field label="Purchased At"><TextInput value={copy.purchased_at} onChange={(event) => updateCopy(copy.local_id, { purchased_at: event.target.value })} type="date" /></Field></div></div>; })}</div></div>
                                    )}

                                    {step.key === "dlcs" && (
                                        <div className="grid gap-6">
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">DLCs</div>
                                                <h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Mark expansions.</h3>
                                            </div>

                                            {enriching && <Notice><span className="inline-flex items-center gap-3"><Loader2 className="size-5 animate-spin" /> Steam DLC catalog is loading.</span></Notice>}

                                            {!draft.steam_app_id && (
                                                <EmptyCard title="No Steam App ID." body="DLC catalog import needs a Steam App ID. Continue now and refresh DLCs from the details page after adding one." />
                                            )}

                                            {draft.steam_app_id && !draft.dlcs.length && !enriching && (
                                                <EmptyCard title="No DLC catalog loaded." body="Steam did not return DLCs for this game yet. The full catalog will still be imported locally when the game is saved." />
                                            )}

                                            {draft.dlcs.length > 0 && (
                                                <>
                                                    <div className="grid gap-4 rounded-[28px] border border-black/10 bg-white/70 p-4 md:grid-cols-[1fr_auto] md:items-center">
                                                        <TextInput value={dlcQuery} onChange={(event) => setDlcQuery(event.target.value)} placeholder="Search DLCs..." />
                                                        <div className="flex flex-wrap gap-2">
                                                            <Pill active>{ownedDlcCount} marked</Pill>
                                                            <Pill muted>{draft.dlcs.length} imported on save</Pill>
                                                        </div>
                                                    </div>

                                                    <div className="grid max-h-[500px] gap-3 overflow-y-auto rounded-[28px] border border-black/10 bg-white/70 p-3">
                                                        {filteredDlcs.map((dlc) => {
                                                            const ownedDlc = ownedDlcFor(dlc.steam_app_id);
                                                            const selected = !!ownedDlc;
                                                            const acquisitionType = ownedDlc?.acquisition_type ?? "Owned";
                                                            const included = ["Edition Included", "Free"].includes(acquisitionType);

                                                            return (
                                                                <div key={dlc.steam_app_id} className={`grid gap-4 rounded-[22px] border p-3 transition ${selected ? "border-black bg-white" : "border-black/5 bg-white/55"} lg:grid-cols-[1fr_auto] lg:items-center`}>
                                                                    <div className="min-w-0">
                                                                        <div className="truncate text-lg font-black tracking-[-0.035em]">{dlc.title}</div>
                                                                        <div className="mt-1 text-sm font-bold text-black/45">{money(dlc.base_price)}</div>
                                                                    </div>
                                                                    <div className="grid gap-2 sm:grid-cols-[150px_120px_150px_auto]">
                                                                        <Select value={selected ? acquisitionType : "Not Owned"} onChange={(event) => event.target.value === "Not Owned" ? removeOwnedDlc(dlc.steam_app_id) : updateOwnedDlc(dlc.steam_app_id, { acquisition_type: event.target.value as OwnedDlcDraft["acquisition_type"] })}>
                                                                            <option value="Not Owned">Not Owned</option>
                                                                            {dlcAcquisitionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                                                                        </Select>
                                                                        <TextInput value={ownedDlc?.purchased_price ?? ""} onChange={(event) => updateOwnedDlc(dlc.steam_app_id, { purchased_price: event.target.value })} type="number" step="0.01" placeholder="Paid" disabled={!selected || included} />
                                                                        <TextInput value={ownedDlc?.purchased_at ?? ""} onChange={(event) => updateOwnedDlc(dlc.steam_app_id, { purchased_at: event.target.value })} type="date" disabled={!selected} />
                                                                        <button type="button" onClick={() => selected ? removeOwnedDlc(dlc.steam_app_id) : updateOwnedDlc(dlc.steam_app_id, { acquisition_type: "Owned" })} className={`rounded-2xl px-4 py-3 text-sm font-black ${selected ? "bg-black text-white" : "bg-black/5 text-black/55"}`}>
                                                                            {selected ? "Marked" : "Own"}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {!filteredDlcs.length && <Notice>No DLC matches the current search.</Notice>}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {step.key === "progress" && (
                                        <div className="grid gap-6"><div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Progress</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Track the state.</h3></div><div className="flex flex-wrap gap-2">{availableStatuses.map((item) => <button key={item.id} type="button" onClick={() => chooseStatus(item.id)} className={`rounded-2xl px-5 py-3 text-sm font-black ring-1 ring-black/10 ${draft.status_id === item.id ? "" : "bg-white text-black/55"}`} style={draft.status_id === item.id ? statusPillStyle({ status: item.name, status_color_hex: item.color_hex }) : undefined}>{item.name}</button>)}</div><div className="grid gap-4 rounded-[28px] border border-black/10 bg-white/70 p-5 md:grid-cols-2"><Field label="Playtime Hours"><TextInput value={draft.playtime_hours} onChange={(event) => update("playtime_hours", event.target.value)} type="number" step="0.1" /></Field><Field label="Earned Achievements"><TextInput value={draft.earned_achievements} onChange={(event) => update("earned_achievements", event.target.value)} type="number" placeholder={hasAchievements ? `0 / ${draft.total_achievements}` : "No achievements"} /></Field>{status?.name !== "Not Played" && <Field label="First Played"><TextInput value={draft.first_played_at} onChange={(event) => update("first_played_at", event.target.value)} type="date" /></Field>}{status?.name !== "Not Played" && <Field label="Last Played"><TextInput value={draft.last_played_at} onChange={(event) => update("last_played_at", event.target.value)} type="date" /></Field>}{(status?.name === "Completed" || status?.name === "100%") && <Field label="Completed At"><TextInput value={draft.completed_at} onChange={(event) => update("completed_at", event.target.value)} type="date" /></Field>}</div>{!hasAchievements && <Notice>100% is hidden because this game has no achievement total.</Notice>}</div>
                                    )}

                                    {step.key === "review" && <div className="grid gap-6"><div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Review</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Save receipt.</h3></div><div className="rounded-[30px] border border-black/10 bg-white p-6"><h4 className="text-4xl font-black tracking-[-0.06em]">{draft.title}</h4><div className="mt-5 grid gap-3 text-base font-bold text-black/60 md:grid-cols-2"><p><span className="font-black text-black">Source:</span> {sourceName(draft.source)}</p><p><span className="font-black text-black">Platform:</span> {platform?.name || "Missing"}</p><p><span className="font-black text-black">Devices:</span> {selectedDevices.length ? selectedDevices.join(", ") : "Missing"}</p><p><span className="font-black text-black">Ownership:</span> {selectedOwnerships.length ? selectedOwnerships.join(", ") : "Missing"}</p><p><span className="font-black text-black">DLCs marked:</span> {ownedDlcCount}</p><p className="flex items-center gap-2"><span className="font-black text-black">Status:</span> {status ? <span className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]" style={statusPillStyle({ status: status.name, status_color_hex: status.color_hex })}>{status.name}</span> : "Missing"}</p><p><span className="font-black text-black">Playtime:</span> {draft.playtime_hours || 0}h</p><p><span className="font-black text-black">Achievements:</span> {draft.earned_achievements || 0} / {draft.total_achievements || "Unknown"}</p><p><span className="font-black text-black">Base price:</span> {money(draft.base_price_default)}</p></div></div><div className="grid gap-4 md:grid-cols-4"><Metric label="Cover" value={draft.cover_path ? "Uploaded" : coverPreview ? "Provider" : "Missing"} icon={<Package />} /><Metric label="Devices" value={selectedDevices.length} icon={<Layers3 />} /><Metric label="Copies" value={draft.ownership_copies.length} icon={<Database />} /><Metric label="DLCs" value={ownedDlcCount} icon={<Package />} /></div></div>}

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
                        <div className="absolute inset-0 z-10 grid place-items-center bg-black/55 px-5">
                            <section className="w-full max-w-md rounded-[30px] bg-white p-6 text-black shadow-[0_32px_120px_rgb(0_0_0/0.4)]">
                                <div className="text-xs font-black uppercase tracking-[0.24em] text-black/35">Completion date</div>
                                <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">When did you finish it?</h3>
                                <p className="mt-3 text-sm font-bold text-black/50">Today is filled in automatically. Change it if the real completed date is different.</p>
                                <div className="mt-5">
                                    <TextInput value={completionDateDraft} onChange={(event) => setCompletionDateDraft(event.target.value)} type="date" className="w-full border-black/10 bg-[#f4f5ef] text-black" />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button type="button" onClick={() => setPendingStatusId(null)} className="rounded-2xl bg-black/5 px-5 py-3 text-sm font-black text-black/55">Cancel</button>
                                    <button type="button" onClick={applyCompletedStatus} className="rounded-2xl bg-black px-5 py-3 text-sm font-black text-white">Apply</button>
                                </div>
                            </section>
                        </div>
                    )}

                    {duplicateCandidates.length > 0 && (
                        <div className="absolute inset-0 z-10 grid place-items-center bg-black/55 px-5">
                            <section className="w-full max-w-2xl rounded-[30px] bg-white p-6 text-black shadow-[0_32px_120px_rgb(0_0_0/0.4)]">
                                <div className="text-xs font-black uppercase tracking-[0.24em] text-black/35">Possible duplicate</div>
                                <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">This looks like an existing game.</h3>
                                <div className="mt-5 grid gap-3">
                                    {duplicateCandidates.map((game) => (
                                        <button
                                            key={game.id}
                                            type="button"
                                            onClick={() => {
                                                setDraft((current) => ({ ...current, existing_game_id: game.id, create_duplicate_anyway: false }));
                                                setDuplicateCandidates([]);
                                            }}
                                            className="grid grid-cols-[54px_1fr_auto] items-center gap-3 rounded-2xl border border-black/10 bg-[#f8faf4] p-3 text-left hover:border-black"
                                        >
                                            <CoverImage src={game.cover_url ?? ""} className="size-14 rounded-xl" />
                                            <div className="min-w-0">
                                                <div className="truncate text-lg font-black">{game.title}</div>
                                                <div className="mt-1 truncate text-xs font-bold text-black/45">{game.publisher || "Unknown publisher"} · {game.release_year || "Unknown year"}</div>
                                            </div>
                                            <span className="rounded-xl bg-black px-4 py-2 text-xs font-black text-white">Use existing</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-6 flex flex-wrap justify-end gap-3">
                                    <button type="button" onClick={() => setDuplicateCandidates([])} className="rounded-2xl bg-black/5 px-5 py-3 text-sm font-black text-black/55">Go back</button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDuplicateCandidates([]);
                                            void submit(true);
                                        }}
                                        className="rounded-2xl bg-black px-5 py-3 text-sm font-black text-white"
                                    >
                                        Create new anyway
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
