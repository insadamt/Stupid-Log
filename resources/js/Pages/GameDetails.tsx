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
import AppLayout from '../Components/AppLayout';
import GameCard from '../Components/GameCard';
import PlatformIcon from '../Components/PlatformIcon';
import { statusPillStyle } from '../statusColors';
import { GameCardData, ReferenceData } from '../types';

type Dlc = {
    id: number;
    owned_dlc_id: number | null;
    title: string;
    cover_url?: string | null;
    base_price: string | number | null;
    state: string;
    purchased_price: string | number | null;
    purchased_at: string | null;
};

type Mode = 'overview' | 'ownership' | 'dlcs';
type EditTab = 'basics' | 'progress' | 'platform' | 'description';

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
    completed_at: string;
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

function statusTone(state: string) {
    if (state === 'Not Owned') return 'bg-white/10 text-white/45 ring-white/10';
    if (state === 'Edition Included') return 'bg-[#d7ffc0] text-black ring-[#d7ffc0]';
    return 'bg-[#b7ff63] text-black ring-[#b7ff63]';
}

function Chip({ children, active = false }: { children: ReactNode; active?: boolean }) {
    return (
        <span
            className={[
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em]',
                active ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/68',
            ].join(' ')}
        >
            {children}
        </span>
    );
}

function MetricTile({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    return (
        <div className="rounded-[28px] border border-black/10 bg-white/70 p-4 shadow-[0_18px_44px_rgb(0_0_0/0.075)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-black/38">{label}</div>
                <div className="grid size-10 place-items-center rounded-2xl bg-black text-[#b7ff63]">{icon}</div>
            </div>
            <div className="mt-3 truncate text-[26px] font-black leading-none tracking-[-0.045em] text-black">{value}</div>
        </div>
    );
}


function DeviceLoadoutTile({ devices }: { devices: string[] }) {
    const visible = devices.slice(0, 4);
    const extra = Math.max(0, devices.length - visible.length);

    return (
        <div className="min-w-0 rounded-[28px] border border-black/10 bg-white/70 p-4 shadow-[0_18px_44px_rgb(0_0_0/0.075)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-black/38">Devices</div>
                <div className="grid size-10 place-items-center rounded-2xl bg-black text-[#b7ff63]">
                    <HardDrive size={22} />
                </div>
            </div>

            <div className="mt-3 text-[24px] font-black leading-none tracking-[-0.045em] text-black">
                {devices.length} {devices.length === 1 ? 'device' : 'devices'}
            </div>

            <div className="mt-3 flex max-h-[62px] min-w-0 flex-wrap gap-2 overflow-hidden">
                {visible.map((device) => (
                    <span key={device} className="max-w-[108px] truncate rounded-full bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#b7ff63]">
                        {device}
                    </span>
                ))}
                {extra > 0 && (
                    <span className="rounded-full bg-black/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-black/55">
                        +{extra}
                    </span>
                )}
            </div>
        </div>
    );
}

function BlackTile({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    return (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
            <div className="flex items-center justify-between gap-3 text-white/35">
                <div className="text-[10px] font-black uppercase tracking-[0.22em]">{label}</div>
                {icon}
            </div>
            <div className="mt-3 truncate text-[24px] font-black leading-none tracking-[-0.04em]">{value}</div>
        </div>
    );
}

function ModeButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'rounded-[19px] px-7 py-4 text-base font-black transition hover:-translate-y-0.5',
                active ? 'bg-[#b7ff63] text-black shadow-[inset_0_-4px_0_rgb(0_0_0/0.12)]' : 'text-white/42 hover:bg-white/10 hover:text-white',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
    return (
        <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">{label}</span>
            {children}
            {error && <span className="text-xs font-black text-[#ff6068]">{error}</span>}
        </label>
    );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={`h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none placeholder:text-white/28 focus:border-[#b7ff63] ${props.className ?? ''}`}
        />
    );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={`min-h-32 w-full min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white outline-none placeholder:text-white/28 focus:border-[#b7ff63] ${props.className ?? ''}`}
        />
    );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={`h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none focus:border-[#b7ff63] ${props.className ?? ''}`}
        />
    );
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

