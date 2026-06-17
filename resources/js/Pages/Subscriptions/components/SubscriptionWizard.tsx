import { router } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, Loader2, LockKeyhole, Search, X } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { moneyFormat } from '../../Home/formatters';
import { loadSubscriptionPreview } from '../api';
import { emptySubscriptionForm, subscriptionFormFromEntry, subscriptionPayload } from '../helpers';
import { SubscriptionEntry, SubscriptionForm, SubscriptionOwnershipCopy, SubscriptionOwnershipType, SubscriptionPreviewYear } from '../types';

export default function SubscriptionWizard({
    entry,
    ownershipTypes,
    ownershipCopies,
    closedFinancialYear,
    firstEditableDate,
    close,
}: {
    entry: SubscriptionEntry | null;
    ownershipTypes: SubscriptionOwnershipType[];
    ownershipCopies: SubscriptionOwnershipCopy[];
    closedFinancialYear: number | null;
    firstEditableDate: string | null;
    close: () => void;
}) {
    const [step, setStep] = useState<0 | 1>(0);
    const [form, setForm] = useState<SubscriptionForm>(() => entry
        ? subscriptionFormFromEntry(entry)
        : emptySubscriptionForm(ownershipTypes[0]?.id, firstEditableDate));
    const [selectedCopyIds, setSelectedCopyIds] = useState<number[]>(entry?.selected_ownership_copy_ids ?? []);
    const [query, setQuery] = useState('');
    const [platform, setPlatform] = useState('All');
    const [previewYears, setPreviewYears] = useState<SubscriptionPreviewYear[]>([]);
    const [previewing, setPreviewing] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const coreLocked = entry?.has_locked_years ?? false;
    const lockedCopyIds = entry?.locked_ownership_copy_ids ?? [];
    const activeOwnershipTypeId = Number(form.ownership_type_id);
    const matchingCopies = ownershipCopies.filter((copy) => copy.ownership_type_id === activeOwnershipTypeId);
    const platforms = ['All', ...Array.from(new Set(matchingCopies.map((copy) => copy.platform))).sort()];
    const visibleCopies = matchingCopies.filter((copy) => {
        const matchesQuery = copy.game_title.toLowerCase().includes(query.toLowerCase().trim());
        return matchesQuery && (platform === 'All' || copy.platform === platform);
    });
    const detailsError = validateDetails(form);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !saving) close();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [close, saving]);

    useEffect(() => {
        if (step !== 1 || detailsError) return;

        const timeout = window.setTimeout(() => {
            setPreviewing(true);
            setPreviewError('');
            loadSubscriptionPreview(form, selectedCopyIds, entry?.id)
                .then(setPreviewYears)
                .catch((error: Error) => {
                    setPreviewYears([]);
                    setPreviewError(error.message);
                })
                .finally(() => setPreviewing(false));
        }, 180);

        return () => window.clearTimeout(timeout);
    }, [detailsError, entry?.id, form, selectedCopyIds, step]);

    function updateForm(patch: Partial<SubscriptionForm>) {
        setForm((current) => {
            if (patch.ownership_type_id && patch.ownership_type_id !== current.ownership_type_id) {
                setSelectedCopyIds([]);
                setPlatform('All');
            }
            return { ...current, ...patch };
        });
        setErrors({});
    }

    function toggleCopy(copyId: number) {
        if (lockedCopyIds.includes(copyId) && selectedCopyIds.includes(copyId)) return;
        setSelectedCopyIds((current) => current.includes(copyId)
            ? current.filter((id) => id !== copyId)
            : [...current, copyId]);
    }

    function submit() {
        const options = {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: close,
            onError: (nextErrors: Record<string, string>) => {
                setErrors(nextErrors);
                if (nextErrors.ownership_type_id || nextErrors.amount_paid || nextErrors.started_at || nextErrors.finished_at || nextErrors.subscription) {
                    setStep(0);
                }
            },
        };
        const payload = subscriptionPayload(form, selectedCopyIds);

        if (entry) {
            router.patch(`/subscriptions/${entry.id}`, payload, options);
            return;
        }

        router.post('/subscriptions', payload, options);
    }

    return (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-6 py-5 backdrop-blur-md">
            <section role="dialog" aria-modal="true" className="grid max-h-[94vh] w-full max-w-[1280px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[34px] border border-white/15 bg-[#e9eee9] shadow-[0_44px_150px_rgb(0_0_0/0.6)]">
                <header className="border-b border-white/10 bg-black px-8 py-5 text-white">
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="grid size-14 place-items-center rounded-[18px] bg-[#b7ff63] p-1.5">
                                <img src="/images/stupid-log/stupid-log.png" alt="" className="size-full object-contain" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#b7ff63]/70">Subscription wizard</p>
                                <h2 className="mt-1 text-4xl font-black tracking-[-0.05em]">{entry ? 'Edit Subscription' : 'Add Subscription'}</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="rounded-full bg-[#b7ff63] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black">{step === 0 ? '1 · Details' : '2 · Allocation'}</span>
                            <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full bg-white/10"><X size={20} /></button>
                        </div>
                    </div>
                </header>

                <main className="min-h-0 overflow-y-auto p-7">
                    {step === 0 ? (
                        <DetailsStep
                            form={form}
                            ownershipTypes={ownershipTypes}
                            errors={errors}
                            coreLocked={coreLocked}
                            closedFinancialYear={closedFinancialYear}
                            firstEditableDate={firstEditableDate}
                            updateForm={updateForm}
                        />
                    ) : (
                        <AllocationStep
                            copies={visibleCopies}
                            platforms={platforms}
                            query={query}
                            platform={platform}
                            selectedCopyIds={selectedCopyIds}
                            lockedCopyIds={lockedCopyIds}
                            previewYears={previewYears}
                            previewing={previewing}
                            previewError={previewError || errors.ownership_copy_ids}
                            setQuery={setQuery}
                            setPlatform={setPlatform}
                            toggleCopy={toggleCopy}
                        />
                    )}
                </main>

                <footer className="flex items-center justify-between border-t border-black/10 bg-white/75 px-7 py-5">
                    <button type="button" onClick={step === 0 ? close : () => setStep(0)} className="flex items-center gap-2 rounded-[17px] bg-black/7 px-6 py-3 font-black">
                        {step === 1 && <ChevronLeft size={18} />} {step === 0 ? 'Cancel' : 'Back'}
                    </button>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-black/35">{step + 1} / 2</span>
                    {step === 0 ? (
                        <button type="button" disabled={Boolean(detailsError)} onClick={() => setStep(1)} className="flex items-center gap-2 rounded-[17px] bg-black px-6 py-3 font-black text-white disabled:opacity-35">Next <ChevronRight size={18} /></button>
                    ) : (
                        <button type="button" disabled={saving || previewing || Boolean(previewError)} onClick={submit} className="flex items-center gap-2 rounded-[17px] bg-[#b7ff63] px-6 py-3 font-black text-black disabled:opacity-35">
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} {saving ? 'Saving' : 'Save subscription'}
                        </button>
                    )}
                </footer>
            </section>
        </div>
    );
}

