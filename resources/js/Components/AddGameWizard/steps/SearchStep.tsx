import { AlertTriangle, ChevronRight, Loader2, Package, Search } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import BuilderTitle from "../components/BuilderTitle";
import SearchResultCard from "../components/SearchResultCard";
import SourceSwitch from "../components/SourceSwitch";
import { Draft, ProviderMode, WizardSearchResult } from "../types";

export default function SearchStep({
    providerMode,
    setProviderMode,
    searchQuery,
    setSearchQuery,
    selectedResultKey,
    update,
    runSearch,
    searching,
    warnings,
    results,
    manualEntry,
    resultKey,
    selectResult,
}: {
    providerMode: ProviderMode;
    setProviderMode: (mode: ProviderMode) => void;
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;
    selectedResultKey: string;
    update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
    runSearch: (queryInput?: string, provider?: ProviderMode) => Promise<void>;
    searching: boolean;
    warnings: string[];
    results: WizardSearchResult[];
    manualEntry: () => void;
    resultKey: (result: WizardSearchResult) => string;
    selectResult: (result: WizardSearchResult) => Promise<void>;
}) {
    return (
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
    <div className="grid min-h-[220px] place-items-center rounded-[34px] border border-dashed border-black/15 bg-[#eef2ed] p-8 text-center shadow-[inset_0_0_0_1px_rgb(255_255_255/0.45)]">
        <div className="max-w-xl">
            <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-black text-[#b7ff63] shadow-[0_18px_34px_rgb(0_0_0/0.16)]">
                <Package size={26} strokeWidth={3} />
            </div>

            <h4 className="mt-5 text-3xl font-black tracking-[-0.05em]">
                No results.
            </h4>

            <button
                type="button"
                onClick={manualEntry}
                className="mt-5 inline-flex h-[58px] items-center justify-center gap-3 rounded-[22px] bg-black px-8 text-base font-black text-[#b7ff63] shadow-[0_18px_34px_rgb(0_0_0/0.18)] transition hover:-translate-y-0.5"
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
    );
}
