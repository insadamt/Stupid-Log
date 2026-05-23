import { router } from "@inertiajs/react";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Plus,
    Search,
    X,
} from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import {
    ProviderSearchResponse,
    ProviderSearchResult,
    ReferenceData,
} from "../types";

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
const steps = [
    "Search",
    "Metadata",
    "Platform",
    "Devices",
    "Ownership",
    "Progress",
    "Review",
];

function firstByName<T extends { id: number; name: string }>(
    items: T[],
    name: string,
    fallback?: T,
): T {
    return items.find((item) => item.name === name) ?? fallback ?? items[0];
}

export default function AddGameWizard({
    references,
    buttonClassName = "fixed bottom-10 right-10 rounded-[18px] bg-[#b7ff63] px-20 py-8 text-3xl font-black",
    buttonContent,
}: {
    references: ReferenceData;
    buttonClassName?: string;
    buttonContent?: ReactNode;
}) {
    const defaultPlatform = firstByName(
        references.platforms,
        "Steam",
        references.platforms[0],
    );
    const defaultStatus = firstByName(
        references.statuses,
        "Not Played",
        references.statuses[0],
    );
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState<Draft>(() => ({
        title: "",
        source: "manual",
        external_id: "",
        steam_app_id: "",
        cover_url_original: "",
        publisher: "",
        release_date: "",
        description: "",
        total_achievements: "0",
        base_price_default: "",
        platform_id: defaultPlatform?.id ?? 0,
        device_ids: defaultPlatform?.devices[0]
            ? [defaultPlatform.devices[0].id]
            : [],
        ownership_copies: [
            {
                ownership_type_id: defaultPlatform?.ownership_types[0]?.id ?? 0,
                physical_status_id: null,
                edition_name: "",
                base_price: "",
                purchased_price: "",
                purchased_at: "",
            },
        ],
        status_id: defaultStatus?.id ?? 0,
        playtime_hours: "0",
        earned_achievements: "0",
        first_played_at: "",
        last_played_at: "",
        completed_at: "",
    }));
    const [providerResults, setProviderResults] = useState<
        ProviderSearchResult[]
    >([]);
    const [providerWarnings, setProviderWarnings] = useState<string[]>([]);
    const [providerNotice, setProviderNotice] = useState("");
    const [searchingProviders, setSearchingProviders] = useState(false);
    const [searchError, setSearchError] = useState("");

    const platform = useMemo(
        () =>
            references.platforms.find((item) => item.id === draft.platform_id),
        [draft.platform_id, references.platforms],
    );
    const status = useMemo(
        () => references.statuses.find((item) => item.id === draft.status_id),
        [draft.status_id, references.statuses],
    );
    const ownershipById = useMemo(
        () =>
            new Map(
                references.ownershipTypes.map((item) => [item.id, item.name]),
            ),
        [references.ownershipTypes],
    );
    const availableStatuses = useMemo(() => {
        const hasAchievements = Number(draft.total_achievements || 0) > 0;
        return references.statuses.filter(
            (item) => hasAchievements || item.name !== "100%",
        );
    }, [draft.total_achievements, references.statuses]);

    function update<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    async function searchProviders() {
        const query = draft.title.trim();
        if (query.length < 2) return;

        setSearchingProviders(true);
        setSearchError("");

        try {
            const response = await fetch(
                `/provider-search?query=${encodeURIComponent(query)}`,
            );
            if (!response.ok) {
                throw new Error("Provider search failed.");
            }

            const data = (await response.json()) as ProviderSearchResponse;
            setProviderResults(data.results);
            setProviderWarnings(data.warnings);
            setProviderNotice(data.notice);
        } catch (error) {
            setProviderResults([]);
            setProviderWarnings([]);
            setProviderNotice("");
            setSearchError(
                error instanceof Error
                    ? error.message
                    : "Provider search failed.",
            );
        } finally {
            setSearchingProviders(false);
        }
    }

    function selectProviderResult(result: ProviderSearchResult) {
        const basePrice =
            result.base_price_default === null ||
            result.base_price_default === undefined
                ? ""
                : String(result.base_price_default);
        const totalAchievements =
            result.total_achievements === null ||
            result.total_achievements === undefined
                ? "0"
                : String(result.total_achievements);

        setDraft((current) => ({
            ...current,
            title: result.title,
            source: result.source,
            external_id: result.external_id,
            steam_app_id: result.steam_app_id ?? "",
            cover_url_original: result.cover_url_original ?? "",
            publisher: result.publisher ?? "",
            release_date: result.release_date ?? "",
            description: result.description ?? "",
            total_achievements: totalAchievements,
            base_price_default: basePrice,
            ownership_copies: current.ownership_copies.map((copy) => ({
                ...copy,
                base_price: copy.base_price || basePrice,
            })),
        }));
        setStep(1);
    }

    function useManualEntry() {
        setDraft((current) => ({
            ...current,
            source: "manual",
            external_id: "",
            steam_app_id: "",
            cover_url_original: "",
        }));
        setStep(1);
    }

    function choosePlatform(platformId: number) {
        const nextPlatform = references.platforms.find(
            (item) => item.id === platformId,
        );
        if (!nextPlatform) return;

        setDraft((current) => ({
            ...current,
            platform_id: platformId,
            device_ids: nextPlatform.devices[0]
                ? [nextPlatform.devices[0].id]
                : [],
            ownership_copies: [
                {
                    ownership_type_id: nextPlatform.ownership_types[0]?.id ?? 0,
                    physical_status_id: null,
                    edition_name: "",
                    base_price: current.base_price_default,
                    purchased_price: "",
                    purchased_at: "",
                },
            ],
        }));
    }

    function toggleDevice(deviceId: number) {
        setDraft((current) => {
            const exists = current.device_ids.includes(deviceId);
            const device_ids = exists
                ? current.device_ids.filter((id) => id !== deviceId)
                : [...current.device_ids, deviceId];
            return { ...current, device_ids };
        });
    }

    function updateCopy(index: number, patch: Partial<OwnershipCopyDraft>) {
        setDraft((current) => ({
            ...current,
            ownership_copies: current.ownership_copies.map((copy, copyIndex) =>
                copyIndex === index ? { ...copy, ...patch } : copy,
            ),
        }));
    }

    function addCopy() {
        const used = new Set(
            draft.ownership_copies.map((copy) => copy.ownership_type_id),
        );
        const nextType =
            platform?.ownership_types.find((item) => !used.has(item.id)) ??
            platform?.ownership_types[0];
        if (!nextType) return;

        setDraft((current) => ({
            ...current,
            ownership_copies: [
                ...current.ownership_copies,
                {
                    ownership_type_id: nextType.id,
                    physical_status_id: null,
                    edition_name: "",
                    base_price: current.base_price_default,
                    purchased_price: "",
                    purchased_at: "",
                },
            ],
        }));
    }

    function removeCopy(index: number) {
        setDraft((current) => ({
            ...current,
            ownership_copies: current.ownership_copies.filter(
                (_, copyIndex) => copyIndex !== index,
            ),
        }));
    }

    function canContinue() {
        if (step === 0) return draft.title.trim().length >= 2;
        if (step === 2) return Boolean(draft.platform_id);
        if (step === 3) return draft.device_ids.length > 0;
        if (step === 4) {
            const ids = draft.ownership_copies.map(
                (copy) => copy.ownership_type_id,
            );
            const unique = new Set(ids);
            return (
                draft.ownership_copies.length > 0 &&
                unique.size === ids.length &&
                draft.ownership_copies.every((copy) => {
                    const name = ownershipById.get(copy.ownership_type_id);
                    return (
                        !name ||
                        !physicalLike.includes(name) ||
                        Boolean(copy.physical_status_id)
                    );
                })
            );
        }
        if (step === 5) {
            const total = Number(draft.total_achievements || 0);
            const earned = Number(draft.earned_achievements || 0);
            return (
                earned <= total &&
                (status?.name !== "100%" || (total > 0 && earned === total))
            );
        }
        return true;
    }

    function next() {
        if (canContinue())
            setStep((current) => Math.min(current + 1, steps.length - 1));
    }

    function submit() {
        const externalIds: Record<string, string> = {};
        if (draft.source === "igdb" && draft.external_id) {
            externalIds.igdb = draft.external_id;
        }
        if (draft.source === "steam" && draft.external_id) {
            externalIds.steam = draft.external_id;
        }
        if (draft.steam_app_id) {
            externalIds.steam = draft.steam_app_id;
        }

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
                total_achievements: Number(draft.total_achievements || 0),
                base_price_default:
                    draft.base_price_default === ""
                        ? null
                        : Number(draft.base_price_default),
                create_duplicate_anyway: true,
            },
            platform_id: draft.platform_id,
            device_ids: draft.device_ids,
            ownership_copies: draft.ownership_copies.map((copy) => ({
                ownership_type_id: copy.ownership_type_id,
                physical_status_id: copy.physical_status_id,
                edition_name: copy.edition_name || null,
                base_price:
                    copy.base_price === "" ? null : Number(copy.base_price),
                purchased_price:
                    copy.purchased_price === ""
                        ? null
                        : Number(copy.purchased_price),
                purchased_at: copy.purchased_at || null,
            })),
            progress: {
                status_id: draft.status_id,
                playtime_hours: Number(draft.playtime_hours || 0),
                earned_achievements:
                    draft.earned_achievements === ""
                        ? null
                        : Number(draft.earned_achievements),
                first_played_at: draft.first_played_at || null,
                last_played_at: draft.last_played_at || null,
                completed_at: draft.completed_at || null,
            },
        });
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={buttonClassName}
            >
                {buttonContent ?? (
                    <span className="flex h-full w-full items-center justify-center gap-4">
                        <span className="grid size-11 place-items-center rounded-2xl bg-black text-[#b7ff63]">
                            <Plus size={28} strokeWidth={4} />
                        </span>
                        <span>Add Game</span>
                    </span>
                )}
            </button>
            {open && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4">
                    <section className="grid max-h-[92vh] w-full max-w-6xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-[34px] bg-[#b7ff63] shadow-2xl">
                        <header className="flex items-center justify-between border-b-4 border-white/70 px-8 py-6">
                            <div>
                                <h2 className="text-4xl font-black">
                                    Add Game
                                </h2>
                                <div className="mt-3 flex gap-2">
                                    {steps.map((label, index) => (
                                        <button
                                            key={label}
                                            onClick={() =>
                                                index <= step && setStep(index)
                                            }
                                            className={`h-3 w-14 rounded-full ${index <= step ? "bg-black" : "bg-white/70"}`}
                                            aria-label={label}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-5">
                                <span className="rounded-full bg-black px-5 py-2 text-lg font-black text-white">
                                    {steps[step]}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="rounded-full bg-black p-3 text-white"
                                    aria-label="Close wizard"
                                >
                                    <X />
                                </button>
                            </div>
                        </header>

                        <div className="sl-scrollbar overflow-auto p-8">
                            {step === 0 && (
                                <div className="grid gap-7">
                                    <label className="flex h-20 items-center rounded-full border-4 border-black/25 bg-white/40 px-8 text-3xl font-black">
                                        <input
                                            value={draft.title}
                                            onChange={(event) =>
                                                update(
                                                    "title",
                                                    event.target.value,
                                                )
                                            }
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    event.preventDefault();
                                                    void searchProviders();
                                                }
                                            }}
                                            placeholder="Search or type game title"
                                            className="min-w-0 flex-1 bg-transparent outline-none"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void searchProviders()
                                            }
                                            disabled={
                                                searchingProviders ||
                                                draft.title.trim().length < 2
                                            }
                                            className="grid size-14 place-items-center rounded-full bg-black text-white disabled:opacity-40"
                                            aria-label="Search providers"
                                        >
                                            <Search size={34} />
                                        </button>
                                    </label>

                                    <div className="grid grid-cols-[1fr_auto] items-center gap-5 rounded-[28px] bg-white/45 p-6">
                                        <div>
                                            <div className="text-2xl font-black">
                                                IGDB search runs first. Steam is
                                                used as fallback and enrichment.
                                            </div>
                                            <div className="mt-2 text-lg font-black text-black/55">
                                                Manual entry stays available
                                                because your saved data is final.
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={useManualEntry}
                                            className="rounded-[20px] bg-black px-7 py-4 text-xl font-black text-white"
                                        >
                                            Manual Entry
                                        </button>
                                    </div>

                                    {searchingProviders && (
                                        <div className="rounded-[24px] bg-black px-7 py-5 text-2xl font-black text-white">
                                            Searching providers...
                                        </div>
                                    )}

                                    {searchError && (
                                        <div className="rounded-[24px] bg-[#ff3038] px-7 py-5 text-2xl font-black text-white">
                                            {searchError}
                                        </div>
                                    )}

                                    {providerWarnings.length > 0 && (
                                        <div className="grid gap-2 rounded-[24px] bg-white/55 px-7 py-5 text-lg font-black text-black/65">
                                            {providerWarnings.map(
                                                (warning) => (
                                                    <div key={warning}>
                                                        {warning}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}

                                    {providerResults.length > 0 && (
                                        <div className="grid max-h-[430px] gap-4 overflow-auto pr-2">
                                            {providerResults.map((result) => (
                                                <button
                                                    key={`${result.source}-${result.external_id}`}
                                                    type="button"
                                                    onClick={() =>
                                                        selectProviderResult(
                                                            result,
                                                        )
                                                    }
                                                    className="grid grid-cols-[92px_1fr_auto] items-center gap-5 rounded-[24px] bg-white/70 p-4 text-left shadow-[0_12px_26px_rgb(0_0_0/0.08)] transition hover:-translate-y-0.5 hover:bg-white"
                                                >
                                                    {result.cover_url_original ? (
                                                        <img
                                                            src={
                                                                result.cover_url_original
                                                            }
                                                            alt=""
                                                            className="h-[124px] w-[92px] rounded-[16px] object-cover"
                                                        />
                                                    ) : (
                                                        <div className="grid h-[124px] w-[92px] place-items-center rounded-[16px] bg-black/10 text-sm font-black text-black/45">
                                                            No Cover
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="truncate text-3xl font-black">
                                                            {result.title}
                                                        </div>
                                                        <div className="mt-2 truncate text-lg font-black text-black/55">
                                                            {result.publisher ||
                                                                "Unknown Publisher"}
                                                            {result.release_date
                                                                ? ` | ${result.release_date}`
                                                                : ""}
                                                        </div>
                                                        {result.steam_app_id && (
                                                            <div className="mt-2 text-base font-black text-black/45">
                                                                Steam App{" "}
                                                                {
                                                                    result.steam_app_id
                                                                }
                                                            </div>
                                                        )}
                                                        {(result.base_price_default !==
                                                            null ||
                                                            result.total_achievements !==
                                                                null) && (
                                                            <div className="mt-2 text-base font-black text-black/45">
                                                                {result.base_price_default !==
                                                                null
                                                                    ? `$${result.base_price_default}`
                                                                    : "Price unknown"}
                                                                {" | "}
                                                                {result.total_achievements ??
                                                                    0}{" "}
                                                                achievements
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="rounded-full bg-black px-5 py-3 text-lg font-black uppercase text-white">
                                                        {result.source}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {!searchingProviders &&
                                        providerNotice &&
                                        providerResults.length === 0 && (
                                            <div className="rounded-[24px] bg-white/55 px-7 py-5 text-xl font-black text-black/60">
                                                {providerNotice}
                                            </div>
                                        )}
                                </div>
                            )}

                            {step === 1 && (
                                <div className="grid grid-cols-[260px_1fr] gap-7">
                                    {draft.cover_url_original ? (
                                        <img
                                            src={draft.cover_url_original}
                                            alt=""
                                            className="h-[370px] rounded-[26px] bg-white object-cover shadow-xl"
                                        />
                                    ) : (
                                        <div className="sl-cover-art h-[370px] rounded-[26px] bg-white shadow-xl" />
                                    )}
                                    <div className="grid gap-5">
                                        <div className="flex items-center gap-3">
                                            <span className="rounded-full bg-black px-5 py-2 text-sm font-black uppercase text-white">
                                                {draft.source}
                                            </span>
                                            {draft.steam_app_id && (
                                                <span className="rounded-full bg-white/65 px-5 py-2 text-sm font-black text-black/55">
                                                    Steam App{" "}
                                                    {draft.steam_app_id}
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            value={draft.title}
                                            onChange={(event) =>
                                                update(
                                                    "title",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Title"
                                            className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black"
                                        />
                                        <input
                                            value={draft.publisher}
                                            onChange={(event) =>
                                                update(
                                                    "publisher",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Publisher"
                                            className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black"
                                        />
                                        <div className="grid grid-cols-3 gap-5">
                                            <input
                                                value={draft.release_date}
                                                onChange={(event) =>
                                                    update(
                                                        "release_date",
                                                        event.target.value,
                                                    )
                                                }
                                                type="date"
                                                className="rounded-2xl border-4 border-black/20 px-5 py-4 text-xl font-black"
                                            />
                                            <input
                                                value={draft.total_achievements}
                                                onChange={(event) =>
                                                    update(
                                                        "total_achievements",
                                                        event.target.value,
                                                    )
                                                }
                                                type="number"
                                                min="0"
                                                placeholder="Achievements"
                                                className="rounded-2xl border-4 border-black/20 px-5 py-4 text-xl font-black"
                                            />
                                            <input
                                                value={draft.base_price_default}
                                                onChange={(event) =>
                                                    update(
                                                        "base_price_default",
                                                        event.target.value,
                                                    )
                                                }
                                                type="number"
                                                step="0.01"
                                                placeholder="Base price"
                                                className="rounded-2xl border-4 border-black/20 px-5 py-4 text-xl font-black"
                                            />
                                        </div>
                                        <textarea
                                            value={draft.description}
                                            onChange={(event) =>
                                                update(
                                                    "description",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Description"
                                            className="min-h-36 rounded-2xl border-4 border-black/20 px-5 py-4 text-xl font-black"
                                        />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="grid grid-cols-4 gap-4">
                                    {references.platforms.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() =>
                                                choosePlatform(item.id)
                                            }
                                            className={`rounded-[22px] px-6 py-6 text-2xl font-black ${draft.platform_id === item.id ? "bg-black text-white" : "bg-white/55"}`}
                                        >
                                            {item.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="grid grid-cols-4 gap-4">
                                    {platform?.devices.map((device) => (
                                        <button
                                            key={device.id}
                                            onClick={() =>
                                                toggleDevice(device.id)
                                            }
                                            className={`rounded-[22px] px-6 py-5 text-xl font-black ${draft.device_ids.includes(device.id) ? "bg-black text-white" : "bg-white/55"}`}
                                        >
                                            {device.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-5">
                                    {draft.ownership_copies.map(
                                        (copy, index) => {
                                            const ownershipName =
                                                ownershipById.get(
                                                    copy.ownership_type_id,
                                                );
                                            const needsPhysicalStatus =
                                                ownershipName
                                                    ? physicalLike.includes(
                                                          ownershipName,
                                                      )
                                                    : false;

                                            return (
                                                <div
                                                    key={index}
                                                    className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 rounded-[24px] bg-white/45 p-5"
                                                >
                                                    <select
                                                        value={
                                                            copy.ownership_type_id
                                                        }
                                                        onChange={(event) =>
                                                            updateCopy(index, {
                                                                ownership_type_id:
                                                                    Number(
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    ),
                                                                physical_status_id:
                                                                    null,
                                                            })
                                                        }
                                                        className="rounded-2xl px-4 py-4 text-lg font-black"
                                                    >
                                                        {platform?.ownership_types.map(
                                                            (item) => (
                                                                <option
                                                                    key={
                                                                        item.id
                                                                    }
                                                                    value={
                                                                        item.id
                                                                    }
                                                                >
                                                                    {item.name}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                    <input
                                                        value={
                                                            copy.edition_name
                                                        }
                                                        onChange={(event) =>
                                                            updateCopy(index, {
                                                                edition_name:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        placeholder="Edition"
                                                        className="rounded-2xl px-4 py-4 text-lg font-black"
                                                    />
                                                    <input
                                                        value={copy.base_price}
                                                        onChange={(event) =>
                                                            updateCopy(index, {
                                                                base_price:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Base price"
                                                        className="rounded-2xl px-4 py-4 text-lg font-black"
                                                    />
                                                    <input
                                                        value={
                                                            copy.purchased_price
                                                        }
                                                        onChange={(event) =>
                                                            updateCopy(index, {
                                                                purchased_price:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Paid"
                                                        className="rounded-2xl px-4 py-4 text-lg font-black"
                                                    />
                                                    <button
                                                        onClick={() =>
                                                            removeCopy(index)
                                                        }
                                                        disabled={
                                                            draft
                                                                .ownership_copies
                                                                .length === 1
                                                        }
                                                        className="rounded-2xl bg-[#ff3038] px-5 text-lg font-black text-white disabled:opacity-40"
                                                    >
                                                        Remove
                                                    </button>
                                                    {needsPhysicalStatus && (
                                                        <select
                                                            value={
                                                                copy.physical_status_id ??
                                                                ""
                                                            }
                                                            onChange={(event) =>
                                                                updateCopy(
                                                                    index,
                                                                    {
                                                                        physical_status_id:
                                                                            Number(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            ) ||
                                                                            null,
                                                                    },
                                                                )
                                                            }
                                                            className="col-span-2 rounded-2xl px-4 py-4 text-lg font-black"
                                                        >
                                                            <option value="">
                                                                Physical status
                                                                required
                                                            </option>
                                                            {references.physicalStatuses.map(
                                                                (item) => (
                                                                    <option
                                                                        key={
                                                                            item.id
                                                                        }
                                                                        value={
                                                                            item.id
                                                                        }
                                                                    >
                                                                        {
                                                                            item.name
                                                                        }
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                    )}
                                                    <input
                                                        value={
                                                            copy.purchased_at
                                                        }
                                                        onChange={(event) =>
                                                            updateCopy(index, {
                                                                purchased_at:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                        type="date"
                                                        className="rounded-2xl px-4 py-4 text-lg font-black"
                                                    />
                                                </div>
                                            );
                                        },
                                    )}
                                    <button
                                        onClick={addCopy}
                                        className="flex items-center gap-3 rounded-[22px] bg-black px-8 py-5 text-2xl font-black text-white"
                                    >
                                        <Plus /> Add Ownership Copy
                                    </button>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="grid grid-cols-2 gap-5">
                                    <select
                                        value={draft.status_id}
                                        onChange={(event) =>
                                            update(
                                                "status_id",
                                                Number(event.target.value),
                                            )
                                        }
                                        className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black"
                                    >
                                        {availableStatuses.map((item) => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        value={draft.playtime_hours}
                                        onChange={(event) =>
                                            update(
                                                "playtime_hours",
                                                event.target.value,
                                            )
                                        }
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        placeholder="Playtime hours"
                                        className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black"
                                    />
                                    <input
                                        value={draft.earned_achievements}
                                        onChange={(event) =>
                                            update(
                                                "earned_achievements",
                                                event.target.value,
                                            )
                                        }
                                        type="number"
                                        min="0"
                                        placeholder="Earned achievements"
                                        className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black"
                                    />
                                    <input
                                        value={draft.first_played_at}
                                        onChange={(event) =>
                                            update(
                                                "first_played_at",
                                                event.target.value,
                                            )
                                        }
                                        type="date"
                                        className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black"
                                    />
                                    <input
                                        value={draft.last_played_at}
                                        onChange={(event) =>
                                            update(
                                                "last_played_at",
                                                event.target.value,
                                            )
                                        }
                                        type="date"
                                        className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black"
                                    />
                                    <input
                                        value={draft.completed_at}
                                        onChange={(event) =>
                                            update(
                                                "completed_at",
                                                event.target.value,
                                            )
                                        }
                                        type="date"
                                        className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black"
                                    />
                                </div>
                            )}

                            {step === 6 && (
                                <div className="grid grid-cols-[260px_1fr] gap-7">
                                    {draft.cover_url_original ? (
                                        <img
                                            src={draft.cover_url_original}
                                            alt=""
                                            className="h-[370px] rounded-[26px] bg-white object-cover shadow-xl"
                                        />
                                    ) : (
                                        <div className="sl-cover-art h-[370px] rounded-[26px] bg-white shadow-xl" />
                                    )}
                                    <div className="rounded-[28px] bg-white/45 p-7 text-2xl font-black">
                                        <div className="mb-4 flex items-center gap-3">
                                            <span className="rounded-full bg-black px-5 py-2 text-sm font-black uppercase text-white">
                                                {draft.source}
                                            </span>
                                            {draft.steam_app_id && (
                                                <span className="rounded-full bg-white/65 px-5 py-2 text-sm font-black text-black/55">
                                                    Steam App{" "}
                                                    {draft.steam_app_id}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-5xl font-black">
                                            {draft.title}
                                        </h3>
                                        <p className="mt-2">
                                            {draft.publisher ||
                                                "Unknown Publisher"}
                                        </p>
                                        <div className="mt-8 grid grid-cols-2 gap-4 text-xl">
                                            <div>
                                                Platform: {platform?.name}
                                            </div>
                                            <div>Status: {status?.name}</div>
                                            <div>
                                                Devices:{" "}
                                                {draft.device_ids.length}
                                            </div>
                                            <div>
                                                Ownership:{" "}
                                                {draft.ownership_copies.length}
                                            </div>
                                            <div>
                                                Achievements:{" "}
                                                {draft.earned_achievements || 0}{" "}
                                                /{" "}
                                                {draft.total_achievements || 0}
                                            </div>
                                            <div>
                                                Playtime:{" "}
                                                {draft.playtime_hours || 0} H
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <footer className="flex items-center justify-between border-t-4 border-white/70 px-8 py-6">
                            <button
                                onClick={() =>
                                    setStep((current) =>
                                        Math.max(current - 1, 0),
                                    )
                                }
                                disabled={step === 0}
                                className="flex items-center gap-3 rounded-[20px] bg-white/65 px-8 py-4 text-2xl font-black disabled:opacity-40"
                            >
                                <ChevronLeft /> Back
                            </button>
                            {step < steps.length - 1 ? (
                                <button
                                    onClick={next}
                                    disabled={!canContinue()}
                                    className="flex items-center gap-3 rounded-[20px] bg-black px-8 py-4 text-2xl font-black text-white disabled:opacity-40"
                                >
                                    Next <ChevronRight />
                                </button>
                            ) : (
                                <button
                                    onClick={submit}
                                    disabled={!canContinue()}
                                    className="flex items-center gap-3 rounded-[20px] bg-black px-8 py-4 text-2xl font-black text-white disabled:opacity-40"
                                >
                                    <Check /> Save Game
                                </button>
                            )}
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
}