function DetailsStep({ form, ownershipTypes, errors, coreLocked, closedFinancialYear, firstEditableDate, updateForm }: {
    form: SubscriptionForm;
    ownershipTypes: SubscriptionOwnershipType[];
    errors: Record<string, string>;
    coreLocked: boolean;
    closedFinancialYear: number | null;
    firstEditableDate: string | null;
    updateForm: (patch: Partial<SubscriptionForm>) => void;
}) {
    return (
        <div className="mx-auto max-w-3xl">
            <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/35">Subscription identity</p>
                <h3 className="mt-1 text-4xl font-black tracking-[-0.05em]">Payment and coverage period</h3>
            </div>
            {closedFinancialYear !== null && <Notice>{closedFinancialYear} and earlier are locked by confirmed snapshots.</Notice>}
            {coreLocked && <Notice tone="locked"><LockKeyhole size={16} /> Core details are read-only because this subscription has locked yearly records.</Notice>}
            <div className="mt-5 grid gap-5 rounded-[28px] bg-black p-6 text-white md:grid-cols-2">
                <Field label="Subscription type" error={errors.ownership_type_id}>
                    <select disabled={coreLocked} value={form.ownership_type_id} onChange={(event) => updateForm({ ownership_type_id: event.target.value })} className={inputClass}>
                        {ownershipTypes.map((type) => <option key={type.id} value={type.id} className="text-black">{type.name}</option>)}
                    </select>
                </Field>
                <Field label="Amount paid" error={errors.amount_paid}>
                    <input disabled={coreLocked} type="number" min="0.01" step="0.01" value={form.amount_paid} onChange={(event) => updateForm({ amount_paid: event.target.value })} className={inputClass} />
                </Field>
                <Field label="Started" error={errors.started_at}>
                    <input disabled={coreLocked} type="date" min={firstEditableDate ?? undefined} value={form.started_at} onChange={(event) => updateForm({ started_at: event.target.value })} className={inputClass} />
                </Field>
                <Field label="Finished" error={errors.finished_at}>
                    <input disabled={coreLocked} type="date" min={firstEditableDate ?? undefined} value={form.finished_at} onChange={(event) => updateForm({ finished_at: event.target.value })} className={inputClass} />
                </Field>
                {errors.subscription && <p className="md:col-span-2 text-sm font-black text-[#ff6068]">{errors.subscription}</p>}
            </div>
        </div>
    );
}

