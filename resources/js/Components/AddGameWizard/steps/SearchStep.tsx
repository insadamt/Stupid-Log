import { AlertTriangle, ChevronRight, Loader2, Package, Search } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import SearchResultCard from "../components/SearchResultCard";
import SourceSwitch from "../components/SourceSwitch";
import { Draft, ProviderMode, WizardSearchResult } from "../types";

const providerLabel = (provider: ProviderMode) => provider === "igdb" ? "IGDB" : "Steam";

export default function SearchStep({ providerMode, setProviderMode, searchQuery, setSearchQuery, selectedResultKey, update, runSearch, searching, warnings, results, manualEntry, resultKey, selectResult }: { providerMode: ProviderMode; setProviderMode: (mode: ProviderMode) => void; searchQuery: string; setSearchQuery: Dispatch<SetStateAction<string>>; selectedResultKey: string; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void; runSearch: (queryInput?: string, provider?: ProviderMode) => Promise<void>; searching: boolean; warnings: string[]; results: WizardSearchResult[]; manualEntry: () => void; resultKey: (result: WizardSearchResult) => string; selectResult: (result: WizardSearchResult) => Promise<void>; }) {
    return (
        <div className="grid gap-5 text-white">
            <section className="rounded-[28px] border border-white/10 bg-[#0b110f] p-5 shadow-[0_24px_70px_rgb(0_0_0/0.28)]">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)] xl:items-end">
                    <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#b7ff63]/65">Search</div>
                        <h3 className="mt-2 text-[42px] font-black leading-none tracking-[-0.06em] text-white">Find the game.</h3>
                        <p className="mt-3 text-sm font-bold text-white/45">Search a provider or create the record manually.</p>
                    </div>
                    <SourceSwitch providerMode={providerMode} setProviderMode={setProviderMode} manualEntry={manualEntry} />
                </div>
                <div className="mt-5 grid gap-3 rounded-[22px] border border-white/10 bg-black p-2 sm:grid-cols-[1fr_auto]">
                    <label className="flex h-[64px] items-center gap-4 rounded-[18px] bg-[#eff5ee] px-5 text-black">
                        <Search className="size-6 shrink-0 text-black/35" strokeWidth={3} />
                        <input value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); if (!selectedResultKey) update("title", event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void runSearch(searchQuery, providerMode); } }} placeholder={`Search ${providerLabel(providerMode)}...`} className="min-w-0 flex-1 bg-transparent text-xl font-black outline-none placeholder:text-black/30 md:text-2xl" autoFocus />
                    </label>
                    <button type="button" onClick={() => void runSearch(searchQuery, providerMode)} disabled={searching || searchQuery.trim().length < 2} className="flex h-[64px] items-center justify-center gap-3 rounded-[18px] bg-[#b7ff63] px-8 text-base font-black text-black transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40">{searching ? <><Loader2 className="animate-spin" size={20} />Scanning</> : <>Scan<ChevronRight size={22} strokeWidth={3} /></>}</button>
                </div>
            </section>
            {warnings.length > 0 && <div className="rounded-[22px] border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm font-black text-red-100"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div className="space-y-1">{warnings.slice(0, 3).map((warning) => <p key={warning}>{warning}</p>)}</div></div></div>}
            {results.length === 0 && !searching && <div className="grid min-h-[210px] place-items-center rounded-[28px] border border-dashed border-white/12 bg-white/[0.04] p-8 text-center"><div className="max-w-xl"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#b7ff63] text-black"><Package size={24} strokeWidth={3} /></div><h4 className="mt-4 text-2xl font-black tracking-[-0.04em] text-white">Search or enter it manually.</h4><p className="mt-2 text-sm font-bold text-white/40">Type at least two characters to scan {providerLabel(providerMode)}.</p><button type="button" onClick={manualEntry} className="mt-5 inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-[#b7ff63]/40 bg-black px-6 text-sm font-black text-[#b7ff63] transition hover:bg-[#b7ff63] hover:text-black">Manual Entry<ChevronRight size={20} strokeWidth={3} /></button></div></div>}
            {results.length > 0 && <section className="rounded-[28px] border border-white/10 bg-[#0b110f] p-4"><div className="mb-4 flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b7ff63]/55">{providerLabel(providerMode)} Results</p><h4 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">Pick the match.</h4></div><div className="flex items-center gap-2"><button type="button" onClick={manualEntry} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-white/70">Manual Entry</button><span className="rounded-full bg-[#b7ff63] px-4 py-2 text-xs font-black text-black">{results.length} loaded</span></div></div><div className="grid max-h-[420px] gap-3 overflow-y-auto pr-2 xl:grid-cols-2">{results.map((result) => <SearchResultCard key={resultKey(result)} result={result} selected={selectedResultKey === resultKey(result)} onSelect={() => void selectResult(result)} />)}</div></section>}
        </div>
    );
}
