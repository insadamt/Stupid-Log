import { Link } from '@inertiajs/react';
import {
    Check,
    ChevronLeft,
    Clock3,
    DollarSign,
    Gamepad2,
    Search,
    ShieldCheck,
    Trophy,
    UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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

function SmallPill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
    return (
        <span
            className={[
                'inline-flex items-center rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em]',
                active ? 'bg-[#b7ff63] text-black' : 'bg-black text-white',
            ].join(' ')}
        >
            {children}
        </span>
    );
}

function CoverFrame({ game }: { game: GameCardData }) {
    return (
        <div className="relative rounded-[34px] bg-[#b7ff63] p-3 shadow-[0_30px_70px_rgb(0_0_0/0.18)]">
            <div className="overflow-hidden rounded-[24px] bg-black">
                {game.cover_url ? (
                    <img src={game.cover_url} alt="" className="h-[440px] w-[315px] object-contain" />
                ) : (
                    <div className="grid h-[440px] w-[315px] place-items-center text-4xl font-black text-white/30">SL</div>
                )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Gamepad2 size={30} strokeWidth={3} />
                    <span className="rounded-full bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
                        {game.status}
                    </span>
                </div>
                <span className="text-sm font-black">{safeProgress(game.progress)}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/20">
                <div className="h-full rounded-full bg-black" style={{ width: `${safeProgress(game.progress)}%` }} />
            </div>
        </div>
    );
}

function RailMetric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="relative flex items-center gap-4 rounded-[26px] bg-white/70 px-5 py-4 shadow-[0_16px_35px_rgb(0_0_0/0.06)]">
            <div className="grid size-12 place-items-center rounded-2xl bg-black text-[#b7ff63]">{icon}</div>
            <div>
                <div className="text-2xl font-black tracking-[-0.04em]">{value}</div>
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-black/35">{label}</div>
            </div>
            <div className="absolute -right-[96px] top-1/2 hidden h-[3px] w-[96px] -translate-y-1/2 bg-black/70 xl:block" />
        </div>
    );
}

