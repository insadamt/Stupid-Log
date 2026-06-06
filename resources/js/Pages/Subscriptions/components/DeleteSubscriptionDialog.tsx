import { AlertTriangle, X } from 'lucide-react';
import { SubscriptionEntry } from '../types';

export default function DeleteSubscriptionDialog({
    entry,
    deleting,
    cancel,
    confirm,
}: {
    entry: SubscriptionEntry;
    deleting: boolean;
    cancel: () => void;
    confirm: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/65 p-6 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[30px] bg-white p-6 shadow-[0_36px_120px_rgb(0_0_0/0.45)]">
                <div className="flex items-start justify-between gap-4">
                    <div className="grid size-12 place-items-center rounded-[16px] bg-[#fff0f0] text-[#d92d20]"><AlertTriangle size={23} /></div>
                    <button type="button" onClick={cancel} className="grid size-10 place-items-center rounded-full bg-black/5"><X size={18} /></button>
                </div>
                <h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">Delete {entry.ownership_type}?</h2>
                <p className="mt-2 text-sm font-bold leading-relaxed text-black/45">This removes the subscription and every unlocked yearly allocation generated from it.</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={cancel} className="rounded-[16px] bg-black/5 px-5 py-3 font-black">Cancel</button>
                    <button type="button" disabled={deleting} onClick={confirm} className="rounded-[16px] bg-[#d92d20] px-5 py-3 font-black text-white disabled:opacity-45">{deleting ? 'Deleting' : 'Delete subscription'}</button>
                </div>
            </section>
        </div>
    );
}
