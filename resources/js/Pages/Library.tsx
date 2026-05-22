import { Search } from 'lucide-react';
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
            <section className="mx-auto max-w-[1360px]">
                <div className="mb-8 flex items-center justify-center gap-16">
                    <label className="flex h-[58px] w-[520px] items-center rounded-full border-4 border-black/25 px-7 text-3xl font-black text-black/50">
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent outline-none" />
                        <Search size={50} color="black" />
                    </label>
                    <button className="h-[58px] rounded-[28px] bg-[#a9a9a9] px-20 text-2xl font-black shadow-[0_18px_30px_rgb(0_0_0/0.08)]">Sort</button>
                    <button className="h-[58px] rounded-[28px] bg-[#a9a9a9] px-20 text-2xl font-black shadow-[0_18px_30px_rgb(0_0_0/0.08)]">Filter</button>
                </div>
                <div className="sl-scrollbar max-h-[calc(100vh-230px)] overflow-auto overflow-x-visible px-6 pb-32 pt-4">
                    <div className="mx-auto grid max-w-[1190px] grid-cols-[repeat(4,250px)] justify-center gap-x-16 gap-y-10 overflow-visible">
                        {filtered.map((game, index) => <GameCard key={`${game.id}-${index}`} game={game} />)}
                    </div>
                    {!filtered.length && (
                        <div className="mx-auto mt-20 max-w-2xl rounded-[34px] bg-[#b7ff63] p-12 text-center text-4xl font-black">
                            No games match this shelf.
                        </div>
                    )}
                </div>
                <AddGameWizard references={references} />
            </section>
        </AppLayout>
    );
}
