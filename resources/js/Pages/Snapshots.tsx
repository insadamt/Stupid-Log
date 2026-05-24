import { Link, router } from '@inertiajs/react';
import {
    Archive,
    CalendarClock,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    DollarSign,
    Eye,
    Gamepad2,
    Layers3,
    RefreshCw,
    ShieldCheck,
    Trash2,
    Trophy,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import AppLayout from '../Components/AppLayout';
import { statusPillStyle } from '../statusColors';
import { ConfirmedYearStats, SnapshotBestGame, SnapshotDetailsData, StatsData } from '../types';

type Snapshot = ConfirmedYearStats;

const metrics = [
    { key: 'library_games', label: 'Library Games', icon: Gamepad2 },
    { key: 'unique_titles', label: 'Unique Titles', icon: Archive },
    { key: 'ownership_copies', label: 'Ownership Copies', icon: Layers3 },
    { key: 'completed', label: 'Completed', icon: Trophy },
    { key: 'playtime_hours', label: 'Playtime', icon: Clock3 },
    { key: 'earned_achievements', label: 'Achievements', icon: ShieldCheck },
    { key: 'base_value', label: 'Base Value', icon: DollarSign },
    { key: 'purchased_value', label: 'Paid Value', icon: DollarSign },
] as const;

function formatNumber(value: number | string | null | undefined, decimals = 0) {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return '0';
    return parsed.toLocaleString(undefined, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
    });
}

function formatMoney(value: number | string | null | undefined) {
    return `$${formatNumber(value, 2)}`;
}

function formatMetric(key: string, value: number) {
    if (key.includes('value')) return formatMoney(value);
    if (key === 'playtime_hours') return `${formatNumber(value, 1)}H`;
    return formatNumber(value);
}

