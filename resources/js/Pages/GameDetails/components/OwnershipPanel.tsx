import { Edit3, Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '../formatters';
import { Details, OwnershipCopyDetails } from '../types';

export default function OwnershipPanel({
    details,
    startAddCopy,
    startEditCopy,
    deleteCopy,
}: {
    details: Details;
    startAddCopy: () => void;
    startEditCopy: (copy: OwnershipCopyDetails) => void;
    deleteCopy: (copy: OwnershipCopyDetails) => void;
}) {
    return (
        <article className="grid h-[610px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[40px] bg-black p-5 text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
            <div className="flex items-center justify-between gap-5 border-b border-white/10 pb-4">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Vault</div>
                    <h2 className="mt-1 text-[34px] font-black leading-none tracking-[-0.055em]">Ownership & Prices</h2>
                </div>
                <button type="button" onClick={startAddCopy} className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:-translate-y-0.5">
                    <Plus size={18} strokeWidth={3} /> Add Copy
                </button>
            </div>

            <div className="min-h-0 overflow-auto pr-1 pt-4">
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_112px_112px_92px] gap-3 rounded-[18px] bg-[#b7ff63] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-black">
                    <span>Copy</span>
                    <span>Base</span>
                    <span>Paid</span>
                    <span className="text-right">Actions</span>
                </div>
                <div className="mt-3 grid gap-2">
                {details.ownership_copies.map((copy, index) => (
                    <div key={copy.id} className="grid grid-cols-[minmax(0,1fr)_112px_112px_92px] items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.06] p-3">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Copy {index + 1}</div>
                            <div className="mt-1 truncate text-xl font-black tracking-[-0.04em]">{copy.ownership_type || 'Unknown'}</div>
                            <div className="mt-1 truncate text-xs font-black text-white/35">{copy.edition_name || copy.physical_status || 'Standard'}</div>
                        </div>
                        <div>
                            <div className="text-base font-black text-[#b7ff63]">{formatMoney(copy.base_price)}</div>
                        </div>
                        <div>
                            <div className="text-base font-black text-white/70">{formatMoney(copy.purchased_price)}</div>
                        </div>
                        <div className="flex gap-2 md:justify-end">
                            <button type="button" onClick={() => startEditCopy(copy)} className="grid size-11 place-items-center rounded-2xl bg-white/10 text-white/70 hover:text-white"><Edit3 size={18} /></button>
                            <button type="button" onClick={() => deleteCopy(copy)} className="grid size-11 place-items-center rounded-2xl bg-[#d72835]/90 text-white disabled:opacity-35" disabled={details.ownership_copies.length === 1}><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        </article>
    );
}
