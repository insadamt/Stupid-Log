import { Filter, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import AddGameWizard from '../Components/AddGameWizard';
import AppLayout from '../Components/AppLayout';
import GameCard from '../Components/GameCard';
import { GameCardData, ReferenceData } from '../types';

export default function Library({ libraryGames, references }: { libraryGames: GameCardData[]; references: ReferenceData }) {
    const [query, setQuery] = useState('');

    const filtered = useMemo(
        () => libraryGames.filter((game) => game.title.toLowerCase().includes(query.toLowerCase())),
        [libraryGames, query],
    );

    return (
        <AppLayout title="Library" lockViewport>
            <section className="flex h-full flex-col pl-[88px]">
                <div className="mb-4 grid grid-cols-[1fr_auto] items-center gap-6">
                    <div>
                        <div className="text-xs font-black uppercase tracking-[0.28em] text-black/40">Game shelf</div>
                        <h1 className="mt-1 text-[42px] font-black leading-none">Library Archive</h1>
                    </div>

                    <AddGameWizard
                        references={references}
                        buttonClassName="h-[58px] rounded-[24px] bg-black px-9 text-xl font-black text-[#b7ff63] shadow-xl transition hover:-translate-y-1"
                    />
                </div>

                <div className="mb-4 grid grid-cols-[minmax(360px,560px)_1fr_1fr] items-center gap-4">
                    <label className="flex h-[56px] items-center rounded-full border-4 border-black/15 bg-white px-7 text-2xl font-black text-black/50 shadow-[0_14px_30px_rgb(0_0_0/0.04)]">
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search your shelf"
                            className="min-w-0 flex-1 bg-transparent outline-none"
                        />

                        <Search size={34} color="black" />
                    </label>

                    <button className="flex h-[56px] items-center gap-3 rounded-full bg-[#b7ff63] px-8 text-xl font-black shadow-[0_14px_30px_rgb(0_0_0/0.06)]">
                        <SlidersHorizontal /> Sort
                    </button>

                    <button className="flex h-[56px] items-center gap-3 rounded-full bg-black px-8 text-xl font-black text-[#b7ff63] shadow-[0_14px_30px_rgb(0_0_0/0.12)]">
                        <Filter /> Filter
                    </button>
                </div>

                <div className="sl-scrollbar min-h-0 flex-1 overflow-auto overflow-x-visible rounded-[40px] bg-black/[0.03] px-6 py-6">
                    <div className="mx-auto grid max-w-[1290px] grid-cols-[repeat(5,230px)] justify-center gap-x-7 gap-y-6 overflow-visible">
                        {filtered.map((game, index) => (
                            <GameCard
                                key={`${game.id}-${index}`}
                                game={game}
                                compact
                                panelSide={(index + 1) % 5 === 0 ? 'left' : 'right'}
                            />
                        ))}
                    </div>

                    {!filtered.length && (
                        <div className="mx-auto mt-20 max-w-2xl rounded-[34px] bg-[#b7ff63] p-12 text-center text-4xl font-black shadow-xl">
                            No games match this shelf.
                        </div>
                    )}
                </div>
            </section>
        </AppLayout>
    );
}