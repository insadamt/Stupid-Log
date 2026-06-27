import { ArrowDownAZ, Clock3, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '../../Components/AppLayout';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { GameCardData, ReferenceData } from '../../types';
import LibraryControlsDrawer from './components/LibraryControlsDrawer';
import LibraryMetaPanel from './components/LibraryMetaPanel';
import LibraryToolbar from './components/LibraryToolbar';
import VirtualCardGrid from './components/VirtualCardGrid';
import { LibraryFilters, LibraryMeta, SortMode } from './types';

const preferredStatuses = ['All', 'Not Played', 'In Progress', 'Completed', 'Dropped', '100%'];
const defaultFilters: LibraryFilters = {
    status: 'All',
    platform: 'All',
    ownershipType: 'All',
    device: 'All',
    achievements: 'all',
    cover: 'all',
    firstPlayedYear: 'All',
    completedYear: 'All',
};

const sortOptions = [
    { value: 'title', label: 'Title', icon: ArrowDownAZ },
    { value: 'playtime', label: 'Playtime', icon: Clock3 },
    { value: 'progress', label: 'Progress', icon: Trophy },
] satisfies Array<{ value: SortMode; label: string; icon: typeof ArrowDownAZ }>;

type ControlsTab = 'filter' | 'sort';
type LibraryScrollSnapshot = {
    queryKey: string;
    url: string;
    scrollTop: number;
    games: GameCardData[];
    nextCursor: string | null;
    hasMore: boolean;
};

export default function Library({ libraryGames, libraryMeta, references }: { libraryGames: GameCardData[]; libraryMeta: LibraryMeta; references: ReferenceData }) {
    const initialState = useMemo(readLibraryUrlState, []);
    const initialRequestKey = useMemo(() => libraryQueryKey(initialState.query, initialState.filters, initialState.sort), [initialState]);
    const initialScrollSnapshot = useMemo(() => readLibraryScrollSnapshot(initialRequestKey), [initialRequestKey]);
    const [query, setQuery] = useState(initialState.query);
    const [sort, setSort] = useState<SortMode>(initialState.sort);
    const [filters, setFilters] = useState<LibraryFilters>(initialState.filters);
    const [controlsOpen, setControlsOpen] = useState(false);
    const [activeControlsTab, setActiveControlsTab] = useState<ControlsTab>(initialState.controlsTab);
    const [games, setGames] = useState<GameCardData[]>(initialScrollSnapshot?.games ?? libraryGames);
    const [nextCursor, setNextCursor] = useState<string | null>(initialScrollSnapshot?.nextCursor ?? null);
    const [hasMore, setHasMore] = useState(initialScrollSnapshot?.hasMore ?? libraryGames.length < libraryMeta.total);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [restoreScrollTop, setRestoreScrollTop] = useState<number | null>(initialScrollSnapshot?.scrollTop ?? null);
    const cardsPerRow = 6;
    const debouncedQuery = useDebouncedValue(query);
    const requestKey = libraryQueryKey(debouncedQuery, filters, sort);
    const requestKeyRef = useRef(requestKey);
    const skipInitialRefreshRef = useRef(Boolean(initialScrollSnapshot));
    const latestLibraryStateRef = useRef({
        requestKey,
        games: initialScrollSnapshot?.games ?? libraryGames,
        nextCursor: initialScrollSnapshot?.nextCursor ?? null,
        hasMore: initialScrollSnapshot?.hasMore ?? libraryGames.length < libraryMeta.total,
        scrollTop: initialScrollSnapshot?.scrollTop ?? 0,
    });

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

    const ownershipOptions = useMemo(
        () => ['All', ...references.ownershipTypes.map((item) => item.name).sort((a, b) => a.localeCompare(b))],
        [references.ownershipTypes],
    );

    const deviceOptions = useMemo(
        () => ['All', ...references.devices.map((item) => item.name).sort((a, b) => a.localeCompare(b))],
        [references.devices],
    );

    const firstPlayedYearOptions = useMemo(
        () => ['All', ...libraryMeta.first_played_years.map((year) => String(year))],
        [libraryMeta.first_played_years],
    );

    const completedYearOptions = useMemo(
        () => ['All', ...libraryMeta.completed_years.map((year) => String(year))],
        [libraryMeta.completed_years],
    );

    const activeFilterChips = useMemo(() => activeFilters(filters), [filters]);
    const hasActiveFilters = activeFilterChips.length > 0;

    useEffect(() => {
        writeLibraryUrlState(query, filters, sort, activeControlsTab);
    }, [activeControlsTab, filters, query, sort]);

    useEffect(() => {
        latestLibraryStateRef.current = {
            ...latestLibraryStateRef.current,
            requestKey,
            games,
            nextCursor,
            hasMore,
        };
    }, [games, hasMore, nextCursor, requestKey]);

    useEffect(() => {
        requestKeyRef.current = requestKey;
        if (skipInitialRefreshRef.current) {
            skipInitialRefreshRef.current = false;
            return;
        }

        clearLibraryScrollSnapshot();
        setRestoreScrollTop(null);
        let canceled = false;
        const params = libraryRequestParams(debouncedQuery, filters, sort);
        params.set('limit', '40');

        setLoadingMore(false);
        setRefreshing(true);
        fetch(`/library-games?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                if (canceled) return;
                setGames(payload.items ?? []);
                setNextCursor(payload.next_cursor ?? null);
                setHasMore(Boolean(payload.has_more));
            })
            .finally(() => {
                if (!canceled) setRefreshing(false);
            });

        return () => {
            canceled = true;
        };
    }, [requestKey]);

    const updateGridScrollPosition = useCallback((scrollTop: number) => {
        latestLibraryStateRef.current = {
            ...latestLibraryStateRef.current,
            scrollTop,
        };
    }, []);

    const saveLibraryScrollBeforeOpeningGame = useCallback(() => {
        const latestState = latestLibraryStateRef.current;
        writeLibraryScrollSnapshot({
            queryKey: latestState.requestKey,
            url: currentLibraryUrl(),
            scrollTop: latestState.scrollTop,
            games: latestState.games,
            nextCursor: latestState.nextCursor,
            hasMore: latestState.hasMore,
        });
    }, []);

    const finishScrollRestore = useCallback(() => {
        setRestoreScrollTop(null);
    }, []);

    function loadMore() {
        if (!hasMore || refreshing || loadingMore || !nextCursor) return;

        const params = libraryRequestParams(debouncedQuery, filters, sort);
        params.set('cursor', nextCursor);
        params.set('limit', '40');
        const loadMoreRequestKey = requestKey;

        setLoadingMore(true);
        fetch(`/library-games?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                if (requestKeyRef.current !== loadMoreRequestKey) return;

                setGames((current) => [...current, ...(payload.items ?? [])]);
                setNextCursor(payload.next_cursor ?? null);
                setHasMore(Boolean(payload.has_more));
            })
            .finally(() => {
                if (requestKeyRef.current === loadMoreRequestKey) {
                    setLoadingMore(false);
                }
            });
    }

    function updateFilters(updates: Partial<LibraryFilters>) {
        clearLibraryScrollSnapshot();
        setRestoreScrollTop(null);
        setFilters((current) => ({ ...current, ...updates }));
    }

    function updateQuery(value: string) {
        clearLibraryScrollSnapshot();
        setRestoreScrollTop(null);
        setQuery(value);
    }

    function updateSort(value: SortMode) {
        clearLibraryScrollSnapshot();
        setRestoreScrollTop(null);
        setSort(value);
    }

    function clearFilters() {
        if (refreshing) return;
        clearLibraryScrollSnapshot();
        setRestoreScrollTop(null);
        setFilters(defaultFilters);
    }

    function removeFilter(key: keyof LibraryFilters) {
        if (refreshing) return;
        clearLibraryScrollSnapshot();
        setRestoreScrollTop(null);
        setFilters((current) => ({ ...current, [key]: defaultFilters[key] }));
    }

    return (
        <AppLayout title="Library" lockViewport>
            <section className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 pl-[88px]">
                <LibraryMetaPanel libraryMeta={libraryMeta} />

                <LibraryToolbar
                    query={query}
                    controlsOpen={controlsOpen}
                    references={references}
                    onQueryChange={updateQuery}
                    onToggleControls={() => setControlsOpen(true)}
                    loading={refreshing}
                />

                <main className="h-full min-h-0">
                    <section className="relative h-full min-h-0 overflow-hidden rounded-[38px] border border-black/8 bg-[#f4f7f1] shadow-[0_24px_70px_rgb(0_0_0/0.08)]">
                        <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] [background-size:36px_36px]" />
                        <div className="absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-[#b7ff63]/18 to-transparent" />
                        <div className={`absolute inset-x-0 top-0 z-30 h-1 bg-[#b7ff63] transition-opacity ${refreshing ? 'opacity-100' : 'opacity-0'}`} />

                        <div className="absolute left-6 right-6 top-6 z-20 flex min-w-0 items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap gap-2">
                                {activeFilterChips.map((chip) => (
                                    <button
                                        key={chip.key}
                                        type="button"
                                        onClick={() => removeFilter(chip.key)}
                                        disabled={refreshing}
                                        className="inline-flex h-9 max-w-[220px] items-center gap-2 rounded-full bg-black px-3 text-xs font-black text-white shadow-[0_12px_24px_rgb(0_0_0/0.12)] transition disabled:cursor-wait disabled:opacity-55"
                                    >
                                        <span className="truncate">{chip.label}</span>
                                        <X size={14} strokeWidth={3} className="shrink-0 text-[#b7ff63]" />
                                    </button>
                                ))}
                            </div>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    disabled={refreshing}
                                    className="h-9 shrink-0 rounded-full bg-[#b7ff63] px-4 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_12px_24px_rgb(0_0_0/0.12)] transition disabled:cursor-wait disabled:opacity-55"
                                >
                                    {refreshing ? 'Clearing' : 'Clear Filters'}
                                </button>
                            )}
                        </div>

                        <div className="relative z-10 h-full min-h-0" aria-busy={refreshing || loadingMore}>
                            <VirtualCardGrid
                                items={games}
                                columns={cardsPerRow}
                                resultSetKey={requestKey}
                                hasMore={hasMore}
                                refreshing={refreshing}
                                loadingMore={loadingMore}
                                restoreScrollTop={restoreScrollTop}
                                onNearEnd={loadMore}
                                onOpenGame={saveLibraryScrollBeforeOpeningGame}
                                onScrollPositionChange={updateGridScrollPosition}
                                onScrollRestored={finishScrollRestore}
                                empty={
                                    <div className="max-w-md rounded-[30px] bg-black p-8 text-center text-white shadow-[0_24px_55px_rgb(0_0_0/0.22)]">
                                        <h3 className="text-3xl font-black tracking-[-0.04em]">No games.</h3>
                                    </div>
                                }
                            />
                        </div>
                    </section>
                </main>

                {controlsOpen && (
                    <LibraryControlsDrawer
                        filters={filters}
                        sort={sort}
                        statusCounts={statusCounts}
                        platformCounts={platformCounts}
                        ownershipOptions={ownershipOptions}
                        deviceOptions={deviceOptions}
                        firstPlayedYearOptions={firstPlayedYearOptions}
                        completedYearOptions={completedYearOptions}
                        sortOptions={sortOptions}
                        onFiltersChange={updateFilters}
                        onSortChange={updateSort}
                        onClearFilters={clearFilters}
                        loading={refreshing}
                        close={() => setControlsOpen(false)}
                        activeTab={activeControlsTab}
                        onActiveTabChange={setActiveControlsTab}
                    />
                )}
            </section>
        </AppLayout>
    );
}