function VerticalPanel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
    return (
        <div className="grid overflow-hidden rounded-[28px] bg-[#b7ff63] text-center text-2xl font-black shadow-[0_22px_45px_rgb(0_0_0/0.12)] [writing-mode:vertical-rl]">
            {icon && <div className="grid place-items-center border-b-4 border-black/15 p-4">{icon}</div>}
            <div className="grid place-items-center px-5 py-8">{children}</div>
        </div>
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

    const achievements = `${libraryGame.earned_achievements} / ${libraryGame.total_achievements || 0}`;
    const ownership = libraryGame.ownership.length ? libraryGame.ownership : ['Unknown'];
    const devices = libraryGame.devices.length ? libraryGame.devices : ['Unknown device'];

    return (
        <AppLayout title={libraryGame.title} lockViewport>
            <section className="relative flex h-full flex-col overflow-hidden rounded-[42px] bg-[#eef2ec] px-6 pb-28 pt-5 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]">
                <header className="mx-auto grid h-[76px] w-full max-w-[1380px] grid-cols-[120px_1fr_120px] overflow-hidden rounded-full bg-[#b7ff63] shadow-[0_18px_50px_rgb(0_0_0/0.12)]">
                    <Link href="/library" className="grid place-items-center border-r border-black/15 text-black transition hover:bg-black hover:text-[#b7ff63]">
                        <ChevronLeft size={38} strokeWidth={4} />
                    </Link>
                    <div className="grid place-items-center px-8 text-center text-4xl font-black tracking-[-0.04em]">
                        {libraryGame.title}
                    </div>
                    <Link href="/settings" className="grid place-items-center border-l border-black/15 text-black transition hover:bg-black hover:text-[#b7ff63]">
                        <UserRound size={42} strokeWidth={3.2} />
                    </Link>
                </header>

                <div className="mx-auto mt-10 grid w-full max-w-[1420px] flex-1 items-center gap-8 xl:grid-cols-[320px_360px_1fr]">
                    <aside className="grid gap-4 xl:self-center">
                        <div className="hidden text-right text-xl font-black xl:block">
                            {libraryGame.publisher || 'Unknown Publisher'}
                            <div className="ml-auto mt-3 h-10 w-48 rounded-bl-[24px] border-b-[3px] border-l-[3px] border-black/70" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
                            {ownership.map((item) => (
                                <div key={item} className="rounded-2xl bg-black px-6 py-4 text-center text-lg font-black text-white shadow-[0_14px_28px_rgb(0_0_0/0.18)]">
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 grid gap-4">
                            <RailMetric icon={<Trophy size={25} fill="currentColor" />} value={achievements} label="Achievements" />
                            <RailMetric icon={<Clock3 size={25} />} value={formatHours(libraryGame.playtime_hours)} label="Playtime" />
                        </div>
                    </aside>

                    <div className="justify-self-center">
                        <CoverFrame game={libraryGame} />
                    </div>

                    {mode === 'overview' ? (
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_92px_92px] xl:self-center">
                            <article className="rounded-[36px] bg-[#b7ff63] p-7 shadow-[0_30px_55px_rgb(0_0_0/0.16)]">
                                <div className="flex items-start justify-between gap-5 border-b-[3px] border-black/15 pb-5">
                                    <div>
                                        <div className="text-[12px] font-black uppercase tracking-[0.24em] text-black/45">Game Page</div>
                                        <h2 className="text-4xl font-black tracking-[-0.05em]">Description</h2>
                                    </div>
                                    <div className="text-7xl font-black leading-none">”</div>
                                </div>

                                <p className="mt-6 min-h-[230px] max-w-[620px] text-2xl font-black leading-tight tracking-[-0.02em]">
                                    {libraryGame.description || 'No description saved yet. Add a clean archive note later from the edit flow.'}
                                </p>

                                <div className="mt-7 grid gap-3 rounded-[26px] bg-black/8 p-4 sm:grid-cols-3">
                                    <div>
                                        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-black/45">Platform</div>
                                        <div className="mt-1 text-xl font-black">{libraryGame.platform}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-black/45">Base Value</div>
                                        <div className="mt-1 text-xl font-black">{formatMoney(libraryGame.base_price_default)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-black/45">Devices</div>
                                        <div className="mt-1 truncate text-xl font-black">{devices.join(', ')}</div>
                                    </div>
                                </div>

                                <button onClick={() => setMode('dlcs')} className="mt-6 w-full rounded-[22px] bg-black py-5 text-2xl font-black text-white transition hover:-translate-y-0.5">
                                    Open DLCs
                                </button>
                            </article>

                            <button onClick={() => setMode('dlcs')} className="hidden lg:block">
                                <VerticalPanel icon={<DollarSign size={32} strokeWidth={3.5} />}>Ownership & Prices</VerticalPanel>
                            </button>
                            <VerticalPanel>Coming Soon...</VerticalPanel>
                        </div>
                    ) : (
                        <article className="rounded-[36px] bg-[#b7ff63] p-6 shadow-[0_30px_55px_rgb(0_0_0/0.16)] xl:self-center">
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="flex h-14 min-w-[260px] flex-1 items-center gap-3 rounded-full bg-white/60 px-5 text-base font-black shadow-[inset_0_0_0_2px_rgb(0_0_0/0.12)]">
                                    <Search size={22} />
                                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search DLCs" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-black/35" />
                                </label>
                                {['All', 'Owned', 'Edition Included', 'Not Owned'].map((item) => (
                                    <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-5 py-3 text-sm font-black ${filter === item ? 'bg-black text-white' : 'bg-white/50 text-black/55'}`}>
                                        {item}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-5 max-h-[430px] space-y-3 overflow-auto pr-1">
                                {filteredDlcs.map((dlc) => (
                                    <div key={dlc.id} className="grid gap-3 rounded-[22px] bg-white/55 p-4 text-lg font-black md:grid-cols-[1fr_170px_160px] md:items-center">
                                        <span>{dlc.title}</span>
                                        <span className="rounded-full bg-black/10 px-4 py-2 text-center text-xs uppercase tracking-[0.12em]">{dlc.state}</span>
                                        <span className="text-right">{formatMoney(dlc.base_price)}</span>
                                    </div>
                                ))}
                                {!filteredDlcs.length && <div className="rounded-[22px] bg-white/55 p-8 text-2xl font-black">No DLCs saved for this game.</div>}
                            </div>
                        </article>
                    )}
                </div>

                <div className="fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 rounded-[20px] bg-black p-2 shadow-[0_18px_34px_rgb(0_0_0/0.25)]">
                    <button onClick={() => setMode('overview')} className={`rounded-[16px] px-10 py-4 text-xl font-black text-white transition ${mode === 'overview' ? 'bg-white/15' : 'opacity-55 hover:opacity-100'}`}>
                        Game Page
                    </button>
                    <button onClick={() => setMode('dlcs')} className={`rounded-[16px] px-10 py-4 text-xl font-black text-white transition ${mode === 'dlcs' ? 'bg-white/15' : 'opacity-55 hover:opacity-100'}`}>
                        DLCs Page
                    </button>
                </div>

                <Link href="/library" className="fixed bottom-8 left-8 z-30 rounded-[18px] bg-[#d72835] px-14 py-5 text-xl font-black text-white shadow-[0_18px_34px_rgb(0_0_0/0.18)] transition hover:-translate-y-0.5">
                    Return
                </Link>
                <Link href="/settings" className="fixed bottom-8 right-8 z-30 rounded-[18px] bg-[#63bb45] px-16 py-5 text-xl font-black text-white shadow-[0_18px_34px_rgb(0_0_0/0.18)] transition hover:-translate-y-0.5">
                    Edit
                </Link>
            </section>
        </AppLayout>
    );
}
