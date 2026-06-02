import { Edit3, Plus, Trash2 } from 'lucide-react';
import { ReactNode } from 'react';
import { moneyFormat } from '../../Home/formatters';
import { InAppPurchase, InAppPurchaseForm, PaidBreakdown } from '../types';

export default function PurchasesPanel({
    paidBreakdown,
    editingPurchaseId,
    purchaseForm,
    purchaseErrors,
    savingPurchase,
    startAddPurchase,
    startEditPurchase,
    cancelPurchaseEdit,
    updatePurchaseForm,
    submitPurchase,
    deletePurchase,
}: {
    paidBreakdown: PaidBreakdown;
    editingPurchaseId: number | 'new' | null;
    purchaseForm: InAppPurchaseForm;
    purchaseErrors: Record<string, string>;
    savingPurchase: boolean;
    startAddPurchase: () => void;
    startEditPurchase: (purchase: InAppPurchase) => void;
    cancelPurchaseEdit: () => void;
    updatePurchaseForm: (patch: Partial<InAppPurchaseForm>) => void;
    submitPurchase: () => void;
    deletePurchase: (purchase: InAppPurchase) => void;
}) {
    const editing = editingPurchaseId !== null;

    return (
        <div className="max-h-[70vh] overflow-y-auto rounded-[34px] bg-black p-5 text-white shadow-[0_18px_38px_rgb(0_0_0/0.22)]">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff63]">Paid breakdown</p>
                    <h2 className="mt-1 text-3xl font-black">{moneyFormat(paidBreakdown.total_purchased_value)}</h2>
                </div>
                <button type="button" onClick={startAddPurchase} className="grid size-12 place-items-center rounded-full bg-[#b7ff63] text-black">
                    <Plus size={24} strokeWidth={3} />
                </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 text-sm font-black">
                <Metric label="Copy paid" value={paidBreakdown.copy_purchased_value} />
                <Metric label="DLC paid" value={paidBreakdown.dlc_purchased_value} />
                <Metric label="Subscription" value={paidBreakdown.subscription_allocated_value} />
                <Metric label="IAP" value={paidBreakdown.in_app_purchase_value} />
            </div>

            {editing && (
                <div className="mt-5 rounded-[26px] bg-white p-4 text-black">
                    <div className="grid gap-3">
                        <Field label="Title" error={purchaseErrors.title}>
                            <input value={purchaseForm.title} onChange={(event) => updatePurchaseForm({ title: event.target.value })} className="w-full rounded-2xl bg-black/5 px-4 py-3 font-bold outline-none ring-1 ring-black/10" />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Amount" error={purchaseErrors.amount_paid}>
                                <input type="number" min="0.01" step="0.01" value={purchaseForm.amount_paid} onChange={(event) => updatePurchaseForm({ amount_paid: event.target.value })} className="w-full rounded-2xl bg-black/5 px-4 py-3 font-bold outline-none ring-1 ring-black/10" />
                            </Field>
                            <Field label="Purchased" error={purchaseErrors.purchased_at}>
                                <input type="date" value={purchaseForm.purchased_at} onChange={(event) => updatePurchaseForm({ purchased_at: event.target.value })} className="w-full rounded-2xl bg-black/5 px-4 py-3 font-bold outline-none ring-1 ring-black/10" />
                            </Field>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={cancelPurchaseEdit} className="rounded-full px-4 py-2 text-sm font-black text-black/50">Cancel</button>
                        <button type="button" disabled={savingPurchase} onClick={submitPurchase} className="rounded-full bg-black px-5 py-2 text-sm font-black text-white disabled:opacity-50">Save</button>
                    </div>
                </div>
            )}

            <div className="mt-5 space-y-2">
                {paidBreakdown.in_app_purchases.map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between gap-3 rounded-[24px] bg-white/10 px-4 py-3">
                        <div className="min-w-0">
                            <p className="truncate font-black">{purchase.title}</p>
                            <p className="text-xs font-bold text-white/45">{purchase.purchased_at ?? 'No date'}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className="font-black text-[#b7ff63]">{moneyFormat(purchase.amount_paid)}</span>
                            <button type="button" onClick={() => startEditPurchase(purchase)} className="grid size-9 place-items-center rounded-full bg-white/10">
                                <Edit3 size={16} />
                            </button>
                            <button type="button" onClick={() => deletePurchase(purchase)} className="grid size-9 place-items-center rounded-full bg-white/10">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {!paidBreakdown.in_app_purchases.length && (
                    <p className="rounded-[24px] bg-white/10 px-4 py-5 text-sm font-bold text-white/50">No in-app purchases yet.</p>
                )}
            </div>

            {!!paidBreakdown.subscription_allocations.length && (
                <div className="mt-5 space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Subscription shares</p>
                    {paidBreakdown.subscription_allocations.map((allocation) => (
                        <div key={allocation.subscription_entry_id} className="rounded-[20px] bg-white/8 px-4 py-3 text-sm">
                            <div className="flex justify-between gap-3 font-black">
                                <span>{allocation.ownership_type}</span>
                                <span>{moneyFormat(allocation.allocated_amount)}</span>
                            </div>
                            <p className="mt-1 font-bold text-white/40">{allocation.started_at} - {allocation.finished_at} · {allocation.selected_count} copies</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-[22px] bg-white/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</p>
            <p className="mt-1 text-lg">{moneyFormat(value)}</p>
        </div>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-black/45">{label}</span>
            <span className="mt-1 block">{children}</span>
            {error && <span className="mt-1 block text-xs font-bold text-red-600">{error}</span>}
        </label>
    );
}
