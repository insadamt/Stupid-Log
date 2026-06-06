import { router } from '@inertiajs/react';
import { Check, Edit3, LockKeyhole, Plus, Trash2 } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import AppLayout from '../../Components/AppLayout';
import { moneyFormat } from '../Home/formatters';

type SubscriptionEntry = {
    id: number;
    ownership_type_id: number;
    ownership_type: string;
    amount_paid: string | number;
    started_at: string;
    finished_at: string;
    selected_ownership_copy_ids: number[];
    selected_count: number;
    has_locked_years: boolean;
    locked_ownership_copy_ids: number[];
    years: SubscriptionYear[];
};

type SubscriptionYear = {
    id: number;
    year: number;
    amount_allocated: string | number;
    is_locked: boolean;
    locked_by_snapshot_year: number | null;
    allocations: Array<{
        ownership_copy_id: number;
        allocated_amount: string | number;
    }>;
};

type SubscriptionOwnershipType = {
    id: number;
    name: string;
    is_subscription: boolean;
};

type SubscriptionOwnershipCopy = {
    id: number;
    ownership_type_id: number;
    ownership_type: string;
    library_game_id: number;
    game_title: string;
    platform: string;
    cover_url?: string | null;
};

type SubscriptionForm = {
    ownership_type_id: string;
    amount_paid: string;
    started_at: string;
    finished_at: string;
};

