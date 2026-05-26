import { Link, router } from '@inertiajs/react';
import {
    Archive,
    CalendarClock,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Eye,
    RefreshCw,
    Search,
    Trash2,
} from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import AppLayout from '../Components/AppLayout';
import PlatformIcon from '../Components/PlatformIcon';
import { statusPillStyle } from '../statusColors';
import { ConfirmedYearStats, SnapshotBestGame, SnapshotDetailsData } from '../types';

type Snapshot = ConfirmedYearStats;
type DetailTab = 'best-games' | 'captured-games';

function formatNumber(value: number | string | null | undefined, decimals = 0) {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return '0';
    return parsed.toLocaleString(undefined, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
    });
}

function formatDate(value: string | null | undefined) {
    if (!value) return 'Not confirmed';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function VirtualList<T>({
    items,
    rowHeight,
    gap = 0,
    className,
    empty,
    hasMore = false,
    loading = false,
    onNearEnd,
    getKey,
    render,
}: {
    items: T[];
    rowHeight: number;
    gap?: number;
    className?: string;
    empty: ReactNode;
    hasMore?: boolean;
    loading?: boolean;
    onNearEnd?: () => void;
    getKey: (item: T, index: number) => string | number;
    render: (item: T, index: number) => ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const stride = rowHeight + gap;
    const totalHeight = items.length > 0 ? items.length * rowHeight + (items.length - 1) * gap + (hasMore || loading ? 58 : 0) : 0;
    const startIndex = Math.max(0, Math.floor(scrollTop / stride) - 6);
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / stride) + 6);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const resizeObserver = new ResizeObserver(() => setViewportHeight(node.clientHeight));
        setViewportHeight(node.clientHeight);
        resizeObserver.observe(node);

        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            onScroll={(event) => {
                const node = event.currentTarget;
                setScrollTop(node.scrollTop);
                if (onNearEnd && node.scrollTop + node.clientHeight > node.scrollHeight - 500) {
                    onNearEnd();
                }
            }}
            className={className}
        >
            {items.length === 0 ? empty : (
                <div className="relative" style={{ height: totalHeight }}>
                    {items.slice(startIndex, endIndex).map((item, offset) => {
                        const index = startIndex + offset;

                        return (
                            <div
                                key={getKey(item, index)}
                                className="absolute left-0 right-0"
                                style={{ top: index * stride, height: rowHeight }}
                            >
                                {render(item, index)}
                            </div>
                        );
                    })}
                    {(hasMore || loading) && (
                        <div className="absolute left-0 right-0 grid h-10 place-items-center text-[10px] font-black uppercase tracking-[0.16em] text-black/35" style={{ top: items.length * stride }}>
                            {loading ? 'Loading' : 'Scroll for more'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function useDebouncedValue(value: string, delay = 240) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebounced(value), delay);

        return () => window.clearTimeout(timeout);
    }, [delay, value]);

    return debounced;
}

function ManagerButton({
    children,
    onClick,
    disabled = false,
    tone = 'dark',
}: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    tone?: 'dark' | 'green' | 'danger' | 'ghost';
}) {
    const toneClass = {
        dark: 'bg-black text-white hover:bg-black/85',
        green: 'bg-[#b7ff63] text-black hover:brightness-95',
        danger: 'bg-[#fff0f0] text-[#d92d20] ring-1 ring-red-500/15 hover:bg-[#ffe2e2]',
        ghost: 'bg-white/70 text-black ring-1 ring-black/10 hover:bg-white',
    }[tone];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${toneClass} inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-4 text-xs font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40`}
        >
            {children}
        </button>
    );
}

function SnapshotCard({
    snapshot,
    active,
    confirming,
    deleting,
    onConfirm,
    onDelete,
}: {
    snapshot: Snapshot;
    active: boolean;
    confirming: boolean;
    deleting: boolean;
    onConfirm: () => void;
    onDelete: () => void;
}) {
    return (
        <article className={`min-w-0 overflow-hidden rounded-[26px] border p-4 transition ${active ? 'border-[#b7ff63] bg-black text-white shadow-[0_18px_42px_rgb(0_0_0/0.16)]' : 'border-black/10 bg-white/70 text-black hover:border-black/25'}`}>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0 overflow-hidden">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="shrink-0 text-4xl font-black tracking-[-0.05em]">{snapshot.year}</div>
                        <span className={`inline-flex min-w-0 shrink rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${snapshot.status === 'confirmed' ? 'bg-[#b7ff63] text-black' : active ? 'bg-white/10 text-white' : 'bg-black text-white'}`}>{snapshot.status}</span>
                    </div>
                    <div className={`mt-2 truncate text-[11px] font-black uppercase tracking-[0.16em] ${active ? 'text-white/35' : 'text-black/35'}`}>
                        {snapshot.status === 'confirmed' ? formatDate(snapshot.confirmed_at) : `Drafted ${formatDate(snapshot.created_at)}`}
                    </div>
                </div>
                <div className={`grid shrink-0 gap-1.5 ${snapshot.status === 'draft' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <Link href={`/snapshots/${snapshot.snapshot_id}`} preserveScroll className={`grid size-9 place-items-center rounded-[14px] ${active ? 'bg-[#b7ff63] text-black' : 'bg-black text-white'}`}>
                        <Eye size={18} strokeWidth={3} />
                    </Link>
                    {snapshot.status === 'draft' && (
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={confirming}
                            className="grid size-9 place-items-center rounded-[14px] bg-[#b7ff63] text-black transition disabled:opacity-40"
                        >
                            <Check size={18} strokeWidth={3} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={deleting}
                        className={`grid size-9 place-items-center rounded-[14px] transition disabled:opacity-40 ${active ? 'bg-white/10 text-red-200 ring-1 ring-white/10' : 'bg-[#fff0f0] text-[#d92d20] ring-1 ring-red-500/15'}`}
                    >
                        <Trash2 size={18} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </article>
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
                'grid h-[86px] w-full grid-cols-[62px_1fr_auto] items-center gap-3 rounded-[22px] border p-3 text-left transition',
                selected ? 'border-[#b7ff63] bg-[#b7ff63] text-black' : 'border-black/10 bg-[#f6faf4] hover:border-black/25',
                disabled ? 'cursor-default' : '',
            ].join(' ')}
        >
            <div className="grid size-[62px] place-items-center overflow-hidden rounded-2xl bg-black text-xl font-black text-[#b7ff63]">
                {game.cover_url ? <img src={game.cover_url} alt="" className="size-full object-cover" /> : rank ?? '+'}
            </div>
            <div className="min-w-0">
                <div className="truncate text-sm font-black">{game.title}</div>
                <div className="mt-1 flex min-w-0 items-center gap-2 text-xs font-bold text-black/45">
                    <PlatformIcon platform={game.platform} surface="light" size="xs" />
                    <span className="truncate">{game.platform}</span>
                    <span className="shrink-0">·</span>
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

function CapturedGamesTable({
    games,
    hasMore,
    loading,
    onNearEnd,
}: {
    games: SnapshotDetailsData['games'];
    hasMore: boolean;
    loading: boolean;
    onNearEnd: () => void;
}) {
    return (
        <div className="grid h-full min-h-0 grid-rows-[auto_1fr] overflow-hidden rounded-[26px] border border-black/10">
            <div className="grid grid-cols-[1fr_150px_150px_110px] bg-black px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
                <span>Game</span>
                <span>Platform</span>
                <span>Status</span>
                <span className="text-right">Hours</span>
            </div>
            <VirtualList
                items={games}
                rowHeight={53}
                hasMore={hasMore}
                loading={loading}
                onNearEnd={onNearEnd}
                className="min-h-0 overflow-y-auto bg-white/55"
                getKey={(game) => `${game.library_game_id}-${game.title}`}
                empty={
                    <div className="grid h-full place-items-center p-8 text-center text-sm font-bold text-black/42">No captured games in this snapshot.</div>
                }
                render={(game) => (
                    <div className="grid h-full grid-cols-[1fr_150px_150px_110px] items-center border-t border-black/10 px-5 text-sm font-black">
                        <span className="truncate">{game.title}</span>
                        <span className="truncate text-black/50">{game.platform}</span>
                        <span className="min-w-0">
                            <span className="inline-flex max-w-full rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]" style={statusPillStyle(game)}>{game.status}</span>
                        </span>
                        <span className="text-right">{formatNumber(game.playtime_hours, 1)}</span>
                    </div>
                )}
            />
        </div>
    );
}

function SnapshotInspector({
    selectedSnapshot,
    detailTab,
    setDetailTab,
    bestGameIds,
    toggleBestGame,
    resnap,
    resnapping,
    confirm,
    confirming,
    destroy,
    deleting,
}: {
    selectedSnapshot: SnapshotDetailsData | null;
    detailTab: DetailTab;
    setDetailTab: (tab: DetailTab) => void;
    bestGameIds: number[];
    toggleBestGame: (libraryGameId: number) => void;
    resnap: (snapshot: SnapshotDetailsData) => void;
    resnapping: boolean;
    confirm: (snapshot: SnapshotDetailsData) => void;
    confirming: boolean;
    destroy: (snapshot: SnapshotDetailsData) => void;
    deleting: boolean;
}) {
    const [bestGameQuery, setBestGameQuery] = useState('');
    const debouncedBestGameQuery = useDebouncedValue(bestGameQuery);
    const [capturedGames, setCapturedGames] = useState<SnapshotDetailsData['games']>(selectedSnapshot?.games ?? []);
    const [capturedGamesCursor, setCapturedGamesCursor] = useState<string | null>(selectedSnapshot?.games_next_cursor ?? null);
    const [capturedGamesLoading, setCapturedGamesLoading] = useState(false);
    const [eligibleBestGames, setEligibleBestGames] = useState<SnapshotBestGame[]>(selectedSnapshot?.eligible_best_games ?? []);
    const [eligibleBestGamesCursor, setEligibleBestGamesCursor] = useState<string | null>(selectedSnapshot?.eligible_best_games_next_cursor ?? null);
    const [eligibleBestGamesLoading, setEligibleBestGamesLoading] = useState(false);

    useEffect(() => {
        setCapturedGames(selectedSnapshot?.games ?? []);
        setCapturedGamesCursor(selectedSnapshot?.games_next_cursor ?? null);
        setBestGameQuery('');
        setEligibleBestGames(selectedSnapshot?.eligible_best_games ?? []);
        setEligibleBestGamesCursor(selectedSnapshot?.eligible_best_games_next_cursor ?? null);
    }, [selectedSnapshot?.snapshot_id]);

    useEffect(() => {
        if (!selectedSnapshot || selectedSnapshot.status === 'confirmed') return;

        let canceled = false;
        const params = new URLSearchParams({
            query: debouncedBestGameQuery,
            limit: '80',
        });

        setEligibleBestGamesLoading(true);
        fetch(`/snapshots/${selectedSnapshot.snapshot_id}/eligible-best-games?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                if (canceled) return;
                setEligibleBestGames(payload.items ?? []);
                setEligibleBestGamesCursor(payload.next_cursor ?? null);
            })
            .finally(() => {
                if (!canceled) setEligibleBestGamesLoading(false);
            });

        return () => {
            canceled = true;
        };
    }, [debouncedBestGameQuery, selectedSnapshot?.snapshot_id, selectedSnapshot?.status]);

    if (!selectedSnapshot) {
        return (
            <section className="grid h-full min-h-0 place-items-center rounded-[34px] border border-dashed border-black/15 bg-white/45 p-8 text-center">
                <div>
                    <div className="mx-auto grid size-20 place-items-center rounded-[28px] bg-black text-[#b7ff63]">
                        <Archive size={34} strokeWidth={3} />
                    </div>
                    <div className="mt-5 text-4xl font-black tracking-[-0.05em]">Select a snapshot</div>
                    <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-relaxed text-black/45">Open a draft or confirmed year to manage its best games, inspect captured rows, confirm, resnap, or delete.</p>
                </div>
            </section>
        );
    }

    function loadCapturedGames() {
        if (!selectedSnapshot || !capturedGamesCursor || capturedGamesLoading) return;

        const params = new URLSearchParams({
            cursor: capturedGamesCursor,
            limit: '80',
        });

        setCapturedGamesLoading(true);
        fetch(`/snapshots/${selectedSnapshot.snapshot_id}/games?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                setCapturedGames((current) => [...current, ...(payload.items ?? [])]);
                setCapturedGamesCursor(payload.next_cursor ?? null);
            })
            .finally(() => setCapturedGamesLoading(false));
    }

    function loadEligibleBestGames() {
        if (!selectedSnapshot || selectedSnapshot.status === 'confirmed' || !eligibleBestGamesCursor || eligibleBestGamesLoading) return;

        const params = new URLSearchParams({
            query: debouncedBestGameQuery,
            cursor: eligibleBestGamesCursor,
            limit: '80',
        });

        setEligibleBestGamesLoading(true);
        fetch(`/snapshots/${selectedSnapshot.snapshot_id}/eligible-best-games?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                setEligibleBestGames((current) => [...current, ...(payload.items ?? [])]);
                setEligibleBestGamesCursor(payload.next_cursor ?? null);
            })
            .finally(() => setEligibleBestGamesLoading(false));
    }

    const bestGames = selectedSnapshot.status === 'confirmed'
        ? selectedSnapshot.best_games
        : eligibleBestGames;
    const normalizedBestGameQuery = bestGameQuery.trim().toLowerCase();
    const filteredBestGames = selectedSnapshot.status === 'confirmed' && normalizedBestGameQuery
        ? bestGames.filter((game) => [game.title, game.platform, game.status].some((value) => value.toLowerCase().includes(normalizedBestGameQuery)))
        : bestGames;

    return (
        <section className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-4 rounded-[34px] border border-black/10 bg-white/65 p-5 shadow-[0_20px_44px_rgb(0_0_0/0.07)]">
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/35">Snapshot manager</div>
                    <div className="mt-1 flex items-center gap-3">
                        <h2 className="text-5xl font-black tracking-[-0.06em]">{selectedSnapshot.year}</h2>
                        <span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${selectedSnapshot.status === 'confirmed' ? 'bg-[#b7ff63] text-black' : 'bg-black text-white'}`}>{selectedSnapshot.status}</span>
                    </div>
                    <p className="mt-2 truncate text-xs font-black uppercase tracking-[0.16em] text-black/35">
                        {selectedSnapshot.status === 'confirmed' ? `Confirmed ${formatDate(selectedSnapshot.confirmed_at)}` : `Drafted ${formatDate(selectedSnapshot.created_at)}`}
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    {selectedSnapshot.status === 'draft' && (
                        <ManagerButton onClick={() => resnap(selectedSnapshot)} disabled={resnapping} tone="ghost">
                            <RefreshCw size={16} strokeWidth={3} />
                            {resnapping ? 'Resnapping' : 'Resnap'}
                        </ManagerButton>
                    )}
                    {selectedSnapshot.status === 'draft' && (
                        <ManagerButton onClick={() => confirm(selectedSnapshot)} disabled={confirming} tone="green">
                            <Check size={16} strokeWidth={3} />
                            {confirming ? 'Saving' : 'Save Year'}
                        </ManagerButton>
                    )}
                    <ManagerButton onClick={() => destroy(selectedSnapshot)} disabled={deleting} tone="danger">
                        <Trash2 size={16} strokeWidth={3} />
                        Delete
                    </ManagerButton>
                </div>
            </header>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-black p-2">
                <div className="flex gap-2">
                    <button type="button" onClick={() => setDetailTab('best-games')} className={`rounded-[18px] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] ${detailTab === 'best-games' ? 'bg-[#b7ff63] text-black' : 'bg-white/8 text-white/45 hover:text-white'}`}>Best Games</button>
                    <button type="button" onClick={() => setDetailTab('captured-games')} className={`rounded-[18px] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] ${detailTab === 'captured-games' ? 'bg-[#b7ff63] text-black' : 'bg-white/8 text-white/45 hover:text-white'}`}>Captured Games</button>
                </div>
            </div>

            <div className="min-h-0 overflow-hidden">
                {detailTab === 'captured-games' ? (
                    <CapturedGamesTable
                        games={capturedGames}
                        hasMore={Boolean(capturedGamesCursor)}
                        loading={capturedGamesLoading}
                        onNearEnd={loadCapturedGames}
                    />
                ) : (
                    <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-3">
                        <div className="rounded-[24px] bg-[#f6faf4] p-4 ring-1 ring-black/8">
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-black/35">Best games played</div>
                            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                                <h3 className="text-2xl font-black tracking-[-0.04em]">Top 5 of {selectedSnapshot.year}</h3>
                                <span className="rounded-full bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#b7ff63]">{selectedSnapshot.status === 'confirmed' ? selectedSnapshot.best_games.length : bestGameIds.length}/5 selected</span>
                            </div>
                            <p className="mt-1 text-sm font-bold text-black/45">
                                {selectedSnapshot.status === 'confirmed' ? 'Confirmed years are locked.' : 'Pick up to five games. Save Year stores these picks and locks the snapshot.'}
                            </p>
                        </div>
                        <label className="flex h-12 items-center gap-3 rounded-[18px] bg-white px-4 text-black ring-1 ring-black/10">
                            <Search size={18} strokeWidth={3} className="text-black/35" />
                            <input
                                value={bestGameQuery}
                                onChange={(event) => setBestGameQuery(event.target.value)}
                                placeholder="Search favorites..."
                                className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none placeholder:text-black/30"
                            />
                        </label>
                        <VirtualList
                            items={filteredBestGames}
                            rowHeight={86}
                            gap={12}
                            hasMore={selectedSnapshot.status === 'draft' && Boolean(eligibleBestGamesCursor)}
                            loading={eligibleBestGamesLoading}
                            onNearEnd={loadEligibleBestGames}
                            className="min-h-0 overflow-y-auto pr-1"
                            getKey={(game) => game.library_game_id}
                            empty={
                                <div className="rounded-2xl border border-dashed border-black/15 bg-white/70 p-5 text-sm font-bold text-black/45">
                                    {bestGames.length === 0
                                        ? selectedSnapshot.status === 'confirmed' ? 'No best games were selected before this snapshot was confirmed.' : 'No eligible completed games for this year.'
                                        : 'No favorite games match this search.'}
                                </div>
                            }
                            render={(game) => {
                                if (selectedSnapshot.status === 'confirmed') {
                                    return <BestGameTile game={game} selected rank={game.rank} disabled />;
                                }

                                const rank = bestGameIds.indexOf(game.library_game_id) + 1;

                                return (
                                    <BestGameTile
                                        game={game}
                                        selected={rank > 0}
                                        rank={rank > 0 ? rank : undefined}
                                        onClick={() => toggleBestGame(game.library_game_id)}
                                    />
                                );
                            }}
                        />
                    </div>
                )}
            </div>
        </section>
    );
}

export default function Snapshots({
    snapshots,
    snapshotsNextCursor = null,
    currentYear,
    confirmedCurrentYear,
    selectedSnapshot = null,
}: {
    snapshots: Snapshot[];
    snapshotsNextCursor?: string | null;
    currentYear: number;
    confirmedCurrentYear: Snapshot | null;
    liveStats: unknown;
    selectedSnapshot?: SnapshotDetailsData | null;
}) {
    const [snapshotItems, setSnapshotItems] = useState<Snapshot[]>(snapshots);
    const [snapshotCursor, setSnapshotCursor] = useState<string | null>(snapshotsNextCursor);
    const [snapshotsLoading, setSnapshotsLoading] = useState(false);
    const [snapshotYear, setSnapshotYear] = useState(String(currentYear));
    const [creating, setCreating] = useState(false);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [resnappingId, setResnappingId] = useState<number | null>(null);
    const [bestGameIds, setBestGameIds] = useState<number[]>([]);
    const [detailTab, setDetailTab] = useState<DetailTab>('best-games');

    useEffect(() => {
        setSnapshotItems(snapshots);
        setSnapshotCursor(snapshotsNextCursor);
    }, [snapshots, snapshotsNextCursor]);

    const sortedSnapshots = [...snapshotItems].sort((a, b) => b.year - a.year || b.snapshot_id - a.snapshot_id);
    const drafts = snapshotItems.filter((snapshot) => snapshot.status === 'draft');
    const confirmed = snapshotItems.filter((snapshot) => snapshot.status === 'confirmed');
    const selectedYear = Number(snapshotYear);
    const selectedYearIsValid = Number.isInteger(selectedYear) && selectedYear >= 1970 && selectedYear <= 2100;
    const selectedYearExisting = snapshotItems.find((snapshot) => snapshot.year === selectedYear) ?? null;
    const selectedYearConfirmed = selectedYearExisting?.status === 'confirmed' || confirmedCurrentYear?.year === selectedYear;
    const selectedSnapshotId = selectedSnapshot?.snapshot_id ?? null;

    useEffect(() => {
        setBestGameIds(selectedSnapshot?.best_games.map((game) => game.library_game_id) ?? []);
        setDetailTab('best-games');
    }, [selectedSnapshot?.snapshot_id]);

    function createDraft() {
        if (!selectedYearIsValid || selectedYearExisting) return;

        setCreating(true);
        router.post('/snapshots', { year: selectedYear }, {
            preserveScroll: true,
            onFinish: () => setCreating(false),
        });
    }

    function confirm(snapshot: Snapshot | SnapshotDetailsData) {
        setConfirmingId(snapshot.snapshot_id);

        if (selectedSnapshot && snapshot.snapshot_id === selectedSnapshot.snapshot_id && snapshot.status === 'draft') {
            router.patch(`/snapshots/${snapshot.snapshot_id}/best-games`, {
                library_game_ids: bestGameIds,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    router.patch(`/snapshots/${snapshot.snapshot_id}/confirm`, {}, {
                        preserveScroll: true,
                        onFinish: () => setConfirmingId(null),
                    });
                },
                onError: () => setConfirmingId(null),
            });

            return;
        }

        router.patch(`/snapshots/${snapshot.snapshot_id}/confirm`, {}, {
            preserveScroll: true,
            onFinish: () => setConfirmingId(null),
        });
    }

    function destroy(snapshot: Snapshot | SnapshotDetailsData) {
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

    function resnap(snapshot: SnapshotDetailsData) {
        if (!window.confirm(`Replace the ${snapshot.year} draft with the current library capture? Best games selected on this draft will be cleared.`)) return;

        setResnappingId(snapshot.snapshot_id);
        router.patch(`/snapshots/${snapshot.snapshot_id}/resnap`, {}, {
            preserveScroll: true,
            onFinish: () => setResnappingId(null),
        });
    }

    function toggleBestGame(libraryGameId: number) {
        setBestGameIds((current) => {
            if (current.includes(libraryGameId)) return current.filter((id) => id !== libraryGameId);
            if (current.length >= 5) return current;
            return [...current, libraryGameId];
        });
    }

    function loadMoreSnapshots() {
        if (!snapshotCursor || snapshotsLoading) return;

        const params = new URLSearchParams({
            cursor: snapshotCursor,
            limit: '30',
        });

        setSnapshotsLoading(true);
        fetch(`/snapshots-feed?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                setSnapshotItems((current) => [...current, ...(payload.items ?? [])]);
                setSnapshotCursor(payload.next_cursor ?? null);
            })
            .finally(() => setSnapshotsLoading(false));
    }

    const yearMessage = selectedYearExisting
        ? `${selectedYear} ${selectedYearExisting.status} exists`
        : selectedYearIsValid
            ? 'Ready for draft capture'
            : 'Year must be 1970-2100';

    return (
        <AppLayout title="Snapshots" lockViewport>
            <section className="h-full overflow-hidden px-4 py-3 md:pl-[88px] md:pr-6">
                <div className="mx-auto grid h-full max-w-[1540px] grid-rows-[minmax(120px,auto)_minmax(0,1fr)] gap-4 overflow-hidden">
                    <header className="min-w-0 rounded-[34px] bg-black px-6 py-5 text-white shadow-[0_24px_80px_rgb(0_0_0/0.20)]">
                        <div className="grid h-full min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,auto)] xl:items-center">
                            <div className="min-w-0">
                                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]/70">Snapshot manager</div>
                                <div className="mt-1 flex items-end gap-4">
                                    <h1 className="text-6xl font-black leading-none tracking-[-0.06em]">Snapshots</h1>
                                    <p className="mb-2 hidden max-w-2xl truncate text-sm font-bold text-white/38 xl:block">Create, inspect, resnap, confirm, and delete yearly captures. No stats dashboard here.</p>
                                </div>
                            </div>
                            <div className="grid min-w-0 gap-2">
                                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 rounded-[24px] bg-white/8 p-2">
                                    <button type="button" onClick={() => shiftYear(-1)} className="grid size-11 place-items-center rounded-[18px] bg-black text-white ring-1 ring-white/10 transition hover:text-[#b7ff63]"><ChevronLeft size={18} /></button>
                                    <input
                                        type="number"
                                        min={1970}
                                        max={2100}
                                        value={snapshotYear}
                                        onChange={(event) => setSnapshotYear(event.target.value)}
                                        className="h-11 w-[110px] rounded-[18px] border border-white/10 bg-white/8 px-4 text-center text-lg font-black text-white outline-none focus:border-[#b7ff63]"
                                    />
                                    <button type="button" onClick={() => shiftYear(1)} className="grid size-11 place-items-center rounded-[18px] bg-black text-white ring-1 ring-white/10 transition hover:text-[#b7ff63]"><ChevronRight size={18} /></button>
                                    <ManagerButton onClick={createDraft} disabled={creating || !!selectedYearExisting || selectedYearConfirmed || !selectedYearIsValid} tone="green">
                                        <CalendarClock size={16} strokeWidth={3} />
                                        {creating ? 'Creating' : 'Create Draft'}
                                    </ManagerButton>
                                </div>
                                <div className="text-right text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{yearMessage}</div>
                            </div>
                        </div>
                    </header>

                    <main className="grid min-h-0 min-w-0 gap-4 overflow-hidden rounded-[34px] border border-black/8 bg-white/35 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.58)] xl:grid-cols-[minmax(340px,430px)_minmax(0,1fr)]">
                        <aside className="grid min-h-0 grid-rows-[auto_1fr] rounded-[34px] bg-black p-5 text-white shadow-[0_24px_70px_rgb(0_0_0/0.18)]">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Archive runs</div>
                                    <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">Snapshot List</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="rounded-2xl bg-white/8 px-3 py-2 ring-1 ring-white/8">
                                        <div className="text-lg font-black text-[#b7ff63]">{confirmed.length}</div>
                                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Locked</div>
                                    </div>
                                    <div className="rounded-2xl bg-white/8 px-3 py-2 ring-1 ring-white/8">
                                        <div className="text-lg font-black text-white">{drafts.length}</div>
                                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Drafts</div>
                                    </div>
                                </div>
                            </div>
                            <VirtualList
                                items={sortedSnapshots}
                                rowHeight={126}
                                gap={12}
                                hasMore={Boolean(snapshotCursor)}
                                loading={snapshotsLoading}
                                onNearEnd={loadMoreSnapshots}
                                className="mt-5 min-h-0 overflow-y-auto pr-1"
                                getKey={(snapshot) => snapshot.snapshot_id}
                                empty={
                                    <div className="grid min-h-[320px] place-items-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.04] p-6 text-center">
                                        <div>
                                            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#b7ff63] text-black"><Clock3 size={26} strokeWidth={3} /></div>
                                            <div className="mt-4 text-2xl font-black">No snapshots yet</div>
                                            <p className="mt-2 text-sm font-bold text-white/38">Create a draft capture for a year to start the archive.</p>
                                        </div>
                                    </div>
                                }
                                render={(snapshot) => (
                                        <SnapshotCard
                                            key={snapshot.snapshot_id}
                                            snapshot={snapshot}
                                            active={snapshot.snapshot_id === selectedSnapshotId}
                                            confirming={confirmingId === snapshot.snapshot_id}
                                            deleting={deletingId === snapshot.snapshot_id}
                                            onConfirm={() => confirm(snapshot)}
                                            onDelete={() => destroy(snapshot)}
                                        />
                                )}
                            />
                        </aside>

                        <SnapshotInspector
                            selectedSnapshot={selectedSnapshot}
                            detailTab={detailTab}
                            setDetailTab={setDetailTab}
                            bestGameIds={bestGameIds}
                            toggleBestGame={toggleBestGame}
                            resnap={resnap}
                            resnapping={selectedSnapshot ? resnappingId === selectedSnapshot.snapshot_id : false}
                            confirm={confirm}
                            confirming={selectedSnapshot ? confirmingId === selectedSnapshot.snapshot_id : false}
                            destroy={destroy}
                            deleting={selectedSnapshot ? deletingId === selectedSnapshot.snapshot_id : false}
                        />
                    </main>
                </div>
            </section>
        </AppLayout>
    );
}
