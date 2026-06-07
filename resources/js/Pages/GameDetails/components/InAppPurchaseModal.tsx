import { Save, X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { InAppPurchase, InAppPurchaseForm } from '../types';

export default function InAppPurchaseModal({
    purchase,
    form,
    errors,
    saving,
    firstEditableFinancialDate,
    updateForm,
    close,
    submit,
}: {
    purchase: InAppPurchase | null;
    form: InAppPurchaseForm;
    errors: Record<string, string>;
    saving: boolean;
    firstEditableFinancialDate: string | null;
    updateForm: (patch: Partial<InAppPurchaseForm>) => void;
    close: () => void;
    submit: () => void;
}) {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !saving) close();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [close, saving]);

    return (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/65 p-6 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" className="grid w-full max-w-4xl grid-cols-[270px_minmax(0,1fr)] overflow-hidden rounded-[34px] border border-white/10 bg-black text-white shadow-[0_36px_120px_rgb(0_0_0/0.45)]">
                <aside className="bg-[#b7ff63] p-5 text-black">
                    <div className="rounded-[26px] bg-black p-5 text-white">
                        <div className="grid size-12 place-items-center rounded-[17px] bg-white p-1.5">
                            <img src="/images/stupid-log/stupid-log.png" alt="" className="size-full object-contain" />
                        </div>
                        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]">In-App Purchase</p>
                        <h2 className="mt-2 text-3xl font-black leading-none tracking-[-0.05em]">{purchase ? 'Edit spending record' : 'Add spending record'}</h2>
                        <p className="mt-4 text-sm font-bold leading-relaxed text-white/40">Track currency packs, cosmetics, expansions, and other purchases made inside this game.</p>
                    </div>
                </aside>

                <div className="p-6">
                    <header className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Financial entry</p>
                            <h3 className="mt-1 text-4xl font-black tracking-[-0.05em]">{purchase ? 'Edit Purchase' : 'New Purchase'}</h3>
                        </div>
                        <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full bg-white/10"><X size={20} /></button>
                    </header>

                    <div className="mt-6 grid gap-5 rounded-[26px] border border-[#b7ff63]/30 bg-[#b7ff63]/10 p-5">
                        <Field label="Purchase title" error={errors.title}>
                            <input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} placeholder="Currency pack, cosmetic bundle..." className={inputClass} />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Amount paid" error={errors.amount_paid}>
                                <input type="number" min="0.01" step="0.01" value={form.amount_paid} onChange={(event) => updateForm({ amount_paid: event.target.value })} className={inputClass} />
                            </Field>
                            <Field label="Purchased date" error={errors.purchased_at}>
                                <input type="date" min={firstEditableFinancialDate ?? undefined} value={form.purchased_at} onChange={(event) => updateForm({ purchased_at: event.target.value })} className={inputClass} />
                            </Field>
                        </div>
                        {errors.in_app_purchase && <p className="text-sm font-black text-[#ff6068]">{errors.in_app_purchase}</p>}
                    </div>

                    <footer className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={close} className="rounded-[17px] bg-white/10 px-6 py-3 font-black">Cancel</button>
                        <button type="button" onClick={submit} disabled={saving} className="flex items-center gap-2 rounded-[17px] bg-[#b7ff63] px-6 py-3 font-black text-black disabled:opacity-45"><Save size={18} /> {saving ? 'Saving' : 'Save purchase'}</button>
                    </footer>
                </div>
            </section>
        </div>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b7ff63]/70">{label}</span>{children}{error && <span className="text-xs font-black text-[#ff6068]">{error}</span>}</label>;
}

const inputClass = 'h-12 w-full rounded-[16px] border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none placeholder:text-white/25 focus:border-[#b7ff63]';