function readLibraryUrlState() {
    const params = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);

    return {
        query: params.get('query') ?? '',
        sort: validSort(params.get('sort')),
        controlsTab: validControlsTab(params.get('controls_tab')),
        filters: {
            status: params.get('status') ?? defaultFilters.status,
            platform: params.get('platform') ?? defaultFilters.platform,
            ownershipType: params.get('ownership_type') ?? defaultFilters.ownershipType,
            device: params.get('device') ?? defaultFilters.device,
            achievements: validOption(params.get('achievements'), ['all', 'has', 'none'], defaultFilters.achievements),
            cover: validOption(params.get('cover'), ['all', 'has', 'missing'], defaultFilters.cover),
            firstPlayedYear: params.get('first_played_year') ?? defaultFilters.firstPlayedYear,
            completedYear: params.get('completed_year') ?? defaultFilters.completedYear,
        },
    };
}

function writeLibraryUrlState(query: string, filters: LibraryFilters, sort: SortMode, controlsTab: ControlsTab) {
    if (typeof window === 'undefined' || window.location.pathname !== '/library') return;

    const params = libraryRequestParams(query, filters, sort);
    if (controlsTab !== 'filter') params.set('controls_tab', controlsTab);

    removeDefaultParams(params);
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `/library?${nextSearch}` : '/library';
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
        window.history.replaceState(window.history.state, '', nextUrl);
    }
}