function DlcCover({ dlc }: { dlc: Dlc }) {
    if (dlc.cover_url) {
        return <img src={dlc.cover_url} alt={dlc.title} className="h-16 w-24 rounded-[18px] object-cover shadow-[0_12px_22px_rgb(0_0_0/0.22)]" />;
    }

    return (
        <div className="grid h-16 w-24 place-items-center rounded-[18px] bg-white/10 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
            No Cover
        </div>
    );
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
    const [platformQuery, setPlatformQuery] = useState('');
    const [deviceQuery, setDeviceQuery] = useState('');
    const [editingCopyId, setEditingCopyId] = useState<number | 'new' | null>(null);
    const [ownershipForm, setOwnershipForm] = useState<OwnershipForm>(() => formFromCopy(undefined, details.platform_ownership_types[0]?.id));
    const [ownershipErrors, setOwnershipErrors] = useState<Record<string, string>>({});
    const [savingOwnership, setSavingOwnership] = useState(false);
    const [editingGame, setEditingGame] = useState(false);
    const [editTab, setEditTab] = useState<EditTab>('basics');
    const [gameErrors, setGameErrors] = useState<Record<string, string>>({});
    const [savingGame, setSavingGame] = useState(false);
    const [pendingGameStatusId, setPendingGameStatusId] = useState<string | null>(null);
    const [gameCompletionDateDraft, setGameCompletionDateDraft] = useState(new Date().toISOString().slice(0, 10));
    const [gameForm, setGameForm] = useState<GameEditForm>(() => ({
        title: libraryGame.title,
        publisher: libraryGame.publisher ?? '',
        description: libraryGame.description ?? '',
        base_price_default: libraryGame.base_price_default === null || libraryGame.base_price_default === undefined ? '' : String(libraryGame.base_price_default),
        total_achievements: libraryGame.total_achievements ? String(libraryGame.total_achievements) : '',
        status_id: String(references.statuses.find((status) => status.name === libraryGame.status)?.id ?? references.statuses[0]?.id ?? ''),
        playtime_hours: String(libraryGame.playtime_hours ?? 0),
        earned_achievements: String(libraryGame.earned_achievements ?? 0),
        completed_at: libraryGame.completed_at ?? '',
    }));
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
    const selectedGameStatus = references.statuses.find((status) => String(status.id) === gameForm.status_id);
    const gameHasAchievements = Number(gameForm.total_achievements || 0) > 0;
    const ownedDlcCount = dlcs.filter((dlc) => dlc.state !== 'Not Owned').length;
    const editingDlc = dlcs.find((dlc) => dlc.id === editingDlcId) ?? null;
    const editingCopy = typeof editingCopyId === 'number' ? details.ownership_copies.find((copy) => copy.id === editingCopyId) ?? null : null;
    const filteredPlatforms = references.platforms.filter((platform) =>
        platform.name.toLowerCase().includes(platformQuery.toLowerCase().trim()),
    );
    const filteredDevices = (selectedPlatform?.devices ?? []).filter((device) =>
        device.name.toLowerCase().includes(deviceQuery.toLowerCase().trim()),
    );


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
            onError: (errors: Record<string, string>) => setOwnershipErrors(errors),
        });
    }

    function updateGameForm(patch: Partial<GameEditForm>) {
        setGameForm((current) => ({ ...current, ...patch }));
    }

    function updateGameStatus(statusId: string) {
        const nextStatus = references.statuses.find((status) => String(status.id) === statusId);
        if (nextStatus?.name === 'Completed' || nextStatus?.name === '100%') {
            setPendingGameStatusId(statusId);
            setGameCompletionDateDraft(gameForm.completed_at || new Date().toISOString().slice(0, 10));
            return;
        }

        setGameForm((current) => ({
            ...current,
            status_id: statusId,
            earned_achievements: nextStatus?.name === '100%' && Number(current.total_achievements) > 0 ? current.total_achievements : current.earned_achievements,
            completed_at: '',
        }));
    }

    function applyGameCompletedStatus() {
        if (!pendingGameStatusId) return;
        const nextStatus = references.statuses.find((status) => String(status.id) === pendingGameStatusId);

        setGameForm((current) => ({
            ...current,
            status_id: pendingGameStatusId,
            earned_achievements: nextStatus?.name === '100%' && Number(current.total_achievements) > 0 ? current.total_achievements : current.earned_achievements,
            completed_at: gameCompletionDateDraft || new Date().toISOString().slice(0, 10),
        }));
        setPendingGameStatusId(null);
    }

    function platformDevicesChanged() {
        const savedDeviceIds = details.device_ids.map(String).sort().join('|');
        const nextDeviceIds = platformDeviceForm.device_ids.map(String).sort().join('|');

        return platformDeviceForm.platform_id !== String(details.platform_id) || savedDeviceIds !== nextDeviceIds;
    }

    function savePlatformDevicesAfterGame() {
        router.patch(`/games/${libraryGame.id}/platform-devices`, {
            platform_id: Number(platformDeviceForm.platform_id),
            device_ids: platformDeviceForm.device_ids.map(Number),
        }, {
            preserveScroll: true,
            onStart: () => setSavingPlatformDevices(true),
            onFinish: () => setSavingPlatformDevices(false),
            onSuccess: () => {
                setPlatformDeviceErrors({});
                setEditingGame(false);
            },
            onError: (errors: Record<string, string>) => setPlatformDeviceErrors(errors),
        });
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
                completed_at: gameForm.completed_at || null,
            },
        }, {
            preserveScroll: true,
            onStart: () => setSavingGame(true),
            onFinish: () => setSavingGame(false),
            onSuccess: () => {
                setGameErrors({});

                if (platformDevicesChanged()) {
                    savePlatformDevicesAfterGame();
                    return;
                }

                setEditingGame(false);
            },
            onError: (errors: Record<string, string>) => setGameErrors(errors),
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
            onError: (errors: Record<string, string>) => setDlcErrors(errors),
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
            <section className="relative isolate h-full overflow-hidden rounded-[44px] border border-black/10 bg-[#e8eee8] px-7 pb-24 pt-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.75)]">
                <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_42%,rgba(183,255,99,0.24),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(0,0,0,0.08),transparent_24%),linear-gradient(rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[length:auto,auto,38px_38px,38px_38px]" />
                <div className="pointer-events-none absolute left-[42%] top-[53%] -z-10 h-[380px] w-[740px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b7ff63]/18 blur-3xl" />

                <header className="mx-auto grid h-[72px] w-full max-w-[1430px] grid-cols-[96px_1fr_auto_auto] overflow-hidden rounded-full bg-[#b7ff63] shadow-[0_18px_52px_rgb(0_0_0/0.12)]">
                    <Link href="/library" className="grid place-items-center border-r border-black/15 transition hover:bg-black hover:text-[#b7ff63]" aria-label="Back to library">
                        <ChevronLeft size={36} strokeWidth={4} />
                    </Link>
                    <div className="flex min-w-0 items-center justify-center px-8 text-center">
                        <div className="truncate text-[36px] font-black leading-none tracking-[-0.05em]">{libraryGame.title}</div>
                    </div>
                    <button type="button" onClick={() => { setEditTab('basics'); setEditingGame(true); }} className="flex items-center justify-center gap-3 border-l border-black/15 px-8 text-lg font-black transition hover:bg-black hover:text-[#b7ff63]">
                        <Edit3 size={22} strokeWidth={3} />
                        Edit
                    </button>
                    <button type="button" onClick={deleteLibraryGame} className="flex items-center justify-center gap-3 border-l border-black/15 px-8 text-lg font-black text-[#b91c1c] transition hover:bg-[#d72835] hover:text-white">
                        <Trash2 size={22} strokeWidth={3} />
                        Delete
                    </button>
                </header>

                <main
                    className={[
                        'mx-auto mt-8 grid h-[calc(100%-128px)] w-full max-w-[1460px] items-center',
                        mode === 'overview' ? 'grid-cols-[260px_370px_minmax(0,1fr)] gap-10' : 'grid-cols-[370px_minmax(0,1fr)] gap-9',
                    ].join(' ')}
                >
                    {mode === 'overview' && (
                        <aside className="grid min-w-0 gap-3 self-center">
                            <MetricTile icon={<Trophy size={22} fill="currentColor" />} value={achievements} label="Achievements" />
                            <MetricTile icon={<Clock3 size={22} />} value={formatHours(libraryGame.playtime_hours)} label="Playtime" />
                            <MetricTile icon={<DollarSign size={22} />} value={formatMoney(libraryGame.base_price_default)} label="Base Value" />
                            <DeviceLoadoutTile devices={devices} />
                        </aside>
                    )}

                    <section
                        className={[
                            'relative grid h-[610px] w-full place-items-center self-center',
                            mode === 'overview'
                                ? 'rounded-[44px] border border-black/10 bg-black/[0.035] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.45)]'
                                : 'place-items-center',
                        ].join(' ')}
                    >
                        <div className="pointer-events-none absolute inset-x-8 top-8 h-24 rounded-full bg-[#b7ff63]/28 blur-3xl" />
                        <div className="absolute -bottom-6 h-12 w-[300px] rounded-full bg-black/16 blur-xl" />
                        <GameCard game={libraryGame} featured expanded={false} />
                    </section>

                    <section className="min-w-0 self-center">
                        {mode === 'overview' && (
                            <article className="overflow-hidden rounded-[40px] bg-black text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
                                <div className="p-7">
                                    <div className="flex items-start justify-between gap-5">
                                        <div className="min-w-0">
                                            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Game Page</div>
                                            <h2 className="mt-2 text-[46px] font-black leading-[0.9] tracking-[-0.065em]">Description</h2>
                                        </div>
                                        <div className="grid size-[72px] shrink-0 place-items-center rounded-[25px] bg-[#b7ff63] text-black">
                                            <ShieldCheck size={32} strokeWidth={3} />
                                        </div>
                                    </div>

                                    <p className="mt-7 min-h-[210px] max-w-[780px] text-[21px] font-black leading-tight tracking-[-0.025em] text-white/84">
                                        {libraryGame.description || 'No description saved yet. This archive entry is waiting for a clean note.'}
                                    </p>
                                </div>

                                <div className="grid gap-3 border-t border-white/10 p-5 md:grid-cols-2">
                                    <BlackTile label="Publisher" value={libraryGame.publisher || 'Unknown'} icon={<Archive size={20} />} />
                                    <BlackTile label="Copies" value={details.ownership_copies.length} icon={<Layers3 size={20} />} />
                                </div>
                            </article>
                        )}

                        {mode === 'ownership' && (
                            <article className="rounded-[40px] bg-black p-6 text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
                                <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-5">
                                    <div>
                                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Vault</div>
                                        <h2 className="mt-2 text-[46px] font-black leading-none tracking-[-0.065em]">Ownership & Prices</h2>
                                    </div>
                                    <button type="button" onClick={startAddCopy} className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:-translate-y-0.5">
                                        <Plus size={18} strokeWidth={3} /> Add Copy
                                    </button>
                                </div>

                                <div className="mt-5 grid max-h-[472px] gap-3 overflow-auto pr-1">
                                    {details.ownership_copies.map((copy, index) => (
                                        <div key={copy.id} className="grid gap-3 rounded-[26px] border border-white/10 bg-white/[0.06] p-4 md:grid-cols-[1fr_132px_132px_112px] md:items-center">
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
                                                <div className="mt-1 text-xl font-black text-white/70">{formatMoney(copy.purchased_price)}</div>
                                            </div>
                                            <div className="flex gap-2 md:justify-end">
                                                <button type="button" onClick={() => startEditCopy(copy)} className="grid size-11 place-items-center rounded-2xl bg-white/10 text-white/70 hover:text-white"><Edit3 size={18} /></button>
                                                <button type="button" onClick={() => deleteCopy(copy)} className="grid size-11 place-items-center rounded-2xl bg-[#d72835]/90 text-white disabled:opacity-35" disabled={details.ownership_copies.length === 1}><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        )}

                        {mode === 'dlcs' && (
                            <article className="rounded-[40px] bg-black p-6 text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
                                <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-5">
                                    <div className="mr-auto">
                                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Expansion Bay</div>
                                        <h2 className="mt-1 text-[42px] font-black leading-none tracking-[-0.065em]">DLC Archive</h2>
                                    </div>
                                    <label className="flex h-14 min-w-[260px] items-center gap-3 rounded-full bg-white/10 px-5 text-base font-black shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]">
                                        <Search size={22} />
                                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search DLCs" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/35" />
                                    </label>
                                    <button type="button" onClick={refreshDlcs} disabled={refreshingDlcs} className="flex h-14 items-center gap-2 rounded-full bg-[#b7ff63] px-5 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                                        <RefreshCw size={18} className={refreshingDlcs ? 'animate-spin' : ''} />
                                        {refreshingDlcs ? 'Refreshing' : 'Refresh'}
                                    </button>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {['All', 'Owned', 'Edition Included', 'Free', 'Not Owned'].map((item) => (
                                        <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-5 py-3 text-sm font-black ${filter === item ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/45 hover:text-white'}`}>
                                            {item}
                                        </button>
                                    ))}
                                </div>
                                {dlcErrors.dlcs && <div className="mt-3 rounded-[18px] border border-[#ff6068]/40 bg-[#ff6068]/10 px-4 py-3 text-sm font-black text-[#ff858b]">{dlcErrors.dlcs}</div>}

                                <div className="mt-5 max-h-[420px] space-y-3 overflow-auto pr-1">
                                    {filteredDlcs.map((dlc) => (
                                        <div key={dlc.id} className="rounded-[26px] border border-white/10 bg-white/[0.06] p-4 text-lg font-black">
                                            <div className="grid gap-4 md:grid-cols-[104px_minmax(0,1fr)_165px_120px_100px] md:items-center">
                                                <DlcCover dlc={dlc} />
                                                <span className="truncate">{dlc.title}</span>
                                                <span className={`rounded-full px-4 py-2 text-center text-xs uppercase tracking-[0.12em] ring-1 ${statusTone(dlc.state)}`}>{dlc.state}</span>
                                                <span className="text-right text-white/72">{formatMoney(dlc.purchased_price ?? dlc.base_price)}</span>
                                                <div className="flex justify-end gap-2">
                                                    <button type="button" onClick={() => startEditDlc(dlc)} className="grid size-10 place-items-center rounded-2xl bg-white/10 text-white/70 hover:text-white"><Edit3 size={17} /></button>
                                                    <button type="button" onClick={() => removeDlc(dlc)} disabled={!dlc.owned_dlc_id} className="grid size-10 place-items-center rounded-2xl bg-[#d72835]/90 text-white disabled:opacity-30"><Trash2 size={17} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {!filteredDlcs.length && <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-8 text-2xl font-black">No DLCs saved for this game.</div>}
                                </div>
                            </article>
                        )}
                    </section>
                </main>

                <div className="fixed bottom-7 left-1/2 z-30 flex -translate-x-1/2 rounded-[24px] bg-black p-2 shadow-[0_18px_34px_rgb(0_0_0/0.25)]">
                    <ModeButton active={mode === 'overview'} onClick={() => setMode('overview')}>Game Page</ModeButton>
                    <ModeButton active={mode === 'ownership'} onClick={() => setMode('ownership')}>Ownership</ModeButton>
                    <ModeButton active={mode === 'dlcs'} onClick={() => setMode('dlcs')}>DLCs Page</ModeButton>
                </div>

                {editingCopyId && (
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
                                    <div className="mt-3 text-sm font-black text-white/40">
                                        {editingCopyId === 'new' ? 'Create a new owned copy.' : editingCopy?.edition_name || editingCopy?.physical_status || 'Standard edition'}
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
                )}

                {editingDlc && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">
                        <section className="grid w-full max-w-4xl overflow-hidden rounded-[36px] border border-white/10 bg-black text-white shadow-[0_36px_120px_rgb(0_0_0/0.45)] md:grid-cols-[270px_minmax(0,1fr)]">
                            <aside className="bg-[#b7ff63] p-5 text-black">
                                <div className="rounded-[28px] bg-black p-3 shadow-[0_22px_48px_rgb(0_0_0/0.25)]">
                                    {editingDlc.cover_url ? (
                                        <img src={editingDlc.cover_url} alt={editingDlc.title} className="h-[170px] w-full rounded-[22px] object-cover" />
                                    ) : (
                                        <div className="grid h-[170px] place-items-center rounded-[22px] bg-white/10 text-sm font-black uppercase tracking-[0.18em] text-[#b7ff63]">No Cover</div>
                                    )}
                                </div>
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
                )}

                {editingGame && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">
                        <section className="relative grid max-h-[90vh] w-full max-w-6xl grid-cols-[300px_minmax(0,1fr)] overflow-hidden rounded-[38px] border border-white/10 bg-black text-white shadow-[0_36px_120px_rgb(0_0_0/0.45)]">
                            <aside className="bg-[#b7ff63] p-5 text-black">
                                <div className="overflow-hidden rounded-[28px] bg-black shadow-[0_22px_48px_rgb(0_0_0/0.25)]">
                                    {libraryGame.cover_url ? (
                                        <img src={libraryGame.cover_url} alt={libraryGame.title} className="h-[390px] w-full object-cover" />
                                    ) : (
                                        <div className="grid h-[390px] place-items-center text-xl font-black text-[#b7ff63]">No Cover</div>
                                    )}
                                </div>

                                <div className="mt-5 rounded-[26px] bg-black p-4 text-white">
                                    <div className="mb-3 grid size-12 place-items-center rounded-[18px] bg-white p-1.5">
                                        <img src="/images/stupid-log/stupid-log.png" alt="" className="size-full object-contain" />
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]">Current Entry</div>
                                    <div className="mt-2 truncate text-3xl font-black leading-[0.92] tracking-[-0.06em]">{libraryGame.title}</div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Chip active><PlatformIcon platform={libraryGame.platform} surface="lime" size="xs" className="-ml-2" />{libraryGame.platform}</Chip>
                                        {devices.slice(0, 2).map((device) => <Chip key={device}>{device}</Chip>)}
                                    </div>
                                </div>
                            </aside>

                            <div className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] p-6">
                                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                                    <div>
                                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Edit Entry</div>
                                        <h2 className="mt-2 text-5xl font-black leading-none tracking-[-0.065em]">Game Details</h2>
                                    </div>
                                    <button type="button" onClick={() => setEditingGame(false)} className="grid size-11 place-items-center rounded-full bg-white/10 text-white/60 hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="mt-5 grid grid-cols-4 gap-2 rounded-[24px] bg-white/[0.055] p-2">
                                    {[
                                        ['basics', 'Basics'],
                                        ['progress', 'Progress'],
                                        ['platform', 'Platform'],
                                        ['description', 'Description'],
                                    ].map(([key, label]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setEditTab(key as EditTab)}
                                            className={`rounded-[18px] px-4 py-3 text-sm font-black transition ${
                                                editTab === key ? 'bg-[#b7ff63] text-black' : 'text-white/45 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-5 min-h-0 overflow-y-auto pr-2">
                                    {editTab === 'basics' && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="md:col-span-2 rounded-[26px] border border-white/10 bg-white/[0.055] p-4">
                                                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Identity</div>
                                                <div className="mt-1 text-2xl font-black tracking-[-0.045em]">Main record fields</div>
                                            </div>

                                            <Field label="Title" error={gameErrors['game.title']}>
                                                <TextInput value={gameForm.title} onChange={(event) => updateGameForm({ title: event.target.value })} />
                                            </Field>

                                            <Field label="Publisher" error={gameErrors['game.publisher']}>
                                                <TextInput value={gameForm.publisher} onChange={(event) => updateGameForm({ publisher: event.target.value })} placeholder="Unknown Publisher" />
                                            </Field>

                                            <Field label="Base Value" error={gameErrors['game.base_price_default']}>
                                                <TextInput type="number" step="0.01" value={gameForm.base_price_default} onChange={(event) => updateGameForm({ base_price_default: event.target.value })} />
                                            </Field>

                                            <Field label="Total Achievements" error={gameErrors['game.total_achievements']}>
                                                <TextInput type="number" value={gameForm.total_achievements} onChange={(event) => updateGameForm({ total_achievements: event.target.value })} />
                                            </Field>
                                        </div>
                                    )}

                                    {editTab === 'progress' && (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="md:col-span-2 rounded-[26px] border border-white/10 bg-white/[0.055] p-4">
                                                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Play State</div>
                                                <div className="mt-1 text-2xl font-black tracking-[-0.045em]">Status, hours, achievements</div>
                                            </div>

                                            <Field label="Status" error={gameErrors['progress.status_id']}>
                                                <Select value={gameForm.status_id} onChange={(event) => updateGameStatus(event.target.value)}>
                                                    {references.statuses
                                                        .filter((status) => gameHasAchievements || status.name !== '100%')
                                                        .map((status) => <option key={status.id} value={status.id} className="text-black">{status.name}</option>)}
                                                </Select>
                                                {selectedGameStatus && (
                                                    <span className="mt-1 inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]" style={statusPillStyle({ status: selectedGameStatus.name, status_color_hex: selectedGameStatus.color_hex })}>
                                                        {selectedGameStatus.name}
                                                    </span>
                                                )}
                                            </Field>

                                            <Field label="Playtime Hours" error={gameErrors['progress.playtime_hours']}>
                                                <TextInput type="number" step="0.1" value={gameForm.playtime_hours} onChange={(event) => updateGameForm({ playtime_hours: event.target.value })} />
                                            </Field>

                                            <Field label="Earned Achievements" error={gameErrors['progress.earned_achievements']}>
                                                <TextInput type="number" value={gameForm.earned_achievements} onChange={(event) => updateGameForm({ earned_achievements: event.target.value })} />
                                            </Field>

                                            {(selectedGameStatus?.name === 'Completed' || selectedGameStatus?.name === '100%') && (
                                                <Field label="Completed Date" error={gameErrors['progress.completed_at']}>
                                                    <TextInput type="date" value={gameForm.completed_at} onChange={(event) => updateGameForm({ completed_at: event.target.value })} />
                                                </Field>
                                            )}

                                            {!gameHasAchievements && (
                                                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white/55 md:col-span-2">
                                                    100% is unavailable because this game has no achievement total.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {editTab === 'platform' && (
                                        <div className="grid gap-4">
                                            <div className="rounded-[26px] border border-white/10 bg-white/[0.055] p-4">
                                                <div className="mb-4 flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Platform Setup</div>
                                                        <div className="mt-1 text-2xl font-black tracking-[-0.045em]">Choose platform and devices</div>
                                                        <p className="mt-2 max-w-xl text-sm font-bold text-white/38">
                                                            Search the ecosystem first, then mark every device where this copy can be played.
                                                        </p>
                                                    </div>
                                                    <HardDrive className="text-[#b7ff63]" size={24} />
                                                </div>

                                                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
                                                    <section className="min-w-0 rounded-[24px] border border-white/10 bg-black/20 p-3">
                                                        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">Platform</div>
                                                        <label className="mb-3 flex h-12 items-center gap-3 rounded-2xl bg-white/10 px-4 text-white/50">
                                                            <Search size={18} />
                                                            <input
                                                                value={platformQuery}
                                                                onChange={(event) => setPlatformQuery(event.target.value)}
                                                                placeholder="Search platforms..."
                                                                className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none placeholder:text-white/25"
                                                            />
                                                        </label>

                                                        <div className="grid max-h-[300px] gap-2 overflow-auto pr-1">
                                                            {filteredPlatforms.map((platform) => {
                                                                const active = String(platform.id) === platformDeviceForm.platform_id;

                                                                return (
                                                                    <button
                                                                        key={platform.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            updatePlatformDeviceForm({
                                                                                platform_id: String(platform.id),
                                                                                device_ids: platform.devices[0] ? [String(platform.devices[0].id)] : [],
                                                                            });
                                                                            setDeviceQuery('');
                                                                        }}
                                                                        className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                                                                            active ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/55 hover:text-white'
                                                                        }`}
                                                                    >
                                                                        <span className="flex min-w-0 items-center gap-3">
                                                                            <PlatformIcon platform={platform.name} surface={active ? 'lime' : 'dark'} size="sm" />
                                                                            <span className="min-w-0">
                                                                                <span className="block truncate">{platform.name}</span>
                                                                                <span className={`mt-1 block text-[10px] uppercase tracking-[0.16em] ${active ? 'text-black/45' : 'text-white/30'}`}>
                                                                                    {platform.devices.length} devices
                                                                                </span>
                                                                            </span>
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {platformDeviceErrors.platform_id && <div className="mt-2 text-xs font-black text-[#ff6068]">{platformDeviceErrors.platform_id}</div>}
                                                    </section>

                                                    <section className="min-w-0 rounded-[24px] border border-white/10 bg-black/20 p-3">
                                                        <div className="mb-3 flex items-center justify-between gap-3">
                                                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">Playable Devices</div>
                                                            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                                                                {platformDeviceForm.device_ids.length} selected
                                                            </span>
                                                        </div>

                                                        <label className="mb-3 flex h-12 items-center gap-3 rounded-2xl bg-white/10 px-4 text-white/50">
                                                            <Search size={18} />
                                                            <input
                                                                value={deviceQuery}
                                                                onChange={(event) => setDeviceQuery(event.target.value)}
                                                                placeholder="Search devices..."
                                                                className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none placeholder:text-white/25"
                                                            />
                                                        </label>

                                                        <div className="grid max-h-[300px] gap-2 overflow-auto pr-1 sm:grid-cols-2">
                                                            {filteredDevices.map((device) => {
                                                                const active = platformDeviceForm.device_ids.includes(String(device.id));

                                                                return (
                                                                    <button
                                                                        key={device.id}
                                                                        type="button"
                                                                        onClick={() => togglePlatformDevice(device.id)}
                                                                        className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                                                                            active ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/55 hover:text-white'
                                                                        }`}
                                                                    >
                                                                        {device.name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {platformDeviceErrors.device_ids && <div className="mt-2 text-xs font-black text-[#ff6068]">{platformDeviceErrors.device_ids}</div>}
                                                    </section>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {editTab === 'description' && (
                                        <div className="grid gap-4">
                                            <div className="rounded-[26px] border border-white/10 bg-white/[0.055] p-4">
                                                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Game Description</div>
                                                <div className="mt-1 text-2xl font-black tracking-[-0.045em]">Description text</div>
                                            </div>

                                            <Field label="Description" error={gameErrors['game.description']}>
                                                <TextArea value={gameForm.description} onChange={(event) => updateGameForm({ description: event.target.value })} placeholder="No description saved yet." className="min-h-[260px]" />
                                            </Field>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-between gap-3 border-t border-white/10 pt-5">
                                    <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                                        {platformDevicesChanged() ? 'Platform/device changes will be saved too.' : 'All tabs save from here.'}
                                    </div>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setEditingGame(false)} className="rounded-[18px] bg-white/10 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-white">Cancel</button>
                                        <button type="button" onClick={submitGameEdit} disabled={savingGame || savingPlatformDevices} className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                                            <Save size={18} /> {savingGame || savingPlatformDevices ? 'Saving' : 'Save'}
                                        </button>
                                    </div>
                                </div>

                                {pendingGameStatusId && (
                                    <div className="absolute inset-0 grid place-items-center rounded-[38px] bg-black/70 px-5">
                                        <section className="w-full max-w-md rounded-[28px] bg-white p-6 text-black shadow-[0_30px_90px_rgb(0_0_0/0.45)]">
                                            <div className="text-xs font-black uppercase tracking-[0.24em] text-black/35">Completion date</div>
                                            <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">When did you finish it?</h3>
                                            <p className="mt-3 text-sm font-bold text-black/50">Today is filled in automatically. Change it if needed.</p>
                                            <input
                                                value={gameCompletionDateDraft}
                                                onChange={(event) => setGameCompletionDateDraft(event.target.value)}
                                                type="date"
                                                className="mt-5 h-12 w-full rounded-2xl border border-black/10 bg-[#f4f5ef] px-4 text-sm font-black text-black outline-none focus:border-black"
                                            />
                                            <div className="mt-6 flex justify-end gap-3">
                                                <button type="button" onClick={() => setPendingGameStatusId(null)} className="rounded-2xl bg-black/5 px-5 py-3 text-sm font-black text-black/55">Cancel</button>
                                                <button type="button" onClick={applyGameCompletedStatus} className="rounded-2xl bg-black px-5 py-3 text-sm font-black text-white">Apply</button>
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

            </section>
        </AppLayout>
    );
}
