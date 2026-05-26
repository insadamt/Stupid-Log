import {
    ArrowDownAZ,
    Clock3,
    Filter,
    Gamepad2,
    Plus,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Trophy,
    X,
} from 'lucide-react';
import { ReactNode, UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useStaggerRefresh } from '../animation';
import AddGameWizard from '../Components/AddGameWizard';
import AppLayout from '../Components/AppLayout';
import GameCard from '../Components/GameCard';
import PlatformIcon from '../Components/PlatformIcon';
import { statusDotStyle, statusPillStyle } from '../statusColors';
import { GameCardData, ReferenceData } from '../types';

type SortMode = 'title' | 'playtime' | 'progress';

type LibraryMeta = {
    total: number;
    completed: number;
    playtime_hours: number;
    statuses: Record<string, number>;
    platforms: Record<string, number>;
};

const preferredStatuses = ['All', 'Not Played', 'In Progress', 'Completed', 'Dropped', '100%'];

const sortOptions: Array<{ value: SortMode; label: string; icon: typeof ArrowDownAZ }> = [
    { value: 'title', label: 'Title', icon: ArrowDownAZ },
    { value: 'playtime', label: 'Playtime', icon: Clock3 },
    { value: 'progress', label: 'Progress', icon: Trophy },
];

function sameStatus(a: string, b: string) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function useDebouncedValue(value: string, delay = 240) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebounced(value), delay);

        return () => window.clearTimeout(timeout);
    }, [delay, value]);

    return debounced;
}

function VirtualCardGrid({
    items,
    columns,
    refreshKey,
    hasMore,
    loading,
    empty,
    onNearEnd,
}: {
    items: GameCardData[];
    columns: number;
    refreshKey: string;
    hasMore: boolean;
    loading: boolean;
    empty: ReactNode;
    onNearEnd: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const cardWidth = 200;
    const rowHeight = 355;
    const gapX = 24;
    const totalRows = Math.ceil(items.length / columns);
    const totalHeight = Math.max(1, totalRows) * rowHeight + (hasMore || loading ? 76 : 0);
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 2);
    const startIndex = startRow * columns;
    const endIndex = Math.min(items.length, endRow * columns);
    const visibleItems = items.slice(startIndex, endIndex);

    useStaggerRefresh(gridRef, refreshKey);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const resizeObserver = new ResizeObserver(() => setViewportHeight(node.clientHeight));
        setViewportHeight(node.clientHeight);
        resizeObserver.observe(node);

        return () => resizeObserver.disconnect();
    }, []);

    function handleScroll(event: UIEvent<HTMLDivElement>) {
        const node = event.currentTarget;
        setScrollTop(node.scrollTop);

        if (node.scrollTop + node.clientHeight > node.scrollHeight - 700) {
            onNearEnd();
        }
    }

    if (items.length === 0 && !loading) {
        return <div className="grid h-full place-items-center">{empty}</div>;
    }

    return (
        <div ref={ref} onScroll={handleScroll} className="sl-scrollbar relative h-full min-h-0 overflow-y-auto overflow-x-hidden px-16 py-10">
            <div ref={gridRef} className="relative mx-auto" style={{ width: columns * cardWidth + (columns - 1) * gapX, height: totalHeight }}>
                {visibleItems.map((game, offset) => {
                    const index = startIndex + offset;
                    const row = Math.floor(index / columns);
                    const column = index % columns;

                    return (
                        <div
                            key={game.id}
                            data-refresh-item={game.id}
                            className="absolute"
                            style={{
                                left: column * (cardWidth + gapX),
                                top: row * rowHeight,
                                width: cardWidth,
                                height: 335,
                            }}
                        >
                            <GameCard game={game} compact panelSide={column === columns - 1 ? 'left' : 'right'} />
                        </div>
                    );
                })}
                {hasMore && (
                    <div className="absolute left-0 right-0 grid h-14 place-items-center rounded-[22px] bg-black/5 text-xs font-black uppercase tracking-[0.16em] text-black/35" style={{ top: totalRows * rowHeight }}>
                        Scroll for more
                    </div>
                )}
            </div>
        </div>
    );
}

function formatHours(value: number | string | null | undefined) {
    const parsed = Number(value ?? 0);
    return `${Number.isInteger(parsed) ? parsed : parsed.toFixed(1)}H`;
}

function StatPill({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Gamepad2 }) {
    return (
        <div className="flex h-[48px] items-center gap-3 rounded-[18px] bg-white/[0.08] px-4 ring-1 ring-white/10">
            <span className="grid size-9 shrink-0 place-items-center rounded-[14px] bg-[#b7ff63] text-black">
                <Icon size={18} strokeWidth={3} />
            </span>
            <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{label}</span>
                <span className="block truncate text-base font-black leading-none text-white">{value}</span>
            </span>
        </div>
    );
}

