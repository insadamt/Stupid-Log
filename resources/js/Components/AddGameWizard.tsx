import { router } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ReferenceData } from '../types';

type OwnershipCopyDraft = {
    ownership_type_id: number;
    physical_status_id: number | null;
    edition_name: string;
    base_price: string;
    purchased_price: string;
    purchased_at: string;
};

type Draft = {
    title: string;
    publisher: string;
    release_date: string;
    description: string;
    total_achievements: string;
    base_price_default: string;
    platform_id: number;
    device_ids: number[];
    ownership_copies: OwnershipCopyDraft[];
    status_id: number;
    playtime_hours: string;
    earned_achievements: string;
    first_played_at: string;
    last_played_at: string;
    completed_at: string;
};

const physicalLike = ['Physical', 'Pre-owned', 'Borrowed'];
const steps = ['Search', 'Metadata', 'Platform', 'Devices', 'Ownership', 'Progress', 'Review'];

function firstByName<T extends { id: number; name: string }>(items: T[], name: string, fallback?: T): T {
    return items.find((item) => item.name === name) ?? fallback ?? items[0];
}

export default function AddGameWizard({
    references,
    buttonClassName = 'fixed bottom-10 right-10 rounded-[18px] bg-[#b7ff63] px-20 py-8 text-3xl font-black',
}: {
    references: ReferenceData;
    buttonClassName?: string;
}) {
    const defaultPlatform = firstByName(references.platforms, 'Steam', references.platforms[0]);
    const defaultStatus = firstByName(references.statuses, 'Not Played', references.statuses[0]);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState<Draft>(() => ({
        title: '',
        publisher: '',
        release_date: '',
        description: '',
        total_achievements: '0',
        base_price_default: '',
        platform_id: defaultPlatform?.id ?? 0,
        device_ids: defaultPlatform?.devices[0] ? [defaultPlatform.devices[0].id] : [],
        ownership_copies: [
            {
                ownership_type_id: defaultPlatform?.ownership_types[0]?.id ?? 0,
                physical_status_id: null,
                edition_name: '',
                base_price: '',
                purchased_price: '',
                purchased_at: '',
            },
        ],
        status_id: defaultStatus?.id ?? 0,
        playtime_hours: '0',
        earned_achievements: '0',
        first_played_at: '',
        last_played_at: '',
        completed_at: '',
    }));

    const platform = useMemo(() => references.platforms.find((item) => item.id === draft.platform_id), [draft.platform_id, references.platforms]);
    const status = useMemo(() => references.statuses.find((item) => item.id === draft.status_id), [draft.status_id, references.statuses]);
    const ownershipById = useMemo(() => new Map(references.ownershipTypes.map((item) => [item.id, item.name])), [references.ownershipTypes]);
    const availableStatuses = useMemo(() => {
        const hasAchievements = Number(draft.total_achievements || 0) > 0;
        return references.statuses.filter((item) => hasAchievements || item.name !== '100%');
    }, [draft.total_achievements, references.statuses]);

    function update<K extends keyof Draft>(key: K, value: Draft[K]) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function choosePlatform(platformId: number) {
        const nextPlatform = references.platforms.find((item) => item.id === platformId);
        if (!nextPlatform) return;

        setDraft((current) => ({
            ...current,
            platform_id: platformId,
            device_ids: nextPlatform.devices[0] ? [nextPlatform.devices[0].id] : [],
            ownership_copies: [
                {
                    ownership_type_id: nextPlatform.ownership_types[0]?.id ?? 0,
                    physical_status_id: null,
                    edition_name: '',
                    base_price: current.base_price_default,
                    purchased_price: '',
                    purchased_at: '',
                },
            ],
        }));
    }

    function toggleDevice(deviceId: number) {
        setDraft((current) => {
            const exists = current.device_ids.includes(deviceId);
            const device_ids = exists ? current.device_ids.filter((id) => id !== deviceId) : [...current.device_ids, deviceId];
            return { ...current, device_ids };
        });
    }

    function updateCopy(index: number, patch: Partial<OwnershipCopyDraft>) {
        setDraft((current) => ({
            ...current,
            ownership_copies: current.ownership_copies.map((copy, copyIndex) => copyIndex === index ? { ...copy, ...patch } : copy),
        }));
    }

    function addCopy() {
        const used = new Set(draft.ownership_copies.map((copy) => copy.ownership_type_id));
        const nextType = platform?.ownership_types.find((item) => !used.has(item.id)) ?? platform?.ownership_types[0];
        if (!nextType) return;

        setDraft((current) => ({
            ...current,
            ownership_copies: [
                ...current.ownership_copies,
                {
                    ownership_type_id: nextType.id,
                    physical_status_id: null,
                    edition_name: '',
                    base_price: current.base_price_default,
                    purchased_price: '',
                    purchased_at: '',
                },
            ],
        }));
    }

    function removeCopy(index: number) {
        setDraft((current) => ({
            ...current,
            ownership_copies: current.ownership_copies.filter((_, copyIndex) => copyIndex !== index),
        }));
    }

    function canContinue() {
        if (step === 0) return draft.title.trim().length >= 2;
        if (step === 2) return Boolean(draft.platform_id);
        if (step === 3) return draft.device_ids.length > 0;
        if (step === 4) {
            const ids = draft.ownership_copies.map((copy) => copy.ownership_type_id);
            const unique = new Set(ids);
            return draft.ownership_copies.length > 0
                && unique.size === ids.length
                && draft.ownership_copies.every((copy) => {
                    const name = ownershipById.get(copy.ownership_type_id);
                    return !name || !physicalLike.includes(name) || Boolean(copy.physical_status_id);
                });
        }
        if (step === 5) {
            const total = Number(draft.total_achievements || 0);
            const earned = Number(draft.earned_achievements || 0);
            return earned <= total && (status?.name !== '100%' || (total > 0 && earned === total));
        }
        return true;
    }

    function next() {
        if (canContinue()) setStep((current) => Math.min(current + 1, steps.length - 1));
    }

    function submit() {
        router.post('/library-games', {
            game: {
                title: draft.title,
                publisher: draft.publisher || null,
                release_date: draft.release_date || null,
                description: draft.description || null,
                source: 'manual',
                total_achievements: Number(draft.total_achievements || 0),
                base_price_default: draft.base_price_default === '' ? null : Number(draft.base_price_default),
                create_duplicate_anyway: true,
            },
            platform_id: draft.platform_id,
            device_ids: draft.device_ids,
            ownership_copies: draft.ownership_copies.map((copy) => ({
                ownership_type_id: copy.ownership_type_id,
                physical_status_id: copy.physical_status_id,
                edition_name: copy.edition_name || null,
                base_price: copy.base_price === '' ? null : Number(copy.base_price),
                purchased_price: copy.purchased_price === '' ? null : Number(copy.purchased_price),
                purchased_at: copy.purchased_at || null,
            })),
            progress: {
                status_id: draft.status_id,
                playtime_hours: Number(draft.playtime_hours || 0),
                earned_achievements: draft.earned_achievements === '' ? null : Number(draft.earned_achievements),
                first_played_at: draft.first_played_at || null,
                last_played_at: draft.last_played_at || null,
                completed_at: draft.completed_at || null,
            },
        });
    }

    return (
        <>
            <button onClick={() => setOpen(true)} className={buttonClassName}>
                Add Game
            </button>
            {open && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4">
                    <section className="grid max-h-[92vh] w-full max-w-6xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-[34px] bg-[#b7ff63] shadow-2xl">
                        <header className="flex items-center justify-between border-b-4 border-white/70 px-8 py-6">
                            <div>
                                <h2 className="text-4xl font-black">Add Game</h2>
                                <div className="mt-3 flex gap-2">
                                    {steps.map((label, index) => (
                                        <button
                                            key={label}
                                            onClick={() => index <= step && setStep(index)}
                                            className={`h-3 w-14 rounded-full ${index <= step ? 'bg-black' : 'bg-white/70'}`}
                                            aria-label={label}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-5">
                                <span className="rounded-full bg-black px-5 py-2 text-lg font-black text-white">{steps[step]}</span>
                                <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-black p-3 text-white" aria-label="Close wizard">
                                    <X />
                                </button>
                            </div>
                        </header>

                        <div className="sl-scrollbar overflow-auto p-8">
                            {step === 0 && (
                                <div className="grid gap-7">
                                    <label className="flex h-20 items-center rounded-full border-4 border-black/25 bg-white/40 px-8 text-3xl font-black">
                                        <input value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="Search or type game title" className="min-w-0 flex-1 bg-transparent outline-none" autoFocus />
                                        <Search size={52} />
                                    </label>
                                    <div className="rounded-[28px] bg-white/45 p-7 text-2xl font-black">
                                        IGDB and Steam search are wired on the backend. This wizard currently saves manual entries while preserving the provider-first data shape.
                                    </div>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="grid grid-cols-[260px_1fr] gap-7">
                                    <div className="sl-cover-art h-[370px] rounded-[26px] bg-white shadow-xl" />
                                    <div className="grid gap-5">
                                        <input value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="Title" className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black" />
                                        <input value={draft.publisher} onChange={(event) => update('publisher', event.target.value)} placeholder="Publisher" className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black" />
                                        <div className="grid grid-cols-3 gap-5">
                                            <input value={draft.release_date} onChange={(event) => update('release_date', event.target.value)} type="date" className="rounded-2xl border-4 border-black/20 px-5 py-4 text-xl font-black" />
                                            <input value={draft.total_achievements} onChange={(event) => update('total_achievements', event.target.value)} type="number" min="0" placeholder="Achievements" className="rounded-2xl border-4 border-black/20 px-5 py-4 text-xl font-black" />
                                            <input value={draft.base_price_default} onChange={(event) => update('base_price_default', event.target.value)} type="number" step="0.01" placeholder="Base price" className="rounded-2xl border-4 border-black/20 px-5 py-4 text-xl font-black" />
                                        </div>
                                        <textarea value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="Description" className="min-h-36 rounded-2xl border-4 border-black/20 px-5 py-4 text-xl font-black" />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="grid grid-cols-4 gap-4">
                                    {references.platforms.map((item) => (
                                        <button key={item.id} onClick={() => choosePlatform(item.id)} className={`rounded-[22px] px-6 py-6 text-2xl font-black ${draft.platform_id === item.id ? 'bg-black text-white' : 'bg-white/55'}`}>
                                            {item.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="grid grid-cols-4 gap-4">
                                    {platform?.devices.map((device) => (
                                        <button key={device.id} onClick={() => toggleDevice(device.id)} className={`rounded-[22px] px-6 py-5 text-xl font-black ${draft.device_ids.includes(device.id) ? 'bg-black text-white' : 'bg-white/55'}`}>
                                            {device.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-5">
                                    {draft.ownership_copies.map((copy, index) => {
                                        const ownershipName = ownershipById.get(copy.ownership_type_id);
                                        const needsPhysicalStatus = ownershipName ? physicalLike.includes(ownershipName) : false;

                                        return (
                                            <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 rounded-[24px] bg-white/45 p-5">
                                                <select value={copy.ownership_type_id} onChange={(event) => updateCopy(index, { ownership_type_id: Number(event.target.value), physical_status_id: null })} className="rounded-2xl px-4 py-4 text-lg font-black">
                                                    {platform?.ownership_types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                                </select>
                                                <input value={copy.edition_name} onChange={(event) => updateCopy(index, { edition_name: event.target.value })} placeholder="Edition" className="rounded-2xl px-4 py-4 text-lg font-black" />
                                                <input value={copy.base_price} onChange={(event) => updateCopy(index, { base_price: event.target.value })} type="number" step="0.01" placeholder="Base price" className="rounded-2xl px-4 py-4 text-lg font-black" />
                                                <input value={copy.purchased_price} onChange={(event) => updateCopy(index, { purchased_price: event.target.value })} type="number" step="0.01" placeholder="Paid" className="rounded-2xl px-4 py-4 text-lg font-black" />
                                                <button onClick={() => removeCopy(index)} disabled={draft.ownership_copies.length === 1} className="rounded-2xl bg-[#ff3038] px-5 text-lg font-black text-white disabled:opacity-40">Remove</button>
                                                {needsPhysicalStatus && (
                                                    <select value={copy.physical_status_id ?? ''} onChange={(event) => updateCopy(index, { physical_status_id: Number(event.target.value) || null })} className="col-span-2 rounded-2xl px-4 py-4 text-lg font-black">
                                                        <option value="">Physical status required</option>
                                                        {references.physicalStatuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                                    </select>
                                                )}
                                                <input value={copy.purchased_at} onChange={(event) => updateCopy(index, { purchased_at: event.target.value })} type="date" className="rounded-2xl px-4 py-4 text-lg font-black" />
                                            </div>
                                        );
                                    })}
                                    <button onClick={addCopy} className="flex items-center gap-3 rounded-[22px] bg-black px-8 py-5 text-2xl font-black text-white">
                                        <Plus /> Add Ownership Copy
                                    </button>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="grid grid-cols-2 gap-5">
                                    <select value={draft.status_id} onChange={(event) => update('status_id', Number(event.target.value))} className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black">
                                        {availableStatuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </select>
                                    <input value={draft.playtime_hours} onChange={(event) => update('playtime_hours', event.target.value)} type="number" step="0.1" min="0" placeholder="Playtime hours" className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black" />
                                    <input value={draft.earned_achievements} onChange={(event) => update('earned_achievements', event.target.value)} type="number" min="0" placeholder="Earned achievements" className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black" />
                                    <input value={draft.first_played_at} onChange={(event) => update('first_played_at', event.target.value)} type="date" className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black" />
                                    <input value={draft.last_played_at} onChange={(event) => update('last_played_at', event.target.value)} type="date" className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black" />
                                    <input value={draft.completed_at} onChange={(event) => update('completed_at', event.target.value)} type="date" className="rounded-2xl border-4 border-black/20 px-5 py-4 text-2xl font-black" />
                                </div>
                            )}

                            {step === 6 && (
                                <div className="grid grid-cols-[260px_1fr] gap-7">
                                    <div className="sl-cover-art h-[370px] rounded-[26px] bg-white shadow-xl" />
                                    <div className="rounded-[28px] bg-white/45 p-7 text-2xl font-black">
                                        <h3 className="text-5xl font-black">{draft.title}</h3>
                                        <p className="mt-2">{draft.publisher || 'Unknown Publisher'}</p>
                                        <div className="mt-8 grid grid-cols-2 gap-4 text-xl">
                                            <div>Platform: {platform?.name}</div>
                                            <div>Status: {status?.name}</div>
                                            <div>Devices: {draft.device_ids.length}</div>
                                            <div>Ownership: {draft.ownership_copies.length}</div>
                                            <div>Achievements: {draft.earned_achievements || 0} / {draft.total_achievements || 0}</div>
                                            <div>Playtime: {draft.playtime_hours || 0} H</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <footer className="flex items-center justify-between border-t-4 border-white/70 px-8 py-6">
                            <button onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0} className="flex items-center gap-3 rounded-[20px] bg-white/65 px-8 py-4 text-2xl font-black disabled:opacity-40">
                                <ChevronLeft /> Back
                            </button>
                            {step < steps.length - 1 ? (
                                <button onClick={next} disabled={!canContinue()} className="flex items-center gap-3 rounded-[20px] bg-black px-8 py-4 text-2xl font-black text-white disabled:opacity-40">
                                    Next <ChevronRight />
                                </button>
                            ) : (
                                <button onClick={submit} disabled={!canContinue()} className="flex items-center gap-3 rounded-[20px] bg-black px-8 py-4 text-2xl font-black text-white disabled:opacity-40">
                                    <Check /> Save Game
                                </button>
                            )}
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
}
