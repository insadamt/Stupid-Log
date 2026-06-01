import { Edit3, RefreshCw, Search, Trash2 } from 'lucide-react';
import { formatMoney, statusTone } from '../formatters';
import { Dlc } from '../types';

export default function DlcsPanel({
    query,
    setQuery,
    filter,
    setFilter,
    refreshingDlcs,
    refreshDlcs,
    dlcErrors,
    filteredDlcs,
    startEditDlc,
    removeDlc,
}: {
    query: string;
    setQuery: (query: string) => void;
    filter: string;
    setFilter: (filter: string) => void;
    refreshingDlcs: boolean;
    refreshDlcs: () => void;
    dlcErrors: Record<string, string>;
    filteredDlcs: Dlc[];
    startEditDlc: (dlc: Dlc) => void;
    removeDlc: (dlc: Dlc) => void;
}) {
    return (
        <article className="grid h-[610px] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-[40px] bg-black p-5 text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
                <div className="mr-auto">
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Expansion Bay</div>
                    <h2 className="mt-1 text-[34px] font-black leading-none tracking-[-0.055em]">DLC Archive</h2>
                </div>
                <label className="flex h-14 min-w-[260px] items-center gap-3 rounded-full bg-white/10 px-5 text-base font-black shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]">
                    <Search size={22} />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search DLCs" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/35" />
                </label>
                <button type="button" onClick={refreshDlcs} disabled={refreshingDlcs} className="flex h-14 items-center gap-2 rounded-full bg-[#b7ff63] px-5 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                    <RefreshCw size={18} className={refreshingDlcs ? 'animate-spin' : ''} />
                    {refreshingDlcs ? 'Refreshing' : 'Refresh'}
                </button>
            </div>
            <div className="flex flex-wrap gap-2 py-4">
                {['All', 'Owned', 'Edition Included', 'Free', 'Not Owned'].map((item) => (
                    <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-5 py-3 text-sm font-black ${filter === item ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/45 hover:text-white'}`}>
                        {item}
                    </button>
                ))}
            </div>
            {dlcErrors.dlcs && <div className="mt-3 rounded-[18px] border border-[#ff6068]/40 bg-[#ff6068]/10 px-4 py-3 text-sm font-black text-[#ff858b]">{dlcErrors.dlcs}</div>}

            <div className="min-h-0 overflow-auto pr-1">
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_150px_112px_88px] gap-3 rounded-[18px] bg-[#b7ff63] px-3 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-black">
                    <span>Title</span>
                    <span>Status</span>
                    <span>Value</span>
                    <span className="text-right">Actions</span>
                </div>
                <div className="mt-3 grid gap-2">
                {filteredDlcs.map((dlc) => (
                    <div key={dlc.id} className="rounded-[20px] border border-white/10 bg-white/[0.06] p-3 text-sm font-black">
                        <div className="grid grid-cols-[minmax(0,1fr)_150px_112px_88px] items-center gap-3">
                            <span className="truncate text-base">{dlc.title}</span>
                            <span className={`rounded-full px-4 py-2 text-center text-xs uppercase tracking-[0.12em] ring-1 ${statusTone(dlc.state)}`}>{dlc.state}</span>
                            <span className="text-right text-white/72">{formatMoney(dlc.purchased_price ?? dlc.base_price)}</span>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => startEditDlc(dlc)} className="grid size-10 place-items-center rounded-2xl bg-white/10 text-white/70 hover:text-white"><Edit3 size={17} /></button>
                                <button type="button" onClick={() => removeDlc(dlc)} disabled={!dlc.owned_dlc_id} className="grid size-10 place-items-center rounded-2xl bg-[#d72835]/90 text-white disabled:opacity-30"><Trash2 size={17} /></button>
                            </div>
                        </div>
                    </div>
                ))}
                {!filteredDlcs.length && <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-8 text-2xl font-black">No DLCs saved for this game.</div>}
                </div>
            </div>
        </article>
    );
}
