import { Link } from '@inertiajs/react';
import {
    Archive,
    ChevronLeft,
    Clock3,
    DollarSign,
    Edit3,
    Gamepad2,
    HardDrive,
    Layers3,
    Package,
    Search,
    ShieldCheck,
    Trophy,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import AppLayout from '../Components/AppLayout';
import { GameCardData } from '../types';

type Dlc = { id: number; title: string; base_price: string | number | null; state: string };
type Mode = 'overview' | 'dlcs';

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

function safeProgress(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
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

function CoverNode({ game }: { game: GameCardData }) {
    const progress = safeProgress(game.progress);

    return (
        <div className="relative mx-auto w-[350px] rounded-[38px] bg-[#b7ff63] p-3 shadow-[0_34px_90px_rgb(0_0_0/0.22)]">
            <div className="absolute -left-5 top-8 h-24 w-5 rounded-l-full bg-black/15" />
            <div className="absolute -right-5 bottom-24 h-24 w-5 rounded-r-full bg-black/15" />

            <div className="overflow-hidden rounded-[28px] bg-black shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]">
                {game.cover_url ? (
                    <img src={game.cover_url} alt="" className="h-[475px] w-full object-contain" />
                ) : (
                    <div className="grid h-[475px] place-items-center text-5xl font-black text-white/25">SL</div>
                )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-black text-[#b7ff63]">
                        <Gamepad2 size={22} strokeWidth={3} />
                    </div>
                    <div className="min-w-0 rounded-full bg-black px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white">
                        {game.status}
                    </div>
                </div>
                <div className="text-sm font-black">{progress}%</div>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/15">
                <div className="h-full rounded-full bg-black transition-all" style={{ width: `${progress}%` }} />
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

export default function GameDetails({ libraryGame, dlcs }: { libraryGame: GameCardData; dlcs: Dlc[] }) {
    const [mode, setMode] = useState<Mode>('overview');
    const [filter, setFilter] = useState('All');
    const [query, setQuery] = useState('');

    const filteredDlcs = useMemo(
        () => dlcs.filter((dlc) => (filter === 'All' || dlc.state === filter) && dlc.title.toLowerCase().includes(query.toLowerCase().trim())),
        [dlcs, filter, query],
    );

    const ownership = libraryGame.ownership.length ? libraryGame.ownership : ['Unknown ownership'];
    const devices = libraryGame.devices.length ? libraryGame.devices : ['Unknown device'];
    const achievements = `${libraryGame.earned_achievements} / ${libraryGame.total_achievements || 0}`;

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
                    <Link href="/settings" className="flex items-center justify-center gap-3 border-l border-black/15 text-lg font-black transition hover:bg-black hover:text-[#b7ff63]">
                        <Edit3 size={22} strokeWidth={3} />
                        Edit
                    </Link>
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
                        <CoverNode game={libraryGame} />
                    </div>

                    <div className="self-center">
                        {mode === 'overview' ? (
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
                                        <DataTile label="Platform" value={libraryGame.platform} icon={<ShieldCheck size={20} />} />
                                        <DataTile label="Base Value" value={formatMoney(libraryGame.base_price_default)} icon={<DollarSign size={20} />} />
                                        <DataTile label="Devices" value={devices.join(', ')} icon={<HardDrive size={20} />} />
                                    </div>
                                </article>

                                <div className="grid gap-4">
                                    <button onClick={() => setMode('dlcs')} className="rounded-[32px] bg-[#b7ff63] p-5 text-left shadow-[0_22px_55px_rgb(0_0_0/0.14)] transition hover:-translate-y-1">
                                        <Package size={30} strokeWidth={3} />
                                        <div className="mt-10 text-2xl font-black leading-none tracking-[-0.04em] [writing-mode:vertical-rl]">DLC Bay</div>
                                    </button>
                                    <div className="rounded-[32px] bg-[#b7ff63]/75 p-5 text-left shadow-[0_22px_55px_rgb(0_0_0/0.08)]">
                                        <Layers3 size={30} strokeWidth={3} />
                                        <div className="mt-10 text-xl font-black leading-none tracking-[-0.04em] [writing-mode:vertical-rl]">More Soon</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <article className="rounded-[38px] bg-black p-6 text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex h-14 min-w-[260px] flex-1 items-center gap-3 rounded-full bg-white/10 px-5 text-base font-black shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]">
                                        <Search size={22} />
                                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search DLCs" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/35" />
                                    </label>
                                    {['All', 'Owned', 'Edition Included', 'Not Owned'].map((item) => (
                                        <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-5 py-3 text-sm font-black ${filter === item ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/45'}`}>
                                            {item}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-5 max-h-[475px] space-y-3 overflow-auto pr-1">
                                    {filteredDlcs.map((dlc) => (
                                        <div key={dlc.id} className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.06] p-4 text-lg font-black md:grid-cols-[1fr_165px_140px] md:items-center">
                                            <span className="truncate">{dlc.title}</span>
                                            <span className="rounded-full bg-[#b7ff63] px-4 py-2 text-center text-xs uppercase tracking-[0.12em] text-black">{dlc.state}</span>
                                            <span className="text-right text-white/70">{formatMoney(dlc.base_price)}</span>
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

                <Link href="/library" className="fixed bottom-8 left-8 z-30 rounded-[20px] bg-[#d72835] px-14 py-5 text-xl font-black text-white shadow-[0_18px_34px_rgb(0_0_0/0.18)] transition hover:-translate-y-0.5">
                    Return
                </Link>
            </section>
        </AppLayout>
    );
}
