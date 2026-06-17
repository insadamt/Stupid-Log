import { ArrowDownAZ, Clock3, Trophy, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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

export default function Library({ libraryGames, libraryMeta, references }: { libraryGames: GameCardData[]; libraryMeta: LibraryMeta; references: ReferenceData }) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortMode>('title');
    const [filters, setFilters] = useState<LibraryFilters>(defaultFilters);
    const [controlsOpen, setControlsOpen] = useState(false);
    const [games, setGames] = useState<GameCardData[]>(libraryGames);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(libraryGames.length < libraryMeta.total);
    const [loading, setLoading] = useState(false);
    const cardsPerRow = 6;
    const debouncedQuery = useDebouncedValue(query);
    const requestKey = JSON.stringify({ query: debouncedQuery, filters, sort });

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
        let canceled = false;
        const params = libraryRequestParams(debouncedQuery, filters, sort);
        params.set('limit', '40');

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

        const params = libraryRequestParams(debouncedQuery, filters, sort);
        params.set('cursor', nextCursor);
        params.set('limit', '40');

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

    function updateFilters(updates: Partial<LibraryFilters>) {
        setFilters((current) => ({ ...current, ...updates }));
    }

    function clearFilters() {
        setFilters(defaultFilters);
    }

    function removeFilter(key: keyof LibraryFilters) {
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
                    onQueryChange={setQuery}
                    onToggleControls={() => setControlsOpen(true)}
                />

                <main className="h-full min-h-0">
                    <section className="relative h-full min-h-0 overflow-hidden rounded-[38px] border border-black/8 bg-[#f4f7f1] shadow-[0_24px_70px_rgb(0_0_0/0.08)]">
                        <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] [background-size:36px_36px]" />
                        <div className="absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-[#b7ff63]/18 to-transparent" />

                        <div className="absolute left-6 right-6 top-6 z-20 flex min-w-0 items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap gap-2">
                                {activeFilterChips.map((chip) => (
                                    <button
                                        key={chip.key}
                                        type="button"
                                        onClick={() => removeFilter(chip.key)}
                                        className="inline-flex h-9 max-w-[220px] items-center gap-2 rounded-full bg-black px-3 text-xs font-black text-white shadow-[0_12px_24px_rgb(0_0_0/0.12)]"
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
                                    className="h-9 shrink-0 rounded-full bg-[#b7ff63] px-4 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_12px_24px_rgb(0_0_0/0.12)]"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>

                        <div className="relative z-10 h-full min-h-0">
                            <VirtualCardGrid
                                items={games}
                                columns={cardsPerRow}
                                resultSetKey={requestKey}
                                hasMore={hasMore}
                                loading={loading}
                                onNearEnd={loadMore}
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
                        onSortChange={setSort}
                        onClearFilters={clearFilters}
                        close={() => setControlsOpen(false)}
                    />
                )}
            </section>
        </AppLayout>
    );
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