function libraryQueryKey(query: string, filters: LibraryFilters, sort: SortMode) {
    const params = libraryRequestParams(query, filters, sort);
    removeDefaultParams(params);

    return params.toString();
}

function libraryRequestParams(query: string, filters: LibraryFilters, sort: SortMode) {
    return new URLSearchParams({
        query,
        status: filters.status,
        platform: filters.platform,
        ownership_type: filters.ownershipType,
        device: filters.device,
        achievements: filters.achievements,
        cover: filters.cover,
        first_played_year: filters.firstPlayedYear,
        completed_year: filters.completedYear,
        sort,
    });
}

function readLibraryScrollSnapshot(queryKey: string): LibraryScrollSnapshot | null {
    if (typeof window === 'undefined' || isReloadNavigation()) return null;

    const snapshot = window.history.state?.slLibraryScrollSnapshot;
    if (!isLibraryScrollSnapshot(snapshot) || snapshot.queryKey !== queryKey) return null;

    return snapshot;
}

function writeLibraryScrollSnapshot(snapshot: LibraryScrollSnapshot) {
    if (typeof window === 'undefined') return;

    window.history.replaceState({
        ...window.history.state,
        slLibraryScrollSnapshot: snapshot,
    }, '', snapshot.url);
}

function clearLibraryScrollSnapshot() {
    if (typeof window === 'undefined') return;

    const state = window.history.state;
    if (!state?.slLibraryScrollSnapshot) return;

    const nextState = { ...state };
    delete nextState.slLibraryScrollSnapshot;
    window.history.replaceState(nextState, '', currentLibraryUrl());
}

