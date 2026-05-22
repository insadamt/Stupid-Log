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
        <AppLayout title="Library">
            <section className="pl-[88px]">
                <div className="mb-8 grid grid-cols-[1fr_auto] items-center gap-6">
                    <div>
                        <div className="text-sm font-black uppercase tracking-[0.28em] text-black/40">Game shelf</div>
                        <h1 className="mt-2 text-[52px] font-black leading-none">Library Archive</h1>
                    </div>
                    <AddGameWizard references={references} buttonClassName="h-[64px] rounded-[24px] bg-black px-9 text-xl font-black text-[#b7ff63] shadow-xl transition hover:-translate-y-1" />
                </div>

                <div className="mb-8 grid grid-cols-[minmax(360px,560px)_auto_auto] items-center gap-4">
                    <label className="flex h-[64px] items-center rounded-full border-4 border-black/15 bg-white px-7 text-2xl font-black text-black/50 shadow-[0_14px_30px_rgb(0_0_0/0.04)]">
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your shelf" className="min-w-0 flex-1 bg-transparent outline-none" />
                        <Search size={36} color="black" />
                    </label>
                    <button className="flex h-[64px] items-center gap-3 rounded-full bg-[#b7ff63] px-8 text-xl font-black shadow-[0_14px_30px_rgb(0_0_0/0.06)]"><SlidersHorizontal /> Sort</button>
                    <button className="flex h-[64px] items-center gap-3 rounded-full bg-black px-8 text-xl font-black text-[#b7ff63] shadow-[0_14px_30px_rgb(0_0_0/0.12)]"><Filter /> Filter</button>
                </div>

                <div className="sl-scrollbar max-h-[calc(100vh-285px)] overflow-auto overflow-x-visible rounded-[40px] bg-black/[0.03] px-8 py-8">
                    <div className="mx-auto grid max-w-[1220px] grid-cols-[repeat(4,250px)] justify-center gap-x-14 gap-y-10 overflow-visible">
                        {filtered.map((game, index) => <GameCard key={`${game.id}-${index}`} game={game} />)}
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
