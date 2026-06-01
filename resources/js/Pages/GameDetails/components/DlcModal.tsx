import { Save, X } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';
import { dlcAcquisitionTypes } from '../constants';
import { formatMoney } from '../formatters';
import { Dlc, DlcForm } from '../types';
import { Field, Select, TextInput } from './FormControls';

export default function DlcModal({
    editingDlc,
    dlcForm,
    setDlcForm,
    dlcErrors,
    savingDlc,
    cancelDlcEdit,
    submitDlc,
}: {
    editingDlc: Dlc;
    dlcForm: DlcForm;
    setDlcForm: Dispatch<SetStateAction<DlcForm>>;
    dlcErrors: Record<string, string>;
    savingDlc: boolean;
    cancelDlcEdit: () => void;
    submitDlc: (dlc: Dlc) => void;
}) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">
            <section className="grid w-full max-w-4xl overflow-hidden rounded-[36px] border border-white/10 bg-black text-white shadow-[0_36px_120px_rgb(0_0_0/0.45)] md:grid-cols-[270px_minmax(0,1fr)]">
                <aside className="bg-[#b7ff63] p-5 text-black">
                    <div className="mt-5 rounded-[26px] bg-black p-4 text-white">
                        <div className="mb-3 grid size-12 place-items-center rounded-[18px] bg-white p-1.5">
                            <img src="/images/stupid-log/stupid-log.png" alt="" className="size-full object-contain" />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]">DLC Wizard</div>
                        <div className="mt-2 line-clamp-3 text-2xl font-black leading-[0.95] tracking-[-0.05em]">{editingDlc.title}</div>
                        <div className="mt-3 text-sm font-black text-white/40">{formatMoney(editingDlc.base_price)}</div>
                    </div>
                </aside>

                <div className="p-6">
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Expansion Entry</div>
                            <h2 className="mt-2 text-5xl font-black leading-none tracking-[-0.065em]">Mark DLC</h2>
                        </div>
                        <button type="button" onClick={cancelDlcEdit} className="grid size-11 place-items-center rounded-full bg-white/10 text-white/60 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mt-5 rounded-[26px] border border-[#b7ff63]/35 bg-[#b7ff63]/10 p-4">
                        <div className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/80">Ownership state</div>
                        <div className="grid gap-3 md:grid-cols-3">
                            <Field label="State" error={dlcErrors.acquisition_type}>
                                <Select value={dlcForm.acquisition_type} onChange={(event) => setDlcForm((current) => ({ ...current, acquisition_type: event.target.value, purchased_price: ['Edition Included', 'Free'].includes(event.target.value) ? '0' : current.purchased_price }))}>
                                    {dlcAcquisitionTypes.map((type) => <option key={type} value={type} className="text-black">{type}</option>)}
                                </Select>
                            </Field>

                            <Field label="Paid" error={dlcErrors.purchased_price}>
                                <TextInput type="number" step="0.01" value={dlcForm.purchased_price} onChange={(event) => setDlcForm((current) => ({ ...current, purchased_price: event.target.value }))} disabled={['Edition Included', 'Free'].includes(dlcForm.acquisition_type)} />
                            </Field>

                            <Field label="Purchased" error={dlcErrors.purchased_at}>
                                <TextInput type="date" value={dlcForm.purchased_at} onChange={(event) => setDlcForm((current) => ({ ...current, purchased_at: event.target.value }))} />
                            </Field>
                        </div>
                        {dlcErrors.dlc_id && <div className="mt-3 text-sm font-black text-[#ff6068]">{dlcErrors.dlc_id}</div>}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={cancelDlcEdit} className="rounded-[18px] bg-white/10 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-white">Cancel</button>
                        <button type="button" onClick={() => submitDlc(editingDlc)} disabled={savingDlc} className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                            <Save size={18} /> {savingDlc ? 'Saving' : 'Save DLC'}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