function currentLibraryUrl() {
    if (typeof window === 'undefined') return '/library';

    return `${window.location.pathname}${window.location.search}`;
}

function isReloadNavigation() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;

    return navigation?.type === 'reload';
}

function isLibraryScrollSnapshot(value: unknown): value is LibraryScrollSnapshot {
    if (!value || typeof value !== 'object') return false;

    const snapshot = value as Partial<LibraryScrollSnapshot>;

    return typeof snapshot.queryKey === 'string'
        && typeof snapshot.url === 'string'
        && typeof snapshot.scrollTop === 'number'
        && Array.isArray(snapshot.games)
        && (typeof snapshot.nextCursor === 'string' || snapshot.nextCursor === null)
        && typeof snapshot.hasMore === 'boolean';
}

function removeDefaultParams(params: URLSearchParams) {
    const defaults = libraryRequestParams('', defaultFilters, 'title');

    defaults.forEach((value, key) => {
        if (params.get(key) === value) params.delete(key);
    });
}

function validSort(value: string | null): SortMode {
    return sortOptions.some((option) => option.value === value) ? value as SortMode : 'title';
}

function validControlsTab(value: string | null): ControlsTab {
    return value === 'sort' ? 'sort' : 'filter';
}

function validOption<T extends string>(value: string | null, options: T[], fallback: T): T {
    return value !== null && options.includes(value as T) ? value as T : fallback;
}

function activeFilters(filters: LibraryFilters) {
    const chips: Array<{ key: keyof LibraryFilters; label: string }> = [];

    if (filters.status !== 'All') chips.push({ key: 'status', label: `Status: ${filters.status}` });
    if (filters.platform !== 'All') chips.push({ key: 'platform', label: `Platform: ${filters.platform}` });
    if (filters.ownershipType !== 'All') chips.push({ key: 'ownershipType', label: `Ownership: ${filters.ownershipType}` });
    if (filters.device !== 'All') chips.push({ key: 'device', label: `Device: ${filters.device}` });
    if (filters.achievements !== 'all') chips.push({ key: 'achievements', label: filters.achievements === 'has' ? 'Has achievements' : 'No achievements' });
    if (filters.cover !== 'all') chips.push({ key: 'cover', label: filters.cover === 'has' ? 'Has cover' : 'Missing cover' });
    if (filters.firstPlayedYear !== 'All') chips.push({ key: 'firstPlayedYear', label: `First played: ${filters.firstPlayedYear}` });
    if (filters.completedYear !== 'All') chips.push({ key: 'completedYear', label: `Completed: ${filters.completedYear}` });

    return chips;
}
