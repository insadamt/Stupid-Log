import { Edit3, LockKeyhole, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { moneyFormat } from '../../Home/formatters';
import { InAppPurchase } from '../types';

type PurchaseFilter = 'all' | 'editable' | 'locked';

export default function PurchasesPanel({
    purchases,
    totalValue,
    closedFinancialYear,
    startAddPurchase,
    startEditPurchase,
    requestDeletePurchase,
}: {
    purchases: InAppPurchase[];
    totalValue: number;
    closedFinancialYear: number | null;
    startAddPurchase: () => void;
    startEditPurchase: (purchase: InAppPurchase) => void;
    requestDeletePurchase: (purchase: InAppPurchase) => void;
}) {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<PurchaseFilter>('all');
    const visiblePurchases = useMemo(() => purchases.filter((purchase) => {
        const matchesQuery = purchase.title.toLowerCase().includes(query.toLowerCase().trim());
        const matchesFilter = filter === 'all'
            || (filter === 'locked' && purchase.is_locked)
            || (filter === 'editable' && !purchase.is_locked);
        return matchesQuery && matchesFilter;
    }), [filter, purchases, query]);

    return (
        <article className="grid h-[610px] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-[40px] bg-black p-5 text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
                <div className="mr-auto">
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Game Spending</div>
                    <h2 className="mt-1 text-[34px] font-black leading-none tracking-[-0.055em]">In-App Purchases</h2>
                    <p className="mt-2 text-sm font-black text-white/45">
                        Total paid <span className="ml-1 text-[#b7ff63]">{moneyFormat(totalValue)}</span>
                    </p>
                </div>
                <label className="flex h-14 min-w-[260px] items-center gap-3 rounded-full bg-white/10 px-5 text-base font-black shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]">
                    <Search size={22} />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search purchases" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/35" />
                </label>
                <button type="button" onClick={startAddPurchase} className="flex h-14 items-center gap-2 rounded-full bg-[#b7ff63] px-5 text-sm font-black uppercase tracking-[0.14em] text-black">
                    <Plus size={18} strokeWidth={3} />
                    Add Purchase
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 py-4">
                <div className="flex flex-wrap gap-2">
                    {(['all', 'editable', 'locked'] as PurchaseFilter[]).map((option) => (
                        <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-full px-5 py-3 text-sm font-black capitalize ${filter === option ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/45 hover:text-white'}`}>
                            {option}
                        </button>
                    ))}
                </div>
                {closedFinancialYear !== null && (
                    <p className="ml-auto text-xs font-black text-white/35">{closedFinancialYear} and earlier are closed.</p>
                )}
            </div>

            <div className="min-h-0 overflow-auto pr-1">
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_128px_190px_112px_92px] gap-3 rounded-[18px] bg-[#b7ff63] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-black">
                    <span>Purchase</span>
                    <span>Date</span>
                    <span>Status</span>
                    <span className="text-right">Paid</span>
                    <span className="text-right">Actions</span>
                </div>
                <div className="mt-3 grid gap-2">
                    {visiblePurchases.map((purchase) => (
                        <PurchaseRow
                            key={purchase.id}
                            purchase={purchase}
                            startEditPurchase={startEditPurchase}
                            requestDeletePurchase={requestDeletePurchase}
                        />
                    ))}
                    {!visiblePurchases.length && (
                        <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-8">
                            <p className="text-2xl font-black">No purchases found.</p>
                            <p className="mt-2 text-sm font-bold text-white/35">Change the search or filter, or add a new purchase.</p>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

function PurchaseRow({
    purchase,
    startEditPurchase,
    requestDeletePurchase,
}: {
    purchase: InAppPurchase;
    startEditPurchase: (purchase: InAppPurchase) => void;
    requestDeletePurchase: (purchase: InAppPurchase) => void;
}) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_128px_190px_112px_92px] items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.06] p-3 text-sm font-black">
            <span className="truncate text-base">{purchase.title}</span>
            <span className="text-white/45">{purchase.purchased_at ?? 'Unknown'}</span>
            <span className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-xs uppercase tracking-[0.12em] ring-1 ${purchase.is_locked ? 'bg-white/10 text-white/55 ring-white/15' : 'bg-[#b7ff63]/15 text-[#b7ff63] ring-[#b7ff63]/30'}`}>
                {purchase.is_locked && <LockKeyhole size={14} />}
                {purchase.is_locked ? `Locked by ${purchase.locked_by_snapshot_year}` : 'Editable'}
            </span>
            <span className="text-right text-[#b7ff63]">{moneyFormat(purchase.amount_paid)}</span>
            <div className="flex justify-end gap-2">
                <button type="button" title="Edit purchase" onClick={() => startEditPurchase(purchase)} disabled={purchase.is_locked} className="grid size-10 place-items-center rounded-2xl bg-white/10 text-white/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
                    <Edit3 size={17} />
                </button>
                <button type="button" title="Delete purchase" onClick={() => requestDeletePurchase(purchase)} disabled={purchase.is_locked} className="grid size-10 place-items-center rounded-2xl bg-[#d72835]/90 text-white disabled:cursor-not-allowed disabled:opacity-30">
                    <Trash2 size={17} />
                </button>
            </div>
        </div>
    );
}
