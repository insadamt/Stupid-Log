import { Edit3, LockKeyhole, Trash2 } from 'lucide-react';
import { moneyFormat } from '../../Home/formatters';
import { SubscriptionEntry, SubscriptionOwnershipCopy, SubscriptionYear } from '../types';

export default function SubscriptionInspector({
    entry,
    ownershipCopies,
    startEdit,
    requestDelete,
    startCreate,
}: {
    entry: SubscriptionEntry | null;
    ownershipCopies: SubscriptionOwnershipCopy[];
    startEdit: (entry: SubscriptionEntry) => void;
    requestDelete: (entry: SubscriptionEntry) => void;
    startCreate: () => void;
}) {
    if (!entry) {
        return (
            <section className="grid min-h-0 place-items-center rounded-[34px] border border-dashed border-black/12 bg-[#eef4eb] p-8 text-center">
                <div>
                    <p className="text-3xl font-black">No subscription selected</p>
                    <button type="button" onClick={startCreate} className="mt-5 rounded-[18px] bg-black px-6 py-3 font-black text-white">Add subscription</button>
                </div>
            </section>
        );
    }

    const selectedCopies = ownershipCopies.filter((copy) => entry.selected_ownership_copy_ids.includes(copy.id));

    return (
        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[34px] bg-[#eef4eb] shadow-[0_20px_55px_rgb(9_14_12/0.08)]">
            <header className="flex items-start justify-between gap-5 border-b border-black/8 bg-white/65 px-7 py-6">
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-black/40">
                        {entry.has_locked_years && <LockKeyhole size={14} />}
                        {entry.has_locked_years ? 'Partially locked subscription' : 'Editable subscription'}
                    </div>
                    <div className="mt-2 flex items-end gap-4">
                        <h2 className="text-5xl font-black tracking-[-0.06em]">{entry.ownership_type}</h2>
                        <span className="mb-1 text-2xl font-black text-black/45">{moneyFormat(entry.amount_paid)}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-black/45">{entry.started_at} - {entry.finished_at}</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" title="Edit subscription" onClick={() => startEdit(entry)} className="grid size-11 place-items-center rounded-[16px] bg-black text-white"><Edit3 size={18} /></button>
                    <button type="button" title="Delete subscription" disabled={entry.has_locked_years} onClick={() => requestDelete(entry)} className="grid size-11 place-items-center rounded-[16px] bg-[#fff0f0] text-[#d92d20] disabled:cursor-not-allowed disabled:opacity-35"><Trash2 size={18} /></button>
                </div>
            </header>

            <div className="min-h-0 overflow-y-auto p-6">
                <div className="grid gap-3">
                    {entry.years.map((year) => <YearTimelineRow key={year.id} year={year} ownershipCopies={ownershipCopies} />)}
                </div>

                <section className="mt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/35">Global membership</p>
                            <h3 className="mt-1 text-2xl font-black">{selectedCopies.length} selected games</h3>
                        </div>
                    </div>
                    <div className="mt-3 grid gap-2 xl:grid-cols-2">
                        {selectedCopies.map((copy) => (
                            <div key={copy.id} className="flex items-center gap-3 rounded-[20px] bg-white/75 p-3 ring-1 ring-black/7">
                                <div className="size-12 overflow-hidden rounded-[14px] bg-black/8">
                                    {copy.cover_url && <img src={copy.cover_url} alt="" className="size-full object-cover" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-black">{copy.game_title}</p>
                                    <p className="text-xs font-bold text-black/40">{copy.platform}</p>
                                </div>
                                {entry.locked_ownership_copy_ids.includes(copy.id) && <LockKeyhole size={15} />}
                            </div>
                        ))}
                        {!selectedCopies.length && <p className="rounded-[20px] bg-white/65 p-5 text-sm font-bold text-black/40">No games selected.</p>}
                    </div>
                </section>
            </div>
        </section>
    );
}

function YearTimelineRow({ year, ownershipCopies }: { year: SubscriptionYear; ownershipCopies: SubscriptionOwnershipCopy[] }) {
    return (
        <article className="grid grid-cols-[110px_minmax(0,1fr)] overflow-hidden rounded-[24px] bg-black text-white">
            <div className="grid place-items-center border-r border-white/10 p-4 text-center">
                <p className="text-3xl font-black">{year.year}</p>
                <span className={`mt-2 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${year.is_locked ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/55'}`}>
                    {year.is_locked ? 'Locked' : 'Editable'}
                </span>
            </div>
            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">Yearly budget</p>
                        <p className="mt-1 text-2xl font-black">{moneyFormat(year.amount_allocated)}</p>
                    </div>
                    {year.is_locked && <p className="text-xs font-black text-[#b7ff63]">Locked by {year.locked_by_snapshot_year} snapshot</p>}
                </div>
                <div className="mt-4 grid gap-2 xl:grid-cols-2">
                    {year.allocations.map((allocation) => {
                        const copy = ownershipCopies.find((candidate) => candidate.id === allocation.ownership_copy_id);
                        return (
                            <div key={allocation.ownership_copy_id} className="flex justify-between gap-3 rounded-[16px] bg-white/8 px-4 py-3 text-sm font-black">
                                <span className="truncate">{copy?.game_title ?? 'Unavailable game'}</span>
                                <span className="shrink-0 text-[#b7ff63]">{moneyFormat(allocation.allocated_amount)}</span>
                            </div>
                        );
                    })}
                    {!year.allocations.length && <p className="rounded-[16px] bg-white/8 px-4 py-3 text-sm font-bold text-white/40">Unallocated.</p>}
                </div>
            </div>
        </article>
    );
}
