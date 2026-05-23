import {
    ChevronLeft,
    ChevronRight,
    Filter,
    Plus,
    Search,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AddGameWizard from '../Components/AddGameWizard';
import AppLayout from '../Components/AppLayout';
import GameCard from '../Components/GameCard';
import { GameCardData, ReferenceData } from '../types';

type SortMode = 'title' | 'playtime' | 'progress';
type StatusFilter = 'All' | 'Not Played' | 'In Progress' | 'Completed' | '100%';

const statusFilters: StatusFilter[] = ['All', 'Not Played', 'In Progress', 'Completed', '100%'];

function sortGames(games: GameCardData[], sort: SortMode) {
    return [...games].sort((a, b) => {
        if (sort === 'playtime') return Number(b.playtime_hours ?? 0) - Number(a.playtime_hours ?? 0);
        if (sort === 'progress') return Number(b.progress ?? 0) - Number(a.progress ?? 0);
        return a.title.localeCompare(b.title);
    });
}

export default function Library({ libraryGames, references }: { libraryGames: GameCardData[]; references: ReferenceData }) {
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SortMode>('title');
    const [status, setStatus] = useState<StatusFilter>('All');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [page, setPage] = useState(0);

    const cardsPerRow = filtersOpen ? 4 : 5;
    const pageSize = cardsPerRow * 2;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        const matches = libraryGames.filter((game) => {
            const matchesQuery =
                !q ||
                [game.title, game.publisher, game.platform]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(q));

            const matchesStatus = status === 'All' || game.status === status;

            return matchesQuery && matchesStatus;
        });

        return sortGames(matches, sort);
    }, [libraryGames, query, sort, status]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages - 1);
    const visibleGames = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

    useEffect(() => {
        setPage(0);
    }, [query, sort, status, filtersOpen]);

    const nextPage = () => setPage((current) => Math.min(current + 1, totalPages - 1));
    const previousPage = () => setPage((current) => Math.max(current - 1, 0));

    return (
        <AppLayout title="Library" lockViewport>
            <section className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-5 pl-[88px]">
                <header className="grid grid-cols-[minmax(0,1fr)_minmax(360px,520px)_auto_auto] items-center gap-4 rounded-[38px] bg-black px-7 py-5 text-white shadow-[0_24px_55px_rgb(0_0_0/0.2)]">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#b7ff63]">
                            Game Shelf
                        </p>
                        <h1 className="mt-1 text-[46px] font-black leading-none tracking-[-0.05em]">
                            Library Archive
                        </h1>
                    </div>

                    <label className="flex h-[58px] items-center gap-4 rounded-[24px] bg-white/10 px-5 text-lg font-black text-white/70 ring-1 ring-white/10">
                        <Search size={27} strokeWidth={3} className="text-[#b7ff63]" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search shelf"
                            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/35"
                        />
                    </label>

                    <button
                        type="button"
                        onClick={() => setFiltersOpen((open) => !open)}
                        className={[
                            'flex h-[58px] items-center gap-3 rounded-[24px] px-6 text-lg font-black shadow-[0_14px_28px_rgb(0_0_0/0.18)] transition hover:-translate-y-0.5',
                            filtersOpen ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-[#b7ff63]',
                        ].join(' ')}
                    >
                        {filtersOpen ? <X size={24} strokeWidth={3} /> : <Filter size={24} strokeWidth={3} />}
                        {filtersOpen ? 'Close' : 'Filters'}
                    </button>

                    <AddGameWizard
                        references={references}
                        buttonClassName="group h-[58px] rounded-[24px] bg-[#b7ff63] px-6 text-lg font-black text-black shadow-[0_18px_34px_rgb(0_0_0/0.22)] transition hover:-translate-y-1"
                        buttonContent={
                            <span className="flex items-center gap-3">
                                <span className="grid size-10 place-items-center rounded-full bg-black text-[#b7ff63] transition group-hover:rotate-90">
                                    <Plus size={25} strokeWidth={4} />
                                </span>
                                Add Game
                            </span>
                        }
                    />
                </header>

                <main
                    className={[
                        'grid min-h-0 gap-5 transition-[grid-template-columns] duration-300',
                        filtersOpen ? 'grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-[minmax(0,1fr)_0px]',
                    ].join(' ')}
                >
                    <section className="relative min-w-0 overflow-hidden rounded-[44px] border border-black/8 bg-[#eef2ed] p-6 shadow-[0_22px_55px_rgb(0_0_0/0.08)]">
                        <div className="absolute inset-0 opacity-[0.42] [background-image:linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />
                        <div className="absolute left-1/3 top-1/2 h-[340px] w-[620px] -translate-y-1/2 rounded-full bg-[#b7ff63]/20 blur-3xl" />

                        <div className="relative z-10 mb-5 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.32em] text-black/38">
                                    Shelf Page
                                </p>
                                <div className="mt-1 text-2xl font-black">
                                    {visibleGames.length ? `${safePage + 1} / ${totalPages}` : 'Empty shelf'}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="rounded-full bg-black px-5 py-2 text-sm font-black text-[#b7ff63]">
                                    {filtered.length} visible
                                </span>
                                <span className="rounded-full bg-[#b7ff63] px-5 py-2 text-sm font-black text-black">
                                    {cardsPerRow} x 2 shelf mode
                                </span>
                            </div>
                        </div>

                        <div className="relative z-10 flex h-[calc(100%-76px)] items-center justify-center">
                            <button
                                type="button"
                                onClick={previousPage}
                                disabled={safePage === 0}
                                className="absolute left-2 z-30 grid size-[62px] place-items-center rounded-full bg-black text-white shadow-[0_18px_30px_rgb(0_0_0/0.2)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-25"
                            >
                                <ChevronLeft size={38} strokeWidth={3.2} />
                            </button>

                            <div
                                className="grid justify-center gap-x-6 gap-y-5 overflow-visible transition-all duration-300"
                                style={{
                                    gridTemplateColumns: `repeat(${cardsPerRow}, 210px)`,
                                    gridTemplateRows: 'repeat(2, 380px)',
                                }}
                            >
                                {visibleGames.map((game, index) => (
                                    <GameCard
                                        key={`${game.id}-${safePage}-${index}`}
                                        game={game}
                                        compact
                                        panelSide={(index + 1) % cardsPerRow === 0 ? 'left' : 'right'}
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={nextPage}
                                disabled={safePage >= totalPages - 1}
                                className="absolute right-2 z-30 grid size-[62px] place-items-center rounded-full bg-black text-white shadow-[0_18px_30px_rgb(0_0_0/0.2)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-25"
                            >
                                <ChevronRight size={38} strokeWidth={3.2} />
                            </button>

                            {!visibleGames.length && (
                                <div className="absolute inset-0 grid place-items-center">
                                    <div className="rounded-[38px] bg-black p-10 text-center text-white shadow-[0_24px_55px_rgb(0_0_0/0.22)]">
                                        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#b7ff63]">
                                            No Save Files
                                        </p>
                                        <h2 className="mt-3 text-4xl font-black">No games match this shelf.</h2>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <aside
                        className={[
                            'min-w-0 overflow-hidden rounded-[40px] bg-black text-white shadow-[0_24px_55px_rgb(0_0_0/0.22)] transition-all duration-300',
                            filtersOpen ? 'p-6 opacity-100' : 'pointer-events-none p-0 opacity-0',
                        ].join(' ')}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#b7ff63]">
                                    Shelf Controls
                                </p>
                                <h2 className="mt-1 text-3xl font-black">Sort & Filter</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFiltersOpen(false)}
                                className="grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15"
                            >
                                <X size={23} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="mt-7">
                            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.26em] text-white/40">
                                <SlidersHorizontal size={18} strokeWidth={3} />
                                Sort Mode
                            </div>

                            <div className="grid gap-2">
                                {(['title', 'playtime', 'progress'] as SortMode[]).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setSort(mode)}
                                        className={[
                                            'flex h-12 items-center justify-between rounded-[18px] px-4 text-left text-sm font-black capitalize transition',
                                            sort === mode
                                                ? 'bg-[#b7ff63] text-black'
                                                : 'bg-white/10 text-white/58 hover:bg-white/15',
                                        ].join(' ')}
                                    >
                                        {mode}
                                        {sort === mode && <span>Active</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-7">
                            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.26em] text-white/40">
                                <Filter size={18} strokeWidth={3} />
                                Status Filter
                            </div>

                            <div className="grid gap-2">
                                {statusFilters.map((filter) => (
                                    <button
                                        key={filter}
                                        type="button"
                                        onClick={() => setStatus(filter)}
                                        className={[
                                            'flex h-12 items-center justify-between rounded-[18px] px-4 text-left text-sm font-black transition',
                                            status === filter
                                                ? 'bg-[#b7ff63] text-black'
                                                : 'bg-white/10 text-white/58 hover:bg-white/15',
                                        ].join(' ')}
                                    >
                                        <span>{filter}</span>
                                        <span>
                                            {filter === 'All'
                                                ? libraryGames.length
                                                : libraryGames.filter((game) => game.status === filter).length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-7 rounded-[28px] bg-[#b7ff63] p-5 text-black">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/45">
                                Layout Rule
                            </p>
                            <p className="mt-2 text-lg font-black leading-tight">
                                Filter panel open: 4 cards per row. Closed: 5 cards per row.
                            </p>
                        </div>
                    </aside>
                </main>
            </section>
        </AppLayout>
    );
}