export default function Subscriptions({
    subscriptionEntries,
    subscriptionOwnershipTypes,
    ownershipCopies,
    closedFinancialYear,
    firstEditableDate,
}: {
    subscriptionEntries: SubscriptionEntry[];
    subscriptionOwnershipTypes: SubscriptionOwnershipType[];
    ownershipCopies: SubscriptionOwnershipCopy[];
    closedFinancialYear: number | null;
    firstEditableDate: string | null;
}) {
    const [editingId, setEditingId] = useState<number | 'new' | null>(null);
    const [selectedEntryId, setSelectedEntryId] = useState<number | null>(subscriptionEntries[0]?.id ?? null);
    const [form, setForm] = useState<SubscriptionForm>(() => emptyForm(subscriptionOwnershipTypes[0]?.id));
    const [selectedCopyIds, setSelectedCopyIds] = useState<number[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const selectedEntry = subscriptionEntries.find((entry) => entry.id === selectedEntryId) ?? null;
    const editingEntry = typeof editingId === 'number'
        ? subscriptionEntries.find((entry) => entry.id === editingId) ?? null
        : null;
    const activeOwnershipTypeId = Number(editingId ? form.ownership_type_id : selectedEntry?.ownership_type_id ?? subscriptionOwnershipTypes[0]?.id ?? 0);
    const matchingCopies = ownershipCopies.filter((copy) => copy.ownership_type_id === activeOwnershipTypeId);
    const allocationPreview = selectedCopyIds.length ? Number(form.amount_paid || 0) / selectedCopyIds.length : 0;

    function updateForm(patch: Partial<SubscriptionForm>) {
        setForm((current) => {
            const next = { ...current, ...patch };

            if (patch.ownership_type_id && patch.ownership_type_id !== current.ownership_type_id) {
                setSelectedCopyIds([]);
            }

            return next;
        });
    }

    function startCreate() {
        setEditingId('new');
        setSelectedEntryId(null);
        setForm(emptyForm(subscriptionOwnershipTypes[0]?.id));
        setSelectedCopyIds([]);
        setErrors({});
    }

    function startEdit(entry: SubscriptionEntry) {
        setEditingId(entry.id);
        setSelectedEntryId(entry.id);
        setForm({
            ownership_type_id: String(entry.ownership_type_id),
            amount_paid: String(entry.amount_paid),
            started_at: entry.started_at,
            finished_at: entry.finished_at,
        });
        setSelectedCopyIds(entry.selected_ownership_copy_ids);
        setErrors({});
    }

    function cancelEdit() {
        setEditingId(null);
        setErrors({});
    }

    function submitEntry() {
        const payload = {
            ownership_type_id: Number(form.ownership_type_id),
            amount_paid: Number(form.amount_paid),
            started_at: form.started_at,
            finished_at: form.finished_at,
        };
        const options = {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: () => cancelEdit(),
            onError: (nextErrors: Record<string, string>) => setErrors(nextErrors),
        };

        if (editingId === 'new') {
            router.post('/subscriptions', payload, options);
            return;
        }

        if (typeof editingId === 'number') {
            router.patch(`/subscriptions/${editingId}`, payload, options);
        }
    }

    function saveAllocation() {
        if (typeof editingId !== 'number') return;

        router.patch(`/subscriptions/${editingId}/ownership-copies`, {
            ownership_copy_ids: selectedCopyIds,
        }, {
            preserveScroll: true,
            onError: (nextErrors: Record<string, string>) => setErrors(nextErrors),
        });
    }

    function deleteEntry(entry: SubscriptionEntry) {
        router.delete(`/subscriptions/${entry.id}`, {
            preserveScroll: true,
            onError: (nextErrors: Record<string, string>) => setErrors(nextErrors),
        });
    }

    function toggleCopy(copyId: number) {
        if (editingEntry?.locked_ownership_copy_ids.includes(copyId) && selectedCopyIds.includes(copyId)) {
            return;
        }

        setSelectedCopyIds((current) => current.includes(copyId) ? current.filter((id) => id !== copyId) : [...current, copyId]);
    }

    return (
        <AppLayout title="Subscriptions">
            <main className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl gap-6 md:pl-[88px] lg:grid-cols-[380px_minmax(0,1fr)]">
                <section className="rounded-[34px] bg-black p-5 text-white shadow-[0_20px_42px_rgb(0_0_0/0.22)]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff63]">Financial entries</p>
                            <h1 className="mt-1 text-4xl font-black">Subscriptions</h1>
                        </div>
                        <button type="button" onClick={startCreate} className="grid size-12 place-items-center rounded-full bg-[#b7ff63] text-black">
                            <Plus size={26} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="mt-6 space-y-3">
                        {subscriptionEntries.map((entry) => (
                            <button key={entry.id} type="button" onClick={() => { setSelectedEntryId(entry.id); setEditingId(null); }} className={`w-full rounded-[24px] p-4 text-left transition ${selectedEntryId === entry.id ? 'bg-[#b7ff63] text-black' : 'bg-white/10 hover:bg-white/15'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-black">{entry.ownership_type}</p>
                                        <p className="mt-1 text-xs font-bold opacity-55">{entry.started_at} - {entry.finished_at}</p>
                                    </div>
                                    <span className="font-black">{moneyFormat(entry.amount_paid)}</span>
                                </div>
                                <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] opacity-55">{entry.selected_count} selected copies</p>
                            </button>
                        ))}
                        {!subscriptionEntries.length && <p className="rounded-[24px] bg-white/10 p-5 text-sm font-bold text-white/50">No subscriptions yet.</p>}
                    </div>
                </section>

                <section className="min-w-0 rounded-[34px] bg-[#eef4eb] p-6 shadow-[0_16px_38px_rgb(9_14_12/0.08)]">
                    {editingId ? (
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
                            <EntryForm
                                form={form}
                                ownershipTypes={subscriptionOwnershipTypes}
                                errors={errors}
                                saving={saving}
                                coreLocked={editingEntry?.has_locked_years ?? false}
                                closedFinancialYear={closedFinancialYear}
                                firstEditableDate={firstEditableDate}
                                updateForm={updateForm}
                                submitEntry={submitEntry}
                                cancelEdit={cancelEdit}
                            />
                            <AllocationPanel
                                matchingCopies={matchingCopies}
                                selectedCopyIds={selectedCopyIds}
                                allocationPreview={allocationPreview}
                                canSave={typeof editingId === 'number'}
                                lockedCopyIds={editingEntry?.locked_ownership_copy_ids ?? []}
                                hasLockedYears={editingEntry?.has_locked_years ?? false}
                                toggleCopy={toggleCopy}
                                saveAllocation={saveAllocation}
                            />
                        </div>
                    ) : selectedEntry ? (
                        <EntryDetails
                            entry={selectedEntry}
                            ownershipCopies={ownershipCopies}
                            startEdit={startEdit}
                            deleteEntry={deleteEntry}
                        />
                    ) : (
                        <div className="grid min-h-[420px] place-items-center rounded-[28px] border border-dashed border-black/15 text-center">
                            <div>
                                <p className="text-2xl font-black">No subscription selected</p>
                                <button type="button" onClick={startCreate} className="mt-4 rounded-full bg-black px-5 py-3 text-sm font-black text-white">Add subscription</button>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </AppLayout>
    );
}

function emptyForm(firstOwnershipTypeId?: number): SubscriptionForm {
    const today = new Date().toISOString().slice(0, 10);

    return {
        ownership_type_id: firstOwnershipTypeId ? String(firstOwnershipTypeId) : '',
        amount_paid: '',
        started_at: today,
        finished_at: today,
    };
}

function EntryForm({ form, ownershipTypes, errors, saving, coreLocked, closedFinancialYear, firstEditableDate, updateForm, submitEntry, cancelEdit }: {
    form: SubscriptionForm;
    ownershipTypes: SubscriptionOwnershipType[];
    errors: Record<string, string>;
    saving: boolean;
    coreLocked: boolean;
    closedFinancialYear: number | null;
    firstEditableDate: string | null;
    updateForm: (patch: Partial<SubscriptionForm>) => void;
    submitEntry: () => void;
    cancelEdit: () => void;
}) {
    return (
        <div className="rounded-[28px] bg-white p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/40">Entry details</p>
            {closedFinancialYear !== null && (
                <p className="mt-3 rounded-[18px] bg-black/5 px-4 py-3 text-sm font-bold text-black/50">
                    {closedFinancialYear} and earlier are locked by confirmed snapshots.
                </p>
            )}
            {coreLocked && (
                <p className="mt-3 flex items-center gap-2 rounded-[18px] bg-[#fff0f0] px-4 py-3 text-sm font-bold text-[#b42318]">
                    <LockKeyhole size={16} /> Core details are locked by a confirmed snapshot.
                </p>
            )}
            <div className="mt-4 grid gap-3">
                <Field label="Ownership type" error={errors.ownership_type_id}>
                    <select disabled={coreLocked} value={form.ownership_type_id} onChange={(event) => updateForm({ ownership_type_id: event.target.value })} className="w-full rounded-2xl bg-black/5 px-4 py-3 font-bold outline-none ring-1 ring-black/10 disabled:opacity-45">
                        {ownershipTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                    </select>
                </Field>
                <Field label="Amount paid" error={errors.amount_paid}>
                    <input disabled={coreLocked} type="number" min="0.01" step="0.01" value={form.amount_paid} onChange={(event) => updateForm({ amount_paid: event.target.value })} className="w-full rounded-2xl bg-black/5 px-4 py-3 font-bold outline-none ring-1 ring-black/10 disabled:opacity-45" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Started" error={errors.started_at}>
                        <input disabled={coreLocked} type="date" min={firstEditableDate ?? undefined} value={form.started_at} onChange={(event) => updateForm({ started_at: event.target.value })} className="w-full rounded-2xl bg-black/5 px-4 py-3 font-bold outline-none ring-1 ring-black/10 disabled:opacity-45" />
                    </Field>
                    <Field label="Finished" error={errors.finished_at}>
                        <input disabled={coreLocked} type="date" min={firstEditableDate ?? undefined} value={form.finished_at} onChange={(event) => updateForm({ finished_at: event.target.value })} className="w-full rounded-2xl bg-black/5 px-4 py-3 font-bold outline-none ring-1 ring-black/10 disabled:opacity-45" />
                    </Field>
                </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={cancelEdit} className="rounded-full px-4 py-2 text-sm font-black text-black/45">Cancel</button>
                <button type="button" disabled={saving || coreLocked} onClick={submitEntry} className="rounded-full bg-black px-5 py-2 text-sm font-black text-white disabled:opacity-50">Save</button>
            </div>
        </div>
    );
}

function AllocationPanel({ matchingCopies, selectedCopyIds, allocationPreview, canSave, lockedCopyIds, hasLockedYears, toggleCopy, saveAllocation }: {
    matchingCopies: SubscriptionOwnershipCopy[];
    selectedCopyIds: number[];
    allocationPreview: number;
    canSave: boolean;
    lockedCopyIds: number[];
    hasLockedYears: boolean;
    toggleCopy: (copyId: number) => void;
    saveAllocation: () => void;
}) {
    return (
        <div className="rounded-[28px] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/40">Selected copies</p>
                    <p className="mt-1 text-xl font-black">{selectedCopyIds.length ? `${moneyFormat(allocationPreview)} each` : 'No allocation'}</p>
                </div>
                <button type="button" disabled={!canSave} onClick={saveAllocation} className="rounded-full bg-[#b7ff63] px-4 py-2 text-sm font-black text-black disabled:opacity-40">
                    <Check size={16} className="inline" /> Save
                </button>
            </div>
            {!selectedCopyIds.length && <p className="mt-4 rounded-[20px] bg-black/5 p-4 text-sm font-bold text-black/45">This subscription does not affect paid value until at least one ownership copy is selected.</p>}
            {hasLockedYears && <p className="mt-4 rounded-[20px] bg-black/5 p-4 text-sm font-bold text-black/45">New copies affect editable years only. Copies used by locked years cannot be removed.</p>}
            <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {matchingCopies.map((copy) => {
                    const removalLocked = lockedCopyIds.includes(copy.id) && selectedCopyIds.includes(copy.id);

                    return (
                    <button key={copy.id} type="button" disabled={removalLocked} onClick={() => toggleCopy(copy.id)} className={`flex w-full items-center gap-3 rounded-[22px] p-3 text-left ring-1 ring-black/8 disabled:cursor-not-allowed ${selectedCopyIds.includes(copy.id) ? 'bg-[#b7ff63]' : 'bg-black/5'}`}>
                        <div className="size-12 overflow-hidden rounded-2xl bg-black/10">
                            {copy.cover_url && <img src={copy.cover_url} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate font-black">{copy.game_title}</p>
                            <p className="text-xs font-bold text-black/45">{copy.platform} · {copy.ownership_type}</p>
                        </div>
                        {removalLocked && <LockKeyhole size={16} className="ml-auto shrink-0" />}
                    </button>
                    );
                })}
                {!matchingCopies.length && <p className="rounded-[22px] bg-black/5 p-5 text-sm font-bold text-black/45">No matching ownership copies.</p>}
            </div>
        </div>
    );
}

function EntryDetails({ entry, ownershipCopies, startEdit, deleteEntry }: {
    entry: SubscriptionEntry;
    ownershipCopies: SubscriptionOwnershipCopy[];
    startEdit: (entry: SubscriptionEntry) => void;
    deleteEntry: (entry: SubscriptionEntry) => void;
}) {
    const selectedCopies = useMemo(() => ownershipCopies.filter((copy) => entry.selected_ownership_copy_ids.includes(copy.id)), [entry, ownershipCopies]);

    return (
        <div className="rounded-[28px] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-black/40">{entry.ownership_type}</p>
                    <h2 className="mt-1 text-4xl font-black">{moneyFormat(entry.amount_paid)}</h2>
                    <p className="mt-2 text-sm font-bold text-black/45">{entry.started_at} - {entry.finished_at}</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(entry)} className="grid size-11 place-items-center rounded-full bg-black text-white"><Edit3 size={18} /></button>
                    <button type="button" disabled={entry.has_locked_years} onClick={() => deleteEntry(entry)} className="grid size-11 place-items-center rounded-full bg-black/8 text-black disabled:cursor-not-allowed disabled:opacity-35"><Trash2 size={18} /></button>
                </div>
            </div>
            <div className="mt-6 space-y-3">
                {entry.years.map((year) => (
                    <YearAllocation key={year.id} year={year} ownershipCopies={ownershipCopies} />
                ))}
            </div>
            <div className="mt-5">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40">Global membership</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {selectedCopies.map((copy) => (
                    <div key={copy.id} className="rounded-[22px] bg-black/5 p-4">
                        <div className="flex items-center gap-2">
                            <p className="min-w-0 flex-1 truncate font-black">{copy.game_title}</p>
                            {entry.locked_ownership_copy_ids.includes(copy.id) && <LockKeyhole size={15} />}
                        </div>
                        <p className="text-sm font-bold text-black/45">{copy.platform} · {copy.ownership_type}</p>
                    </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function YearAllocation({ year, ownershipCopies }: {
    year: SubscriptionYear;
    ownershipCopies: SubscriptionOwnershipCopy[];
}) {
    return (
        <section className="rounded-[24px] bg-black p-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-black text-white/45">{year.year} yearly budget</p>
                    <p className="mt-1 text-2xl font-black">{moneyFormat(year.amount_allocated)}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${year.is_locked ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white'}`}>
                    {year.is_locked && <LockKeyhole size={12} />}
                    {year.is_locked ? `Locked by ${year.locked_by_snapshot_year} snapshot` : 'Editable'}
                </span>
            </div>
            {!year.allocations.length ? (
                <p className="mt-4 rounded-[18px] bg-white/8 px-4 py-3 text-sm font-bold text-white/50">Full budget counts as unallocated paid value.</p>
            ) : (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {year.allocations.map((allocation) => {
                        const copy = ownershipCopies.find((candidate) => candidate.id === allocation.ownership_copy_id);

                        return (
                            <div key={allocation.ownership_copy_id} className="rounded-[18px] bg-white/8 px-4 py-3">
                                <div className="flex justify-between gap-3 font-black">
                                    <span className="truncate">{copy?.game_title ?? 'Unavailable copy'}</span>
                                    <span className="shrink-0 text-[#b7ff63]">{moneyFormat(allocation.allocated_amount)}</span>
                                </div>
                                {copy && <p className="mt-1 text-xs font-bold text-white/40">{copy.platform}</p>}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
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