export default function Library({ libraryGames, libraryMeta, references }: { libraryGames: GameCardData[]; libraryMeta: LibraryMeta; references: ReferenceData }) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortMode>('title');
    const [status, setStatus] = useState('All');
    const [platform, setPlatform] = useState('All');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [games, setGames] = useState<GameCardData[]>(libraryGames);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(libraryGames.length < libraryMeta.total);
    const [loading, setLoading] = useState(false);
    const cardsPerRow = filtersOpen ? 5 : 6;
    const debouncedQuery = useDebouncedValue(query);
    const requestKey = `${debouncedQuery}|${status}|${platform}|${sort}`;
    const refreshKey = games.map((game) => game.id).join(',');

    const statusOptions = useMemo(() => {
        const merged = [...preferredStatuses, ...Object.keys(libraryMeta.statuses)];

        return Array.from(new Map(merged.map((item) => [item.toLowerCase(), item])).values());
    }, [libraryMeta.statuses]);

    const statusByName = useMemo(
        () => new Map(references.statuses.map((item) => [item.name.toLowerCase(), item])),
        [references.statuses],
    );

    const platformOptions = useMemo(() => {
        return ['All', ...Object.keys(libraryMeta.platforms).sort((a, b) => a.localeCompare(b))];
    }, [libraryMeta.platforms]);

    const statusCounts = useMemo(
        () => statusOptions.map((item) => ({
            label: item,
            count: item === 'All'
                ? libraryMeta.total
                : libraryMeta.statuses[item] ?? 0,
            status: statusByName.get(item.toLowerCase()),
        })),
        [libraryMeta.statuses, libraryMeta.total, statusByName, statusOptions],
    );

    const platformCounts = useMemo(
        () => platformOptions.map((item) => ({
            label: item,
            count: item === 'All'
                ? libraryMeta.total
                : libraryMeta.platforms[item] ?? 0,
        })),
        [libraryMeta.platforms, libraryMeta.total, platformOptions],
    );

    useEffect(() => {
        let canceled = false;
        const params = new URLSearchParams({
            query: debouncedQuery,
            status,
            platform,
            sort,
            limit: '40',
        });

        setLoading(true);
        fetch(`/library-games?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                if (canceled) return;
                setGames(payload.items ?? []);
                setNextCursor(payload.next_cursor ?? null);
                setHasMore(Boolean(payload.has_more));
            })
            .finally(() => {
                if (!canceled) setLoading(false);
            });

        return () => {
            canceled = true;
        };
    }, [requestKey]);

    function loadMore() {
        if (!hasMore || loading || !nextCursor) return;

        const params = new URLSearchParams({
            query: debouncedQuery,
            status,
            platform,
            sort,
            cursor: nextCursor,
            limit: '40',
        });

        setLoading(true);
        fetch(`/library-games?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                setGames((current) => [...current, ...(payload.items ?? [])]);
                setNextCursor(payload.next_cursor ?? null);
                setHasMore(Boolean(payload.has_more));
            })
            .finally(() => setLoading(false));
    }

    return (
        <AppLayout title="Library" lockViewport>
            <section className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 pl-[88px]">
                <header className="relative overflow-hidden rounded-[30px] bg-black px-6 py-3 text-white shadow-[0_24px_70px_rgb(0_0_0/0.22)]">
                    <div className="absolute inset-y-0 right-0 w-1/3 bg-[linear-gradient(135deg,transparent,rgba(183,255,99,0.22))]" />
                    <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                        <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#b7ff63]/75">Library Archive</p>
                            <h1 className="mt-1 truncate text-[44px] font-black leading-none tracking-[-0.06em]">Game Vault</h1>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <StatPill label="Games" value={libraryMeta.total} icon={Gamepad2} />
                            <StatPill label="Cleared" value={libraryMeta.completed} icon={ShieldCheck} />
                            <StatPill label="Playtime" value={formatHours(libraryMeta.playtime_hours)} icon={Clock3} />
                        </div>
                    </div>
                </header>

                <section className="grid gap-3 rounded-[26px] border border-black/8 bg-[#e9eee9] p-2 shadow-[0_18px_44px_rgb(0_0_0/0.06)] xl:grid-cols-[minmax(360px,1fr)_auto]">
                    <label className="flex h-[50px] min-w-0 items-center gap-3 rounded-[20px] bg-white px-5 text-black shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]">
                        <Search size={24} strokeWidth={3} className="shrink-0 text-black/35" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search title, platform, device, ownership"
                            className="min-w-0 flex-1 bg-transparent text-base font-black outline-none placeholder:text-black/28"
                        />
                    </label>

                    <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                        {sortOptions.map((option) => {
                            const Icon = option.icon;
                            const active = sort === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSort(option.value)}
                                    className={[
                                        'inline-flex h-[46px] items-center gap-2 rounded-[17px] px-4 text-sm font-black transition',
                                        active ? 'bg-black text-[#b7ff63]' : 'bg-white text-black/50 hover:text-black',
                                    ].join(' ')}
                                >
                                    <Icon size={17} strokeWidth={3} />
                                    {option.label}
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => setFiltersOpen((open) => !open)}
                            className={[
                                'inline-flex h-[46px] items-center gap-2 rounded-[17px] px-4 text-sm font-black transition',
                                filtersOpen ? 'bg-[#b7ff63] text-black' : 'bg-black text-white',
                            ].join(' ')}
                        >
                            {filtersOpen ? <X size={18} strokeWidth={3} /> : <Filter size={18} strokeWidth={3} />}
                            Filter
                        </button>

                        <AddGameWizard
                            references={references}
                            buttonClassName="group h-[46px] rounded-[17px] bg-[#b7ff63] px-5 text-sm font-black text-black shadow-[0_14px_28px_rgb(0_0_0/0.12)] transition hover:-translate-y-0.5"
                            buttonContent={
                                <span className="flex items-center gap-2">
                                    <Plus size={18} strokeWidth={4} />
                                    Add Game
                                </span>
                            }
                        />
                    </div>
                </section>

                <main
                    className={[
                        'grid min-h-0 transition-[grid-template-columns] duration-300',
                        filtersOpen
                            ? 'grid-cols-[minmax(0,1fr)_320px] gap-4'
                            : 'grid-cols-[minmax(0,1fr)_0px] gap-0',
                    ].join(' ')}
                >
                    <section className="relative min-h-0 overflow-hidden rounded-[38px] border border-black/8 bg-[#f4f7f1] shadow-[0_24px_70px_rgb(0_0_0/0.08)]">
                        <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] [background-size:36px_36px]" />
                        <div className="absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-[#b7ff63]/18 to-transparent" />

                        <div className="absolute right-6 top-7 z-20 flex items-center gap-2">
                            {(status !== 'All' || platform !== 'All') && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatus('All');
                                        setPlatform('All');
                                    }}
                                    className="rounded-full bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#b7ff63]"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>

                        <div className="relative z-10 h-full min-h-0">
                            <VirtualCardGrid
                                items={games}
                                columns={cardsPerRow}
                                refreshKey={refreshKey}
                                hasMore={hasMore}
                                loading={loading}
                                onNearEnd={loadMore}
                                empty={
                                    <div className="max-w-md rounded-[30px] bg-black p-8 text-center text-white shadow-[0_24px_55px_rgb(0_0_0/0.22)]">
                                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">No Match</p>
                                        <h3 className="mt-3 text-3xl font-black tracking-[-0.04em]">No games found.</h3>
                                    </div>
                                }
                            />
                        </div>
                    </section>

                    <aside
                        className={[
                            'min-w-0 overflow-hidden rounded-[34px] bg-black text-white shadow-[0_24px_70px_rgb(0_0_0/0.22)] transition-all duration-300',
                            filtersOpen ? 'p-0 opacity-100' : 'pointer-events-none p-0 opacity-0',
                        ].join(' ')}
                    >
                        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/65">Control Deck</p>
                                    <h2 className="mt-1 text-2xl font-black">Filters</h2>
                                </div>
                                <SlidersHorizontal size={24} strokeWidth={3} className="text-[#b7ff63]" />
                            </div>

                            <div className="sl-scrollbar min-h-0 overflow-y-auto p-5">
                                <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Status</div>

                                <div className="grid gap-2">
                                    {statusCounts.map((item) => {
                                        const selected = sameStatus(status, item.label);

                                        return (
                                            <button
                                                key={item.label}
                                                type="button"
                                                onClick={() => setStatus(item.label)}
                                                className={[
                                                    'flex min-h-12 items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-black transition',
                                                    selected
                                                        ? item.status ? 'text-black' : 'bg-[#b7ff63] text-black'
                                                        : 'bg-white/10 text-white/58 hover:bg-white/15 hover:text-white',
                                                ].join(' ')}
                                                style={selected && item.status ? statusPillStyle({ status: item.status.name, status_color_hex: item.status.color_hex }) : undefined}
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    {item.status && <span className="size-2.5 shrink-0 rounded-full" style={statusDotStyle({ status: item.status.name, status_color_hex: item.status.color_hex })} />}
                                                    <span className="truncate">{item.label}</span>
                                                </span>
                                                <span>{item.count}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mb-3 mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Platform</div>

                                <div className="grid gap-2">
                                    {platformCounts.map((item) => {
                                        const selected = platform === item.label;

                                        return (
                                            <button
                                                key={item.label}
                                                type="button"
                                                onClick={() => setPlatform(item.label)}
                                                className={[
                                                    'flex min-h-12 items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-black transition',
                                                    selected
                                                        ? 'bg-[#b7ff63] text-black'
                                                        : 'bg-white/10 text-white/58 hover:bg-white/15 hover:text-white',
                                                ].join(' ')}
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <PlatformIcon platform={item.label} surface={selected ? 'lime' : 'dark'} size="sm" />
                                                    <span className="truncate">{item.label}</span>
                                                </span>
                                                <span>{item.count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="border-t border-white/10 p-5">
                                <div className="rounded-[24px] bg-[#b7ff63] p-4 text-black">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">Active View</p>
                                    <p className="mt-1 truncate text-xl font-black">{status} / {platform} / {sort}</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </main>
            </section>
        </AppLayout>
    );
}
