import { ArrowDownAZ, Clock3, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../../Components/AppLayout';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { GameCardData, ReferenceData } from '../../types';
import LibraryFilters from './components/LibraryFilters';
import LibraryMetaPanel from './components/LibraryMetaPanel';
import LibraryToolbar from './components/LibraryToolbar';
import VirtualCardGrid from './components/VirtualCardGrid';
import { LibraryMeta, SortMode } from './types';

const preferredStatuses = ['All', 'Not Played', 'In Progress', 'Completed', 'Dropped', '100%'];

const sortOptions = [
    { value: 'title', label: 'Title', icon: ArrowDownAZ },
    { value: 'playtime', label: 'Playtime', icon: Clock3 },
    { value: 'progress', label: 'Progress', icon: Trophy },
] satisfies Array<{ value: SortMode; label: string; icon: typeof ArrowDownAZ }>;

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
    const refreshKey = requestKey;

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
                <LibraryMetaPanel libraryMeta={libraryMeta} />

                <LibraryToolbar
                    query={query}
                    sort={sort}
                    filtersOpen={filtersOpen}
                    references={references}
                    sortOptions={sortOptions}
                    onQueryChange={setQuery}
                    onSortChange={setSort}
                    onToggleFilters={() => setFiltersOpen((open) => !open)}
                />

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

                    <LibraryFilters
                        filtersOpen={filtersOpen}
                        status={status}
                        platform={platform}
                        sort={sort}
                        statusCounts={statusCounts}
                        platformCounts={platformCounts}
                        onStatusChange={setStatus}
                        onPlatformChange={setPlatform}
                    />
                </main>
            </section>
        </AppLayout>
    );
}