function formatDate(value: string | null | undefined) {
    if (!value) return 'Not confirmed';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function StatTile({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    return (
        <div className="rounded-[26px] border border-black/10 bg-white p-5 shadow-[0_18px_38px_rgb(0_0_0/0.06)]">
            <div className="flex items-center justify-between gap-3 text-black/35">
                <div className="text-[10px] font-black uppercase tracking-[0.22em]">{label}</div>
                {icon}
            </div>
            <div className="mt-3 truncate text-3xl font-black tracking-[-0.04em]">{value}</div>
        </div>
    );
}

function StatusPill({ status }: { status: Snapshot['status'] }) {
    return (
        <span className={[
            'inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]',
            status === 'confirmed' ? 'bg-[#b7ff63] text-black' : 'bg-black text-white',
        ].join(' ')}
        >
            {status}
        </span>
    );
}

function BestGameTile({
    game,
    selected = false,
    rank,
    disabled = false,
    onClick,
}: {
    game: SnapshotBestGame;
    selected?: boolean;
    rank?: number;
    disabled?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                'grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-[20px] border p-3 text-left transition',
                selected ? 'border-black bg-[#b7ff63]' : 'border-black/10 bg-[#fbfcf7] hover:border-black/30',
                disabled ? 'cursor-default' : '',
            ].join(' ')}
        >
            <div className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-black text-xl font-black text-[#b7ff63]">
                {game.cover_url ? <img src={game.cover_url} alt="" className="size-full object-cover" /> : rank ?? '+'}
            </div>
            <div className="min-w-0">
                <div className="truncate text-sm font-black">{game.title}</div>
                <div className="mt-1 flex min-w-0 items-center gap-2 text-xs font-bold text-black/45">
                    <span className="truncate">{game.platform}</span>
                    <span className="shrink-0">-</span>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em]" style={statusPillStyle(game)}>{game.status}</span>
                </div>
            </div>
            <div className="text-right">
                {rank && <div className="text-2xl font-black">#{rank}</div>}
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-black/35">{formatNumber(game.playtime_hours, 1)}h</div>
            </div>
        </button>
    );
}

export default function Snapshots({
    snapshots,
    currentYear,
    confirmedCurrentYear,
    liveStats,
    selectedSnapshot = null,
}: {
    snapshots: Snapshot[];
    currentYear: number;
    confirmedCurrentYear: Snapshot | null;
    liveStats: StatsData;
    selectedSnapshot?: SnapshotDetailsData | null;
}) {
    const [snapshotYear, setSnapshotYear] = useState(String(currentYear));
    const [creating, setCreating] = useState(false);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [resnappingId, setResnappingId] = useState<number | null>(null);
    const [bestGameIds, setBestGameIds] = useState<number[]>([]);
    const [savingBestGames, setSavingBestGames] = useState(false);
    const latestConfirmed = snapshots.find((snapshot) => snapshot.status === 'confirmed') ?? null;
    const drafts = snapshots.filter((snapshot) => snapshot.status === 'draft');
    const confirmed = snapshots.filter((snapshot) => snapshot.status === 'confirmed');
    const selectedYear = Number(snapshotYear);
    const selectedYearIsValid = Number.isInteger(selectedYear) && selectedYear >= 1970 && selectedYear <= 2100;
    const selectedYearConfirmed = snapshots.some((snapshot) => snapshot.year === selectedYear && snapshot.status === 'confirmed');

    useEffect(() => {
        setBestGameIds(selectedSnapshot?.best_games.map((game) => game.library_game_id) ?? []);
    }, [selectedSnapshot?.snapshot_id]);

    function createDraft() {
        if (!selectedYearIsValid || selectedYearConfirmed) return;

        setCreating(true);
        router.post('/snapshots', { year: selectedYear }, {
            preserveScroll: true,
            onFinish: () => setCreating(false),
        });
    }

    function confirm(snapshot: Snapshot) {
        setConfirmingId(snapshot.snapshot_id);
        router.patch(`/snapshots/${snapshot.snapshot_id}/confirm`, {}, {
            preserveScroll: true,
            onFinish: () => setConfirmingId(null),
        });
    }

    function destroy(snapshot: Snapshot) {
        if (!window.confirm(`Delete the ${snapshot.year} ${snapshot.status} snapshot?`)) return;

        setDeletingId(snapshot.snapshot_id);
        router.delete(`/snapshots/${snapshot.snapshot_id}`, {
            preserveScroll: false,
            onFinish: () => setDeletingId(null),
        });
    }

    function shiftYear(delta: number) {
        const next = Number(snapshotYear) + delta;
        if (Number.isInteger(next) && next >= 1970 && next <= 2100) {
            setSnapshotYear(String(next));
        }
    }

    function resnap(snapshot: Snapshot) {
        if (!window.confirm(`Replace the ${snapshot.year} draft with the current library stats? Best games selected on this draft will be cleared.`)) return;

        setResnappingId(snapshot.snapshot_id);
        router.patch(`/snapshots/${snapshot.snapshot_id}/resnap`, {}, {
            preserveScroll: true,
            onFinish: () => setResnappingId(null),
        });
    }

    function toggleBestGame(libraryGameId: number) {
        setBestGameIds((current) => {
            if (current.includes(libraryGameId)) {
                return current.filter((id) => id !== libraryGameId);
            }

            if (current.length >= 5) {
                return current;
            }

            return [...current, libraryGameId];
        });
    }

    function saveBestGames() {
        if (!selectedSnapshot) return;

        setSavingBestGames(true);
        router.patch(`/snapshots/${selectedSnapshot.snapshot_id}/best-games`, {
            library_game_ids: bestGameIds,
        }, {
            preserveScroll: true,
            onFinish: () => setSavingBestGames(false),
        });
    }

    return (
        <AppLayout title="Snapshots">
            <section className="px-4 md:pl-[88px] md:pr-0">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[38px] bg-black p-8 text-white shadow-2xl">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <div className="text-sm font-black uppercase tracking-[0.32em] text-[#b7ff63]/60">Yearly archive</div>
                                <h1 className="mt-3 text-[58px] font-black leading-none tracking-[-0.04em]">Snapshots</h1>
                                <p className="mt-4 max-w-2xl text-lg font-bold leading-relaxed text-white/55">
                                    Confirmed snapshots freeze official yearly stats. Drafts copy the current library stats into the selected archive year.
                                </p>
                            </div>
                            <div className="grid gap-3">
                                <div className="flex items-center gap-2 rounded-[24px] border border-white/10 bg-white/[0.06] p-2">
                                    <button type="button" onClick={() => shiftYear(-1)} className="grid size-12 place-items-center rounded-[18px] bg-white/10 text-white">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <input
                                        type="number"
                                        min={1970}
                                        max={2100}
                                        value={snapshotYear}
                                        onChange={(event) => setSnapshotYear(event.target.value)}
                                        className="h-12 w-28 rounded-[18px] border border-white/10 bg-black px-4 text-center text-lg font-black text-white outline-none focus:border-[#b7ff63]"
                                    />
                                    <button type="button" onClick={() => shiftYear(1)} className="grid size-12 place-items-center rounded-[18px] bg-white/10 text-white">
                                        <ChevronRight size={18} />
                                    </button>
                                    <button
                                        onClick={createDraft}
                                        disabled={creating || selectedYearConfirmed || !selectedYearIsValid}
                                        className="inline-flex h-12 items-center gap-3 rounded-[18px] bg-[#b7ff63] px-5 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
                                    >
                                        <CalendarClock size={20} strokeWidth={3} />
                                        {creating ? 'Creating' : 'Draft'}
                                    </button>
                                </div>
                                <div className="text-right text-[11px] font-black uppercase tracking-[0.18em] text-white/35">
                                    {selectedYearConfirmed ? `${selectedYear} locked` : selectedYearIsValid ? 'Select archive year' : 'Year must be 1970-2100'}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
                            {metrics.slice(0, 4).map((metric) => {
                                const Icon = metric.icon;
                                const value = liveStats[metric.key as keyof StatsData] as number;

                                return (
                                    <div key={metric.key} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
                                        <div className="flex items-center justify-between text-white/35">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{metric.label}</span>
                                            <Icon size={18} />
                                        </div>
                                        <div className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#b7ff63]">{formatMetric(metric.key, value)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-[38px] border border-black/10 bg-white p-8 shadow-[0_24px_48px_rgb(0_0_0/0.08)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/35">Latest official year</div>
                                <div className="mt-2 text-4xl font-black tracking-[-0.04em]">{latestConfirmed?.year ?? 'None'}</div>
                            </div>
                            <div className="grid size-16 place-items-center rounded-[24px] bg-black text-[#b7ff63]">
                                <ShieldCheck size={30} strokeWidth={3} />
                            </div>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <StatTile label="Confirmed" value={confirmed.length} icon={<Check size={18} />} />
                            <StatTile label="Drafts" value={drafts.length} icon={<Clock3 size={18} />} />
                        </div>
                        {latestConfirmed && (
                            <Link
                                href={`/snapshots/${latestConfirmed.snapshot_id}`}
                                className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-[20px] bg-black px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white"
                            >
                                <Eye size={18} strokeWidth={3} />
                                Inspect Latest
                            </Link>
                        )}
                    </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[34px] border border-black/10 bg-white p-6 shadow-[0_20px_44px_rgb(0_0_0/0.07)]">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-3xl font-black tracking-[-0.04em]">Snapshot Runs</h2>
                            <span className="text-sm font-black text-black/35">{snapshots.length} total</span>
                        </div>

                        <div className="grid gap-3">
                            {snapshots.length === 0 && (
                                <div className="rounded-[26px] border border-dashed border-black/15 p-8 text-center">
                                    <div className="text-2xl font-black">No snapshots yet</div>
                                    <p className="mt-2 text-sm font-bold text-black/45">Create a draft from the current library, then confirm it when the year is ready to lock.</p>
                                </div>
                            )}

                            {snapshots.map((snapshot) => (
                                <article key={snapshot.snapshot_id} className="rounded-[26px] border border-black/10 bg-[#fbfcf7] p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-4xl font-black tracking-[-0.05em]">{snapshot.year}</div>
                                                <StatusPill status={snapshot.status} />
                                            </div>
                                            <div className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-black/35">
                                                {snapshot.status === 'confirmed' ? formatDate(snapshot.confirmed_at) : `Drafted ${formatDate(snapshot.created_at)}`}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Link href={`/snapshots/${snapshot.snapshot_id}`} className="grid size-12 place-items-center rounded-2xl bg-black text-white">
                                                <Eye size={19} />
                                            </Link>
                                            {snapshot.status === 'draft' && (
                                                <button
                                                    onClick={() => confirm(snapshot)}
                                                    disabled={confirmingId === snapshot.snapshot_id}
                                                    className="grid size-12 place-items-center rounded-2xl bg-[#b7ff63] text-black disabled:opacity-45"
                                                >
                                                    <Check size={20} strokeWidth={3} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => destroy(snapshot)}
                                                disabled={deletingId === snapshot.snapshot_id}
                                                className="grid size-12 place-items-center rounded-2xl bg-white text-[#d92d20] ring-1 ring-black/10 transition hover:bg-[#fff0f0] disabled:opacity-45"
                                            >
                                                <Trash2 size={19} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm font-black">
                                        <div className="rounded-2xl bg-white p-3">{formatNumber(snapshot.library_games)} games</div>
                                        <div className="rounded-2xl bg-white p-3">{formatNumber(snapshot.playtime_hours, 1)} hours</div>
                                        <div className="rounded-2xl bg-white p-3">{formatMoney(snapshot.purchased_value)} paid</div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[34px] border border-black/10 bg-white p-6 shadow-[0_20px_44px_rgb(0_0_0/0.07)]">
                        {selectedSnapshot ? (
                            <>
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/35">Inspection</div>
                                        <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">{selectedSnapshot.year} Snapshot</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusPill status={selectedSnapshot.status} />
                                        <button
                                            onClick={() => destroy(selectedSnapshot)}
                                            disabled={deletingId === selectedSnapshot.snapshot_id}
                                            className="grid size-11 place-items-center rounded-2xl bg-[#fff0f0] text-[#d92d20] ring-1 ring-red-500/15 transition hover:bg-[#ffe2e2] disabled:opacity-45"
                                        >
                                            <Trash2 size={18} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                                    {metrics.map((metric) => {
                                        const Icon = metric.icon;
                                        const value = selectedSnapshot[metric.key as keyof Snapshot] as number;

                                        return (
                                            <StatTile key={metric.key} label={metric.label} value={formatMetric(metric.key, value)} icon={<Icon size={18} />} />
                                        );
                                    })}
                                </div>

                                {selectedSnapshot.status === 'draft' && (
                                    <div className="mt-5 rounded-[22px] border border-black/10 bg-[#fff7df] p-5 text-sm font-bold text-black/60">
                                        Confirming locks this year, all captured game rows, ownership copies, DLC ownership, totals, charts, and selected best games. Use Resnap before confirming if the current library changed.
                                    </div>
                                )}

                                <div className="mt-6 rounded-[26px] border border-black/10 bg-[#fbfcf7] p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/35">Best games played</div>
                                            <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">Top 5 of {selectedSnapshot.year}</h3>
                                            <p className="mt-1 text-sm font-bold text-black/45">Only games completed or 100% in this snapshot year can be selected. A title can win once across all years.</p>
                                        </div>
                                    {selectedSnapshot.status === 'draft' && (
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <button
                                                    onClick={() => resnap(selectedSnapshot)}
                                                    disabled={resnappingId === selectedSnapshot.snapshot_id}
                                                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black ring-1 ring-black/10 disabled:opacity-45"
                                                >
                                                    <RefreshCw size={16} />
                                                    {resnappingId === selectedSnapshot.snapshot_id ? 'Resnapping' : 'Resnap'}
                                                </button>
                                                <button
                                                    onClick={saveBestGames}
                                                    disabled={savingBestGames}
                                                    className="rounded-2xl bg-black px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:opacity-45"
                                                >
                                                    {savingBestGames ? 'Saving' : 'Save'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {selectedSnapshot.status === 'confirmed' ? (
                                        <div className="mt-5 grid gap-3">
                                            {selectedSnapshot.best_games.length === 0 && (
                                                <div className="rounded-2xl border border-dashed border-black/15 p-5 text-sm font-bold text-black/45">No best games were selected before this snapshot was confirmed.</div>
                                            )}
                                            {selectedSnapshot.best_games.map((game) => (
                                                <BestGameTile key={game.library_game_id} game={game} selected rank={game.rank} disabled />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-5 grid gap-3">
                                            {selectedSnapshot.eligible_best_games.length === 0 && (
                                                <div className="rounded-2xl border border-dashed border-black/15 p-5 text-sm font-bold text-black/45">No eligible completed games for this year.</div>
                                            )}
                                            {selectedSnapshot.eligible_best_games.map((game) => {
                                                const rank = bestGameIds.indexOf(game.library_game_id) + 1;
                                                return (
                                                    <BestGameTile
                                                        key={game.library_game_id}
                                                        game={game}
                                                        selected={rank > 0}
                                                        rank={rank > 0 ? rank : undefined}
                                                        onClick={() => toggleBestGame(game.library_game_id)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 overflow-hidden rounded-[26px] border border-black/10">
                                    <div className="grid grid-cols-[1fr_120px_130px_110px] bg-black px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
                                        <span>Game</span>
                                        <span>Platform</span>
                                        <span>Status</span>
                                        <span className="text-right">Hours</span>
                                    </div>
                                    <div className="max-h-[420px] overflow-auto">
                                        {selectedSnapshot.games.map((game) => (
                                            <div key={`${game.library_game_id}-${game.title}`} className="grid grid-cols-[1fr_120px_130px_110px] items-center border-t border-black/10 px-5 py-4 text-sm font-black">
                                                <span className="truncate">{game.title}</span>
                                                <span className="truncate text-black/50">{game.platform}</span>
                                                <span className="min-w-0">
                                                    <span className="inline-flex max-w-full rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]" style={statusPillStyle(game)}>{game.status}</span>
                                                </span>
                                                <span className="text-right">{formatNumber(game.playtime_hours, 1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="grid min-h-[520px] place-items-center rounded-[28px] border border-dashed border-black/15 bg-[#fbfcf7] p-8 text-center">
                                <div>
                                    <div className="mx-auto grid size-16 place-items-center rounded-[24px] bg-black text-[#b7ff63]">
                                        <Archive size={30} strokeWidth={3} />
                                    </div>
                                    <div className="mt-5 text-3xl font-black tracking-[-0.04em]">Select a snapshot</div>
                                    <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-relaxed text-black/45">Open any draft or confirmed run to inspect the frozen totals and captured library rows.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </AppLayout>
    );
}
