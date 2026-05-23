import { Link, router } from '@inertiajs/react';
import {
    Archive,
    ChevronLeft,
    Clock3,
    DollarSign,
    Edit3,
    HardDrive,
    Layers3,
    Plus,
    RefreshCw,
    Save,
    Search,
    ShieldCheck,
    Trash2,
    Trophy,
    X,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import GameCard from '../Components/GameCard';
import AppLayout from '../Components/AppLayout';
import { GameCardData, ReferenceData } from '../types';

type Dlc = {
    id: number;
    owned_dlc_id: number | null;
    title: string;
    base_price: string | number | null;
    state: string;
    purchased_price: string | number | null;
    purchased_at: string | null;
};
type Mode = 'overview' | 'ownership' | 'dlcs';
type OwnershipCopyDetails = {
    id: number;
    ownership_type_id: number;
    ownership_type: string | null;
    physical_status_id: number | null;
    physical_status: string | null;
    edition_name: string | null;
    base_price: string | number | null;
    purchased_price: string | number | null;
    purchased_at: string | null;
};
type Details = {
    platform_id: number;
    device_ids: number[];
    ownership_copies: OwnershipCopyDetails[];
    platform_ownership_types: Array<{ id: number; name: string }>;
};
type OwnershipForm = {
    ownership_type_id: string;
    physical_status_id: string;
    edition_name: string;
    base_price: string;
    purchased_price: string;
    purchased_at: string;
};
type DlcForm = {
    acquisition_type: string;
    purchased_price: string;
    purchased_at: string;
};
type GameEditForm = {
    title: string;
    publisher: string;
    description: string;
    base_price_default: string;
    total_achievements: string;
    status_id: string;
    playtime_hours: string;
    earned_achievements: string;
};

const physicalLike = ['Physical', 'Pre-owned', 'Borrowed'];
const dlcAcquisitionTypes = ['Owned', 'Edition Included', 'Free'];

function formatMoney(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') return 'Unknown';

    const parsed = Number(value);
    return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : String(value);
}

function formatHours(value: number) {
    if (!Number.isFinite(value)) return '0H';
    if (Number.isInteger(value)) return `${value}H`;
    return `${value.toFixed(1)}H`;
}

function Chip({ children, active = false }: { children: ReactNode; active?: boolean }) {
    return (
        <span
            className={[
                'inline-flex items-center rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em]',
                active ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/70',
            ].join(' ')}
        >
            {children}
        </span>
    );
}

function DataTile({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    return (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
            <div className="flex items-center justify-between gap-3 text-white/35">
                <div className="text-[10px] font-black uppercase tracking-[0.22em]">{label}</div>
                {icon}
            </div>
            <div className="mt-3 truncate text-2xl font-black tracking-[-0.04em]">{value}</div>
        </div>
    );
}

function SideStat({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    return (
        <div className="rounded-[26px] border border-black/10 bg-white/75 p-4 shadow-[0_18px_38px_rgb(0_0_0/0.08)] backdrop-blur">
            <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-black text-[#b7ff63]">{icon}</div>
                <div className="min-w-0">
                    <div className="truncate text-2xl font-black tracking-[-0.04em]">{value}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/35">{label}</div>
                </div>
            </div>
        </div>
    );
}

function ModeButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={[
                'rounded-[18px] px-9 py-4 text-lg font-black transition',
                active ? 'bg-[#b7ff63] text-black' : 'text-white/45 hover:text-white',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
    return (
        <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{label}</span>
            {children}
            {error && <span className="text-xs font-black text-[#ff6068]">{error}</span>}
        </label>
    );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none placeholder:text-white/28 focus:border-[#b7ff63] ${props.className ?? ''}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={`min-h-32 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white outline-none placeholder:text-white/28 focus:border-[#b7ff63] ${props.className ?? ''}`} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className={`h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none focus:border-[#b7ff63] ${props.className ?? ''}`} />;
}

function formFromCopy(copy?: OwnershipCopyDetails, fallbackTypeId?: number): OwnershipForm {
    return {
        ownership_type_id: String(copy?.ownership_type_id ?? fallbackTypeId ?? ''),
        physical_status_id: String(copy?.physical_status_id ?? ''),
        edition_name: copy?.edition_name ?? '',
        base_price: copy?.base_price === null || copy?.base_price === undefined ? '' : String(copy.base_price),
        purchased_price: copy?.purchased_price === null || copy?.purchased_price === undefined ? '' : String(copy.purchased_price),
        purchased_at: copy?.purchased_at ?? '',
    };
}

export default function GameDetails({
    libraryGame,
    details,
    references,
    dlcs,
}: {
    libraryGame: GameCardData;
    details: Details;
    references: ReferenceData;
    dlcs: Dlc[];
}) {
    const [mode, setMode] = useState<Mode>('overview');
    const [filter, setFilter] = useState('All');
    const [query, setQuery] = useState('');
    const [editingCopyId, setEditingCopyId] = useState<number | 'new' | null>(null);
    const [ownershipForm, setOwnershipForm] = useState<OwnershipForm>(() => formFromCopy(undefined, details.platform_ownership_types[0]?.id));
    const [ownershipErrors, setOwnershipErrors] = useState<Record<string, string>>({});
    const [savingOwnership, setSavingOwnership] = useState(false);
    const [editingGame, setEditingGame] = useState(false);
    const [gameErrors, setGameErrors] = useState<Record<string, string>>({});
    const [savingGame, setSavingGame] = useState(false);
    const [gameForm, setGameForm] = useState<GameEditForm>(() => ({
        title: libraryGame.title,
        publisher: libraryGame.publisher ?? '',
        description: libraryGame.description ?? '',
        base_price_default: libraryGame.base_price_default === null || libraryGame.base_price_default === undefined ? '' : String(libraryGame.base_price_default),
        total_achievements: libraryGame.total_achievements ? String(libraryGame.total_achievements) : '',
        status_id: String(references.statuses.find((status) => status.name === libraryGame.status)?.id ?? references.statuses[0]?.id ?? ''),
        playtime_hours: String(libraryGame.playtime_hours ?? 0),
        earned_achievements: String(libraryGame.earned_achievements ?? 0),
    }));
    const [editingPlatformDevices, setEditingPlatformDevices] = useState(false);
    const [platformDeviceErrors, setPlatformDeviceErrors] = useState<Record<string, string>>({});
    const [savingPlatformDevices, setSavingPlatformDevices] = useState(false);
    const [platformDeviceForm, setPlatformDeviceForm] = useState(() => ({
        platform_id: String(details.platform_id),
        device_ids: details.device_ids.map(String),
    }));
    const [editingDlcId, setEditingDlcId] = useState<number | null>(null);
    const [dlcForm, setDlcForm] = useState<DlcForm>({ acquisition_type: 'Owned', purchased_price: '', purchased_at: '' });
    const [dlcErrors, setDlcErrors] = useState<Record<string, string>>({});
    const [savingDlc, setSavingDlc] = useState(false);
    const [refreshingDlcs, setRefreshingDlcs] = useState(false);

    const filteredDlcs = useMemo(
        () => dlcs.filter((dlc) => (filter === 'All' || dlc.state === filter) && dlc.title.toLowerCase().includes(query.toLowerCase().trim())),
        [dlcs, filter, query],
    );

    const ownership = libraryGame.ownership.length ? libraryGame.ownership : ['Unknown ownership'];
    const devices = libraryGame.devices.length ? libraryGame.devices : ['Unknown device'];
    const achievements = `${libraryGame.earned_achievements} / ${libraryGame.total_achievements || 0}`;
    const selectedOwnershipType = details.platform_ownership_types.find((type) => String(type.id) === ownershipForm.ownership_type_id);
    const needsPhysicalStatus = selectedOwnershipType ? physicalLike.includes(selectedOwnershipType.name) : false;
    const selectedPlatform = references.platforms.find((platform) => String(platform.id) === platformDeviceForm.platform_id);

    function updateOwnershipForm(patch: Partial<OwnershipForm>) {
        setOwnershipForm((current) => ({ ...current, ...patch }));
    }

    function startAddCopy() {
        const used = new Set(details.ownership_copies.map((copy) => copy.ownership_type_id));
        const nextType = details.platform_ownership_types.find((type) => !used.has(type.id)) ?? details.platform_ownership_types[0];
        setEditingCopyId('new');
        setOwnershipForm(formFromCopy(undefined, nextType?.id));
        setOwnershipErrors({});
    }

    function startEditCopy(copy: OwnershipCopyDetails) {
        setEditingCopyId(copy.id);
        setOwnershipForm(formFromCopy(copy));
        setOwnershipErrors({});
    }

    function cancelOwnershipEdit() {
        setEditingCopyId(null);
        setOwnershipErrors({});
    }

    function ownershipPayload() {
        return {
            ownership_type_id: Number(ownershipForm.ownership_type_id),
            physical_status_id: ownershipForm.physical_status_id ? Number(ownershipForm.physical_status_id) : null,
            edition_name: ownershipForm.edition_name || null,
            base_price: ownershipForm.base_price === '' ? null : Number(ownershipForm.base_price),
            purchased_price: ownershipForm.purchased_price === '' ? null : Number(ownershipForm.purchased_price),
            purchased_at: ownershipForm.purchased_at || null,
        };
    }

    function submitOwnership() {
        const options = {
            preserveScroll: true,
            onStart: () => setSavingOwnership(true),
            onFinish: () => setSavingOwnership(false),
            onSuccess: () => cancelOwnershipEdit(),
            onError: (errors: Record<string, string>) => setOwnershipErrors(errors),
        };

        if (editingCopyId === 'new') {
            router.post(`/games/${libraryGame.id}/ownership-copies`, ownershipPayload(), options);
            return;
        }

        if (typeof editingCopyId === 'number') {
            router.patch(`/ownership-copies/${editingCopyId}`, ownershipPayload(), options);
        }
    }

    function deleteCopy(copy: OwnershipCopyDetails) {
        router.delete(`/ownership-copies/${copy.id}`, {
            preserveScroll: true,
            onError: (errors) => setOwnershipErrors(errors),
        });
    }

    function updateGameForm(patch: Partial<GameEditForm>) {
        setGameForm((current) => ({ ...current, ...patch }));
    }

    function submitGameEdit() {
        router.patch(`/games/${libraryGame.id}`, {
            game: {
                title: gameForm.title,
                publisher: gameForm.publisher || null,
                description: gameForm.description || null,
                base_price_default: gameForm.base_price_default === '' ? null : Number(gameForm.base_price_default),
                total_achievements: gameForm.total_achievements === '' ? null : Number(gameForm.total_achievements),
            },
            progress: {
                status_id: Number(gameForm.status_id),
                playtime_hours: gameForm.playtime_hours === '' ? 0 : Number(gameForm.playtime_hours),
                earned_achievements: gameForm.earned_achievements === '' ? null : Number(gameForm.earned_achievements),
            },
        }, {
            preserveScroll: true,
            onStart: () => setSavingGame(true),
            onFinish: () => setSavingGame(false),
            onSuccess: () => { setEditingGame(false); setGameErrors({}); },
            onError: (errors) => setGameErrors(errors),
        });
    }

    function deleteLibraryGame() {
        if (!window.confirm(`Delete ${libraryGame.title} from your library?`)) return;
        router.delete(`/games/${libraryGame.id}`);
    }

    function updatePlatformDeviceForm(patch: Partial<typeof platformDeviceForm>) {
        setPlatformDeviceForm((current) => ({ ...current, ...patch }));
    }

    function togglePlatformDevice(deviceId: number) {
        const value = String(deviceId);
        setPlatformDeviceForm((current) => ({
            ...current,
            device_ids: current.device_ids.includes(value)
                ? current.device_ids.filter((id) => id !== value)
                : [...current.device_ids, value],
        }));
    }

    function submitPlatformDevices() {
        router.patch(`/games/${libraryGame.id}/platform-devices`, {
            platform_id: Number(platformDeviceForm.platform_id),
            device_ids: platformDeviceForm.device_ids.map(Number),
        }, {
            preserveScroll: true,
            onStart: () => setSavingPlatformDevices(true),
            onFinish: () => setSavingPlatformDevices(false),
            onSuccess: () => { setEditingPlatformDevices(false); setPlatformDeviceErrors({}); },
            onError: (errors) => setPlatformDeviceErrors(errors),
        });
    }

    function startEditDlc(dlc: Dlc) {
        setEditingDlcId(dlc.id);
        setDlcForm({
            acquisition_type: dlc.state === 'Not Owned' ? 'Owned' : dlc.state,
            purchased_price: dlc.purchased_price === null || dlc.purchased_price === undefined ? '' : String(dlc.purchased_price),
            purchased_at: dlc.purchased_at ?? '',
        });
        setDlcErrors({});
    }

    function cancelDlcEdit() {
        setEditingDlcId(null);
        setDlcErrors({});
    }

    function submitDlc(dlc: Dlc) {
        const payload = {
            dlc_id: dlc.id,
            acquisition_type: dlcForm.acquisition_type,
            purchased_price: dlcForm.purchased_price === '' ? null : Number(dlcForm.purchased_price),
            purchased_at: dlcForm.purchased_at || null,
        };
        const options = {
            preserveScroll: true,
            onStart: () => setSavingDlc(true),
            onFinish: () => setSavingDlc(false),
            onSuccess: () => cancelDlcEdit(),
            onError: (errors: Record<string, string>) => setDlcErrors(errors),
        };

        if (dlc.owned_dlc_id) {
            router.patch(`/owned-dlcs/${dlc.owned_dlc_id}`, payload, options);
            return;
        }

        router.post(`/games/${libraryGame.id}/owned-dlcs`, payload, options);
    }

    function removeDlc(dlc: Dlc) {
        if (!dlc.owned_dlc_id) return;
        router.delete(`/owned-dlcs/${dlc.owned_dlc_id}`, {
            preserveScroll: true,
            onError: (errors) => setDlcErrors(errors),
        });
    }

    function refreshDlcs() {
        router.post(`/games/${libraryGame.id}/dlcs/refresh`, {}, {
            preserveScroll: true,
            onStart: () => { setRefreshingDlcs(true); setDlcErrors({}); },
            onFinish: () => setRefreshingDlcs(false),
            onError: (errors: Record<string, string>) => setDlcErrors(errors),
        });
    }

    return (
        <AppLayout title={libraryGame.title} lockViewport>
            <section className="relative isolate h-full overflow-hidden rounded-[42px] border border-black/10 bg-[#e8eee8] px-7 pb-28 pt-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.75)]">
                <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_48%_42%,rgba(183,255,99,0.28),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(0,0,0,0.08),transparent_24%),linear-gradient(rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[length:auto,auto,38px_38px,38px_38px]" />

                <header className="mx-auto grid h-[76px] w-full max-w-[1360px] grid-cols-[108px_1fr_170px] overflow-hidden rounded-full bg-[#b7ff63] shadow-[0_18px_52px_rgb(0_0_0/0.12)]">
                    <Link href="/library" className="grid place-items-center border-r border-black/15 transition hover:bg-black hover:text-[#b7ff63]">
                        <ChevronLeft size={38} strokeWidth={4} />
                    </Link>
                    <div className="grid place-items-center px-8 text-center text-4xl font-black tracking-[-0.045em]">
                        {libraryGame.title}
                    </div>
                    <button type="button" onClick={() => setEditingGame(true)} className="flex items-center justify-center gap-3 border-l border-black/15 text-lg font-black transition hover:bg-black hover:text-[#b7ff63]">
                        <Edit3 size={22} strokeWidth={3} />
                        Edit
                    </button>
                </header>

                <div className="mx-auto mt-10 grid h-[calc(100%-150px)] w-full max-w-[1450px] items-center gap-7 xl:grid-cols-[310px_390px_minmax(0,1fr)]">
                    <aside className="grid gap-4 self-center">
                        <div className="rounded-[30px] border border-black/10 bg-white/65 p-5 shadow-[0_24px_60px_rgb(0_0_0/0.08)] backdrop-blur">
                            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/35">Publisher</div>
                            <div className="mt-2 text-2xl font-black tracking-[-0.04em]">{libraryGame.publisher || 'Unknown Publisher'}</div>
                        </div>

                        <div className="rounded-[30px] bg-black p-4 text-white shadow-[0_24px_60px_rgb(0_0_0/0.18)]">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff63]">Loadout</div>
                                    <div className="text-2xl font-black tracking-[-0.04em]">Owned As</div>
                                </div>
                                <Archive className="text-white/35" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {ownership.map((item) => <Chip key={item} active>{item}</Chip>)}
                                {devices.slice(0, 3).map((device) => <Chip key={device}>{device}</Chip>)}
                            </div>
                        </div>

                        <SideStat icon={<Trophy size={23} fill="currentColor" />} value={achievements} label="Achievements" />
                        <SideStat icon={<Clock3 size={23} />} value={formatHours(libraryGame.playtime_hours)} label="Playtime" />
                    </aside>

                    <div className="relative self-center justify-self-center">
                        <div className="absolute -left-24 top-1/2 hidden h-[3px] w-24 -translate-y-1/2 bg-black/50 xl:block" />
                        <div className="absolute -right-20 top-1/2 hidden h-[3px] w-20 -translate-y-1/2 bg-black/50 xl:block" />
                        <GameCard game={libraryGame} featured expanded={false} />
                    </div>

                    <div className="self-center">
                        {mode === 'overview' && (
                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_138px]">
                                <article className="overflow-hidden rounded-[38px] bg-black text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
                                    <div className="border-b border-white/10 p-7">
                                        <div className="flex items-start justify-between gap-5">
                                            <div>
                                                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Game Page</div>
                                                <h2 className="mt-2 text-5xl font-black tracking-[-0.065em]">Description</h2>
                                            </div>
                                            <div className="rounded-[24px] bg-[#b7ff63] px-5 py-2 text-6xl font-black leading-none text-black">”</div>
                                        </div>
                                        <p className="mt-7 min-h-[205px] max-w-[760px] text-2xl font-black leading-tight tracking-[-0.025em] text-white/88">
                                            {libraryGame.description || 'No description saved yet. This archive entry is waiting for a clean note.'}
                                        </p>
                                    </div>

                                    <div className="grid gap-3 p-5 md:grid-cols-3">
                                        <button type="button" onClick={() => setEditingPlatformDevices(true)} className="text-left">
                                            <DataTile label="Platform" value={libraryGame.platform} icon={<ShieldCheck size={20} />} />
                                        </button>
                                        <DataTile label="Base Value" value={formatMoney(libraryGame.base_price_default)} icon={<DollarSign size={20} />} />
                                        <button type="button" onClick={() => setEditingPlatformDevices(true)} className="text-left">
                                            <DataTile label="Devices" value={devices.join(', ')} icon={<HardDrive size={20} />} />
                                        </button>
                                    </div>
                                </article>

                                <div className="grid gap-4">
                                    <button onClick={() => setMode('ownership')} className="rounded-[32px] bg-[#b7ff63] p-5 text-left shadow-[0_22px_55px_rgb(0_0_0/0.14)] transition hover:-translate-y-1">
                                        <DollarSign size={30} strokeWidth={3} />
                                        <div className="mt-8 text-2xl font-black leading-none tracking-[-0.04em] [writing-mode:vertical-rl]">Ownership & Prices</div>
                                    </button>
                                    <div className="rounded-[32px] bg-[#b7ff63]/75 p-5 text-left shadow-[0_22px_55px_rgb(0_0_0/0.08)]">
                                        <Layers3 size={30} strokeWidth={3} />
                                        <div className="mt-10 text-xl font-black leading-none tracking-[-0.04em] [writing-mode:vertical-rl]">More Soon</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === 'ownership' && (
                            <article className="rounded-[38px] bg-black p-6 text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
                                <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-5">
                                    <div>
                                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Vault</div>
                                        <h2 className="mt-2 text-5xl font-black tracking-[-0.065em]">Ownership & Prices</h2>
                                    </div>
                                    <button onClick={startAddCopy} className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black">
                                        <Plus size={18} strokeWidth={3} /> Add
                                    </button>
                                </div>

                                <div className="mt-5 grid max-h-[425px] gap-3 overflow-auto pr-1">
                                    {editingCopyId && (
                                        <div className="rounded-[24px] border border-[#b7ff63]/45 bg-[#b7ff63]/10 p-4">
                                            <div className="mb-4 flex items-center justify-between gap-4">
                                                <div className="text-xl font-black tracking-[-0.03em]">{editingCopyId === 'new' ? 'Add Ownership Copy' : 'Edit Ownership Copy'}</div>
                                                <button onClick={cancelOwnershipEdit} className="grid size-10 place-items-center rounded-full bg-white/10 text-white/60"><X size={18} /></button>
                                            </div>
                                            <div className="grid gap-3 md:grid-cols-3">
                                                <Field label="Type" error={ownershipErrors.ownership_type_id}>
                                                    <Select value={ownershipForm.ownership_type_id} onChange={(event) => updateOwnershipForm({ ownership_type_id: event.target.value, physical_status_id: '' })}>
                                                        {details.platform_ownership_types.map((type) => <option key={type.id} value={type.id} className="text-black">{type.name}</option>)}
                                                    </Select>
                                                </Field>
                                                {needsPhysicalStatus && (
                                                    <Field label="Physical Status" error={ownershipErrors.physical_status_id}>
                                                        <Select value={ownershipForm.physical_status_id} onChange={(event) => updateOwnershipForm({ physical_status_id: event.target.value })}>
                                                            <option value="" className="text-black">Required</option>
                                                            {references.physicalStatuses.map((status) => <option key={status.id} value={status.id} className="text-black">{status.name}</option>)}
                                                        </Select>
                                                    </Field>
                                                )}
                                                <Field label="Edition" error={ownershipErrors.edition_name}>
                                                    <TextInput value={ownershipForm.edition_name} onChange={(event) => updateOwnershipForm({ edition_name: event.target.value })} placeholder="Standard" />
                                                </Field>
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
                                            <button onClick={submitOwnership} disabled={savingOwnership} className="mt-4 flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                                                <Save size={18} /> {savingOwnership ? 'Saving' : 'Save Copy'}
                                            </button>
                                        </div>
                                    )}

                                    {details.ownership_copies.map((copy, index) => (
                                        <div key={copy.id} className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.06] p-4 md:grid-cols-[1fr_135px_135px_120px] md:items-center">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Copy {index + 1}</div>
                                                <div className="mt-1 text-2xl font-black tracking-[-0.04em]">{copy.ownership_type || 'Unknown'}</div>
                                                <div className="mt-1 text-xs font-black text-white/35">{copy.edition_name || copy.physical_status || 'Standard'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Base Value</div>
                                                <div className="mt-1 text-xl font-black text-[#b7ff63]">{formatMoney(copy.base_price)}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Paid</div>
                                                <div className="mt-1 text-xl font-black text-white/60">{formatMoney(copy.purchased_price)}</div>
                                            </div>
                                            <div className="flex gap-2 md:justify-end">
                                                <button onClick={() => startEditCopy(copy)} className="grid size-11 place-items-center rounded-2xl bg-white/10 text-white/70 hover:text-white"><Edit3 size={18} /></button>
                                                <button onClick={() => deleteCopy(copy)} className="grid size-11 place-items-center rounded-2xl bg-[#d72835]/90 text-white disabled:opacity-35" disabled={details.ownership_copies.length === 1}><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        )}

                        {mode === 'dlcs' && (
                            <article className="rounded-[38px] bg-black p-6 text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex h-14 min-w-[260px] flex-1 items-center gap-3 rounded-full bg-white/10 px-5 text-base font-black shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]">
                                        <Search size={22} />
                                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search DLCs" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/35" />
                                    </label>
                                    <button type="button" onClick={refreshDlcs} disabled={refreshingDlcs} className="flex h-14 items-center gap-2 rounded-full bg-[#b7ff63] px-5 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                                        <RefreshCw size={18} className={refreshingDlcs ? 'animate-spin' : ''} />
                                        {refreshingDlcs ? 'Refreshing' : 'Refresh'}
                                    </button>
                                    {['All', 'Owned', 'Edition Included', 'Free', 'Not Owned'].map((item) => (
                                        <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-5 py-3 text-sm font-black ${filter === item ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/45'}`}>
                                            {item}
                                        </button>
                                    ))}
                                </div>
                                {dlcErrors.dlcs && <div className="mt-3 rounded-[18px] border border-[#ff6068]/40 bg-[#ff6068]/10 px-4 py-3 text-sm font-black text-[#ff858b]">{dlcErrors.dlcs}</div>}

                                <div className="mt-5 max-h-[475px] space-y-3 overflow-auto pr-1">
                                    {filteredDlcs.map((dlc) => (
                                        <div key={dlc.id} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 text-lg font-black">
                                            <div className="grid gap-3 md:grid-cols-[1fr_165px_120px_100px] md:items-center">
                                                <span className="truncate">{dlc.title}</span>
                                                <span className={`rounded-full px-4 py-2 text-center text-xs uppercase tracking-[0.12em] ${dlc.state === 'Not Owned' ? 'bg-white/10 text-white/50' : 'bg-[#b7ff63] text-black'}`}>{dlc.state}</span>
                                                <span className="text-right text-white/70">{formatMoney(dlc.purchased_price ?? dlc.base_price)}</span>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => startEditDlc(dlc)} className="grid size-10 place-items-center rounded-2xl bg-white/10 text-white/70 hover:text-white"><Edit3 size={17} /></button>
                                                    <button onClick={() => removeDlc(dlc)} disabled={!dlc.owned_dlc_id} className="grid size-10 place-items-center rounded-2xl bg-[#d72835]/90 text-white disabled:opacity-30"><Trash2 size={17} /></button>
                                                </div>
                                            </div>
                                            {editingDlcId === dlc.id && (
                                                <div className="mt-4 rounded-[20px] border border-[#b7ff63]/45 bg-[#b7ff63]/10 p-4">
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
                                                    <div className="mt-4 flex gap-2">
                                                        <button onClick={() => submitDlc(dlc)} disabled={savingDlc} className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50"><Save size={17} /> {savingDlc ? 'Saving' : 'Save DLC'}</button>
                                                        <button onClick={cancelDlcEdit} className="rounded-[18px] bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {!filteredDlcs.length && <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-8 text-2xl font-black">No DLCs saved for this game.</div>}
                                </div>
                            </article>
                        )}
                    </div>
                </div>

                <div className="fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 rounded-[22px] bg-black p-2 shadow-[0_18px_34px_rgb(0_0_0/0.25)]">
                    <ModeButton active={mode === 'overview'} onClick={() => setMode('overview')}>Game Page</ModeButton>
                    <ModeButton active={mode === 'dlcs'} onClick={() => setMode('dlcs')}>DLCs Page</ModeButton>
                </div>

                <button
                    type="button"
                    onClick={deleteLibraryGame}
                    className="fixed bottom-8 left-8 z-30 flex items-center gap-3 rounded-[20px] bg-[#d72835] px-12 py-5 text-xl font-black text-white shadow-[0_18px_34px_rgb(0_0_0/0.18)] transition hover:-translate-y-0.5"
                >
                    <Trash2 size={22} strokeWidth={3} />
                    Delete
                </button>

                {editingGame && (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-5 backdrop-blur-sm">
                        <section className="w-full max-w-3xl rounded-[34px] border border-white/10 bg-black p-6 text-white shadow-[0_36px_120px_rgb(0_0_0/0.45)]">
                            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                                <div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Edit Entry</div>
                                    <h2 className="mt-2 text-4xl font-black tracking-[-0.06em]">Game Details</h2>
                                </div>
                                <button onClick={() => setEditingGame(false)} className="grid size-11 place-items-center rounded-full bg-white/10 text-white/60"><X size={20} /></button>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <Field label="Title" error={gameErrors['game.title']}>
                                    <TextInput value={gameForm.title} onChange={(event) => updateGameForm({ title: event.target.value })} />
                                </Field>
                                <Field label="Publisher" error={gameErrors['game.publisher']}>
                                    <TextInput value={gameForm.publisher} onChange={(event) => updateGameForm({ publisher: event.target.value })} placeholder="Unknown Publisher" />
                                </Field>
                                <Field label="Status" error={gameErrors['progress.status_id']}>
                                    <Select value={gameForm.status_id} onChange={(event) => updateGameForm({ status_id: event.target.value })}>
                                        {references.statuses.map((status) => <option key={status.id} value={status.id} className="text-black">{status.name}</option>)}
                                    </Select>
                                </Field>
                                <Field label="Playtime Hours" error={gameErrors['progress.playtime_hours']}>
                                    <TextInput type="number" step="0.1" value={gameForm.playtime_hours} onChange={(event) => updateGameForm({ playtime_hours: event.target.value })} />
                                </Field>
                                <Field label="Earned Achievements" error={gameErrors['progress.earned_achievements']}>
                                    <TextInput type="number" value={gameForm.earned_achievements} onChange={(event) => updateGameForm({ earned_achievements: event.target.value })} />
                                </Field>
                                <Field label="Total Achievements" error={gameErrors['game.total_achievements']}>
                                    <TextInput type="number" value={gameForm.total_achievements} onChange={(event) => updateGameForm({ total_achievements: event.target.value })} />
                                </Field>
                                <Field label="Base Value" error={gameErrors['game.base_price_default']}>
                                    <TextInput type="number" step="0.01" value={gameForm.base_price_default} onChange={(event) => updateGameForm({ base_price_default: event.target.value })} />
                                </Field>
                                <div className="md:col-span-2">
                                    <Field label="Description" error={gameErrors['game.description']}>
                                        <TextArea value={gameForm.description} onChange={(event) => updateGameForm({ description: event.target.value })} placeholder="No description saved yet." />
                                    </Field>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setEditingGame(false)} className="rounded-[18px] bg-white/10 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-white">Cancel</button>
                                <button onClick={submitGameEdit} disabled={savingGame} className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                                    <Save size={18} /> {savingGame ? 'Saving' : 'Save'}
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                {editingPlatformDevices && (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-5 backdrop-blur-sm">
                        <section className="w-full max-w-3xl rounded-[34px] border border-white/10 bg-black p-6 text-white shadow-[0_36px_120px_rgb(0_0_0/0.45)]">
                            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                                <div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Edit Entry</div>
                                    <h2 className="mt-2 text-4xl font-black tracking-[-0.06em]">Platform & Devices</h2>
                                </div>
                                <button onClick={() => setEditingPlatformDevices(false)} className="grid size-11 place-items-center rounded-full bg-white/10 text-white/60"><X size={20} /></button>
                            </div>

                            <div className="mt-5 grid gap-5">
                                <Field label="Platform" error={platformDeviceErrors.platform_id}>
                                    <Select
                                        value={platformDeviceForm.platform_id}
                                        onChange={(event) => {
                                            const nextPlatform = references.platforms.find((platform) => String(platform.id) === event.target.value);
                                            updatePlatformDeviceForm({
                                                platform_id: event.target.value,
                                                device_ids: nextPlatform?.devices[0] ? [String(nextPlatform.devices[0].id)] : [],
                                            });
                                        }}
                                    >
                                        {references.platforms.map((platform) => <option key={platform.id} value={platform.id} className="text-black">{platform.name}</option>)}
                                    </Select>
                                </Field>

                                <div>
                                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Devices</div>
                                    <div className="grid max-h-[300px] gap-2 overflow-auto rounded-[22px] border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-2 md:grid-cols-3">
                                        {(selectedPlatform?.devices ?? []).map((device) => {
                                            const active = platformDeviceForm.device_ids.includes(String(device.id));
                                            return (
                                                <button
                                                    key={device.id}
                                                    type="button"
                                                    onClick={() => togglePlatformDevice(device.id)}
                                                    className={`rounded-2xl px-4 py-3 text-left text-sm font-black ${active ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/55'}`}
                                                >
                                                    {device.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {platformDeviceErrors.device_ids && <div className="mt-2 text-xs font-black text-[#ff6068]">{platformDeviceErrors.device_ids}</div>}
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white/55">
                                    Platform changes are blocked when existing ownership copies are not compatible with the selected platform.
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setEditingPlatformDevices(false)} className="rounded-[18px] bg-white/10 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-white">Cancel</button>
                                <button onClick={submitPlatformDevices} disabled={savingPlatformDevices} className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                                    <Save size={18} /> {savingPlatformDevices ? 'Saving' : 'Save'}
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </section>
        </AppLayout>
    );
}