function AllocationStep({ copies, platforms, query, platform, selectedCopyIds, lockedCopyIds, previewYears, previewing, previewError, setQuery, setPlatform, toggleCopy }: {
    copies: SubscriptionOwnershipCopy[];
    platforms: string[];
    query: string;
    platform: string;
    selectedCopyIds: number[];
    lockedCopyIds: number[];
    previewYears: SubscriptionPreviewYear[];
    previewing: boolean;
    previewError?: string;
    setQuery: (query: string) => void;
    setPlatform: (platform: string) => void;
    toggleCopy: (copyId: number) => void;
}) {
    return (
        <div className="grid min-h-[560px] gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
            <section className="rounded-[28px] bg-white/70 p-5 ring-1 ring-black/8">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/35">Global membership</p>
                        <h3 className="mt-1 text-3xl font-black">{selectedCopyIds.length} selected games</h3>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_180px] gap-3">
                    <label className="flex h-12 items-center gap-3 rounded-[16px] bg-black/5 px-4 ring-1 ring-black/8">
                        <Search size={17} className="text-black/35" />
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games" className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" />
                    </label>
                    <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="h-12 rounded-[16px] bg-black px-4 text-sm font-black text-white outline-none">
                        {platforms.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                <div className="mt-4 grid max-h-[430px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                    {copies.map((copy) => {
                        const selected = selectedCopyIds.includes(copy.id);
                        const removalLocked = selected && lockedCopyIds.includes(copy.id);
                        return (
                            <button key={copy.id} type="button" disabled={removalLocked} onClick={() => toggleCopy(copy.id)} className={`flex items-center gap-3 rounded-[20px] border p-3 text-left ${selected ? 'border-[#86cf38] bg-[#b7ff63]' : 'border-black/8 bg-white'} disabled:cursor-not-allowed`}>
                                <div className="size-12 overflow-hidden rounded-[14px] bg-black/8">{copy.cover_url && <img src={copy.cover_url} alt="" className="size-full object-cover" />}</div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-black">{copy.game_title}</p>
                                    <p className="text-xs font-bold text-black/40">{copy.platform}</p>
                                </div>
                                {removalLocked ? <LockKeyhole size={16} /> : selected ? <Check size={17} /> : null}
                            </button>
                        );
                    })}
                    {!copies.length && <p className="rounded-[20px] border border-dashed border-black/12 p-5 text-sm font-bold text-black/40">No games.</p>}
                </div>
            </section>

            <section className="rounded-[28px] bg-black p-5 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">Yearly preview</p>
                <h3 className="mt-1 text-3xl font-black">Generated allocation</h3>
                {previewing && <p className="mt-5 flex items-center gap-2 text-sm font-bold text-white/45"><Loader2 size={16} className="animate-spin" /> Calculating preview</p>}
                {previewError && <p className="mt-5 rounded-[18px] bg-red-500/15 p-4 text-sm font-black text-[#ff8c92]">{previewError}</p>}
                <div className="mt-4 max-h-[470px] space-y-3 overflow-y-auto pr-1">
                    {previewYears.map((year) => (
                        <article key={year.year} className="rounded-[20px] bg-white/8 p-4 ring-1 ring-white/8">
                            <div className="flex justify-between gap-3">
                                <div>
                                    <p className="font-black">{year.year} · {moneyFormat(year.amount_allocated)}</p>
                                    <p className="mt-1 text-xs font-bold text-white/35">{year.selected_copy_count} selected copies</p>
                                </div>
                                <span className={`h-fit rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${year.is_locked ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/50'}`}>{year.is_locked ? 'Locked' : 'Editable'}</span>
                            </div>
                            <div className="mt-3 space-y-1.5">
                                {year.allocations.map((allocation) => (
                                    <div key={allocation.ownership_copy_id} className="flex justify-between gap-3 text-xs font-bold">
                                        <span className="truncate text-white/55">{allocation.game_title}</span>
                                        <span className="shrink-0 text-[#b7ff63]">{moneyFormat(allocation.allocated_amount)}</span>
                                    </div>
                                ))}
                                {Number(year.unallocated_amount) > 0 && <div className="flex justify-between gap-3 text-xs font-black text-white/45"><span>Unallocated</span><span>{moneyFormat(year.unallocated_amount)}</span></div>}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

function validateDetails(form: SubscriptionForm): string | null {
    if (!form.ownership_type_id) return 'Choose a subscription type.';
    if (!form.amount_paid || Number(form.amount_paid) < 0.01) return 'Enter an amount of at least 0.01.';
    if (!form.started_at || !form.finished_at) return 'Choose both dates.';
    if (form.finished_at < form.started_at) return 'Finish date must be on or after the start date.';
    return null;
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b7ff63]/70">{label}</span>{children}{error && <span className="text-xs font-black text-[#ff6068]">{error}</span>}</label>;
}

function Notice({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'locked' }) {
    return <p className={`mt-3 flex items-center gap-2 rounded-[18px] px-4 py-3 text-sm font-bold ${tone === 'locked' ? 'bg-[#fff0f0] text-[#b42318]' : 'bg-black/5 text-black/50'}`}>{children}</p>;
}

const inputClass = 'h-12 w-full rounded-[16px] border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none focus:border-[#b7ff63] disabled:opacity-45';
