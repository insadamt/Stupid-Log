import { Save, X } from 'lucide-react';
import { GameCardData, ReferenceData } from '../../../types';
import { physicalLike } from '../constants';
import { Details, OwnershipCopyDetails, OwnershipForm } from '../types';
import { Field, Select, TextInput } from './FormControls';

export default function OwnershipCopyModal({
    editingCopyId,
    editingCopy,
    libraryGame,
    details,
    references,
    ownershipForm,
    ownershipErrors,
    savingOwnership,
    updateOwnershipForm,
    cancelOwnershipEdit,
    submitOwnership,
}: {
    editingCopyId: number | 'new';
    editingCopy: OwnershipCopyDetails | null;
    libraryGame: GameCardData;
    details: Details;
    references: ReferenceData;
    ownershipForm: OwnershipForm;
    ownershipErrors: Record<string, string>;
    savingOwnership: boolean;
    updateOwnershipForm: (patch: Partial<OwnershipForm>) => void;
    cancelOwnershipEdit: () => void;
    submitOwnership: () => void;
}) {
    const selectedOwnershipType = details.platform_ownership_types.find((type) => String(type.id) === ownershipForm.ownership_type_id);
    const needsPhysicalStatus = selectedOwnershipType ? physicalLike.includes(selectedOwnershipType.name) : false;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">
            <section className="grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-black text-white shadow-[0_36px_120px_rgb(0_0_0/0.45)] md:grid-cols-[300px_minmax(0,1fr)]">
                <aside className="bg-[#b7ff63] p-5 text-black">
                    <div className="overflow-hidden rounded-[28px] bg-black p-3 shadow-[0_22px_48px_rgb(0_0_0/0.25)]">
                        {libraryGame.cover_url ? (
                            <img src={libraryGame.cover_url} alt={libraryGame.title} className="h-[280px] w-full rounded-[22px] object-cover" />
                        ) : (
                            <div className="grid h-[280px] place-items-center rounded-[22px] text-xl font-black text-[#b7ff63]">No Cover</div>
                        )}
                    </div>

                    <div className="mt-5 rounded-[26px] bg-black p-4 text-white">
                        <div className="mb-3 grid size-12 place-items-center rounded-[18px] bg-white p-1.5">
                            <img src="/images/stupid-log/stupid-log.png" alt="" className="size-full object-contain" />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]">Ownership Wizard</div>
                        <div className="mt-2 line-clamp-2 text-3xl font-black leading-[0.92] tracking-[-0.06em]">
                            {editingCopyId === 'new' ? 'New copy' : editingCopy?.ownership_type || 'Edit copy'}
                        </div>
                    </div>
                </aside>

                <div className="p-6">
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Vault Entry</div>
                            <h2 className="mt-2 text-5xl font-black leading-none tracking-[-0.065em]">
                                {editingCopyId === 'new' ? 'Add Copy' : 'Edit Copy'}
                            </h2>
                        </div>
                        <button type="button" onClick={cancelOwnershipEdit} className="grid size-11 place-items-center rounded-full bg-white/10 text-white/60 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mt-5 rounded-[26px] border border-[#b7ff63]/35 bg-[#b7ff63]/10 p-4">
                        <div className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/80">Copy identity</div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Ownership Type" error={ownershipErrors.ownership_type_id}>
                                <Select value={ownershipForm.ownership_type_id} onChange={(event) => updateOwnershipForm({ ownership_type_id: event.target.value, physical_status_id: '' })}>
                                    {details.platform_ownership_types.map((type) => <option key={type.id} value={type.id} className="text-black">{type.name}</option>)}
                                </Select>
                            </Field>

                            {needsPhysicalStatus ? (
                                <Field label="Physical Status" error={ownershipErrors.physical_status_id}>
                                    <Select value={ownershipForm.physical_status_id} onChange={(event) => updateOwnershipForm({ physical_status_id: event.target.value })}>
                                        <option value="" className="text-black">Required</option>
                                        {references.physicalStatuses.map((status) => <option key={status.id} value={status.id} className="text-black">{status.name}</option>)}
                                    </Select>
                                </Field>
                            ) : (
                                <Field label="Edition" error={ownershipErrors.edition_name}>
                                    <TextInput value={ownershipForm.edition_name} onChange={(event) => updateOwnershipForm({ edition_name: event.target.value })} placeholder="Standard" />
                                </Field>
                            )}

                            {needsPhysicalStatus && (
                                <Field label="Edition" error={ownershipErrors.edition_name}>
                                    <TextInput value={ownershipForm.edition_name} onChange={(event) => updateOwnershipForm({ edition_name: event.target.value })} placeholder="Standard" />
                                </Field>
                            )}

                            <Field label="Base Value" error={ownershipErrors.base_price}>
                                <TextInput type="number" step="0.01" value={ownershipForm.base_price} onChange={(event) => updateOwnershipForm({ base_price: event.target.value })} placeholder="Unknown" />
                            </Field>

                            <Field label="Paid" error={ownershipErrors.purchased_price}>
                                <TextInput type="number" step="0.01" value={ownershipForm.purchased_price} onChange={(event) => updateOwnershipForm({ purchased_price: event.target.value })} placeholder="Unknown" />
                            </Field>

                            <Field label="Purchased" error={ownershipErrors.purchased_at}>
                                <TextInput type="date" value={ownershipForm.purchased_at} onChange={(event) => updateOwnershipForm({ purchased_at: event.target.value })} />
                            </Field>
                        </div>

                        {ownershipErrors.ownership_copy && <div className="mt-3 text-sm font-black text-[#ff6068]">{ownershipErrors.ownership_copy}</div>}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={cancelOwnershipEdit} className="rounded-[18px] bg-white/10 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-white">Cancel</button>
                        <button type="button" onClick={submitOwnership} disabled={savingOwnership} className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                            <Save size={18} /> {savingOwnership ? 'Saving' : 'Save Copy'}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
