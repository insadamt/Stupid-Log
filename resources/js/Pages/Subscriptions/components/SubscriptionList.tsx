import { LockKeyhole, Plus, Search } from 'lucide-react';
import { moneyFormat } from '../../Home/formatters';
import { SubscriptionEntry, SubscriptionFilter } from '../types';

export default function SubscriptionList({
    entries,
    selectedEntryId,
    query,
    filter,
    setQuery,
    setFilter,
    selectEntry,
    startCreate,
}: {
    entries: SubscriptionEntry[];
    selectedEntryId: number | null;
    query: string;
    filter: SubscriptionFilter;
    setQuery: (query: string) => void;
    setFilter: (filter: SubscriptionFilter) => void;
    selectEntry: (entryId: number) => void;
    startCreate: () => void;
}) {
    return (
        <aside className="grid min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] rounded-[34px] bg-black p-5 text-white shadow-[0_24px_70px_rgb(0_0_0/0.2)]">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#b7ff63]/70">Financial entries</p>
                    <h1 className="mt-1 text-4xl font-black tracking-[-0.05em]">Subscriptions</h1>
                </div>
                <button type="button" title="Add subscription" onClick={startCreate} className="grid size-12 place-items-center rounded-[18px] bg-[#b7ff63] text-black">
                    <Plus size={25} strokeWidth={3} />
                </button>
            </header>

            <label className="mt-5 flex h-12 items-center gap-3 rounded-[18px] bg-white/10 px-4 ring-1 ring-white/10">
                <Search size={17} className="text-white/35" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subscriptions" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/30" />
            </label>

            <div className="mt-3 grid grid-cols-3 gap-2">
                {(['all', 'editable', 'locked'] as SubscriptionFilter[]).map((option) => (
                    <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-[16px] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${filter === option ? 'bg-[#b7ff63] text-black' : 'bg-white/8 text-white/45'}`}>
                        {option}
                    </button>
                ))}
            </div>

            <div className="mt-4 min-h-0 space-y-2 overflow-y-auto pr-1">
                {entries.map((entry) => (
                    <button key={entry.id} type="button" onClick={() => selectEntry(entry.id)} className={`w-full rounded-[20px] border p-4 text-left transition ${selectedEntryId === entry.id ? 'border-[#b7ff63] bg-[#b7ff63] text-black' : 'border-white/8 bg-white/7 hover:bg-white/12'}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="truncate font-black">{entry.ownership_type}</p>
                                    {entry.has_locked_years && <LockKeyhole size={13} className="shrink-0" />}
                                </div>
                                <p className="mt-1 text-xs font-bold opacity-50">{entry.started_at} - {entry.finished_at}</p>
                            </div>
                            <span className="shrink-0 font-black">{moneyFormat(entry.amount_paid)}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] opacity-50">
                            <span>{entry.selected_count} games</span>
                            <span>{entry.has_locked_years ? 'Locked' : 'Editable'}</span>
                        </div>
                    </button>
                ))}
                {!entries.length && <p className="rounded-[20px] border border-dashed border-white/12 p-5 text-sm font-bold text-white/35">No subscriptions.</p>}
            </div>
        </aside>
    );
}
