import { Link } from '@inertiajs/react';
import { Clock3, DollarSign, Search, Trophy } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../Components/AppLayout';
import GameCard from '../Components/GameCard';
import { GameCardData } from '../types';

type Dlc = { id: number; title: string; base_price: string | number | null; state: string };

export default function GameDetails({ libraryGame, dlcs }: { libraryGame: GameCardData; dlcs: Dlc[] }) {
    const [mode, setMode] = useState<'overview' | 'dlcs'>('overview');
    const [filter, setFilter] = useState('All');
    const filteredDlcs = dlcs.filter((dlc) => filter === 'All' || dlc.state === filter);

    return (
        <AppLayout title={libraryGame.title}>
            <section className="relative min-h-[760px] pr-8">
                <div className="grid grid-cols-[360px_390px_minmax(560px,1fr)] items-center gap-10">
                    <aside className="relative h-[520px] text-2xl font-black">
                        <div className="absolute right-0 top-10 text-right">
                            <div>{libraryGame.publisher || 'Unknown Publisher'}</div>
                            <div className="mt-4 h-[54px] w-[260px] rounded-bl-[28px] border-b-4 border-l-4 border-black" />
                        </div>

                        <div className="absolute right-0 top-64 flex items-center gap-4">
                            <Trophy size={34} fill="black" />
                            <span>{libraryGame.earned_achievements} / {libraryGame.total_achievements || 0}</span>
                            <div className="ml-2 h-[74px] w-[126px] rounded-tl-[28px] border-l-4 border-t-4 border-black" />
                        </div>

                        <div className="absolute right-0 top-[405px] flex items-center gap-4">
                            <Clock3 size={34} />
                            <span>{libraryGame.playtime_hours} H</span>
                            <div className="ml-2 h-[70px] w-[126px] rounded-tl-[28px] border-l-4 border-t-4 border-black" />
                        </div>
                    </aside>

                    <div className="justify-self-center">
                        <GameCard game={libraryGame} featured />
                    </div>

                    {mode === 'overview' ? (
                        <div className="grid grid-cols-[minmax(0,500px)_108px_108px] gap-6">
                            <article className="rounded-[42px] bg-[#b7ff63] p-8 shadow-[0_28px_38px_rgb(0_0_0/0.16)]">
                                <h2 className="border-b-4 border-white pb-6 text-[40px] font-black leading-none">Description</h2>
                                <p className="mt-8 min-h-[330px] text-[25px] font-black leading-tight">
                                    {libraryGame.description || 'No description saved yet.'}
                                </p>
                                <button className="mt-8 w-full rounded-[22px] bg-black py-5 text-3xl font-black text-white">Next: Prices -&gt;</button>
                            </article>

                            <div className="grid overflow-hidden rounded-[28px] bg-[#b7ff63] text-center text-3xl font-black [writing-mode:vertical-rl]">
                                <div className="grid place-items-center border-b-4 border-white">
                                    <DollarSign />
                                </div>
                                <div className="grid place-items-center">Ownership & Prices</div>
                            </div>

                            <div className="grid place-items-center rounded-[28px] bg-[#b7ff63] text-center text-3xl font-black [writing-mode:vertical-rl]">
                                Coming Soon ...
                            </div>
                        </div>
                    ) : (
                        <article className="rounded-[32px] bg-[#b7ff63] p-6 shadow-[0_28px_38px_rgb(0_0_0/0.14)]">
                            <div className="flex items-center gap-4">
                                <label className="flex h-14 min-w-80 flex-1 items-center rounded-full border-4 border-black/20 px-5 text-xl font-black">
                                    <input placeholder="Search" className="min-w-0 flex-1 bg-transparent outline-none" />
                                    <Search />
                                </label>
                                {['All', 'Owned', 'Edition Included', 'Not Owned'].map((item) => (
                                    <button
                                        key={item}
                                        onClick={() => setFilter(item)}
                                        className={`rounded-full px-6 py-4 text-lg font-black ${filter === item ? 'bg-[#02c46b]' : 'border-4 border-black/25'}`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-6 max-h-[520px] space-y-4 overflow-auto">
                                {filteredDlcs.map((dlc) => (
                                    <div key={dlc.id} className="grid grid-cols-[1fr_170px_220px] items-center rounded-[18px] bg-[#76d650] p-4 text-xl font-black">
                                        <span>{dlc.title}</span>
                                        <span className="rounded-full bg-[#ffd957] px-4 py-2 text-center text-base">{dlc.state}</span>
                                        <button className="rounded-[16px] bg-black px-6 py-4 text-white">
                                            {dlc.state === 'Not Owned' ? 'Mark Owned' : 'Change / Remove'}
                                        </button>
                                    </div>
                                ))}
                                {!filteredDlcs.length && (
                                    <div className="rounded-[18px] bg-[#76d650] p-8 text-2xl font-black">No DLCs saved for this game.</div>
                                )}
                            </div>
                        </article>
                    )}
                </div>

                <div className="fixed bottom-8 left-1/2 flex -translate-x-1/2 rounded-[18px] bg-black p-2 shadow-[0_18px_34px_rgb(0_0_0/0.25)]">
                    <button onClick={() => setMode('overview')} className={`rounded-[16px] px-12 py-5 text-3xl font-black text-white ${mode === 'overview' ? 'bg-[#2b2b2b]' : ''}`}>Game Page</button>
                    <button onClick={() => setMode('dlcs')} className={`rounded-[16px] px-12 py-5 text-3xl font-black text-white ${mode === 'dlcs' ? 'bg-[#2b2b2b]' : ''}`}>DLCs Page</button>
                </div>
                <Link href="/library" className="fixed bottom-8 left-6 rounded-[18px] bg-[#ff3038] px-20 py-8 text-3xl font-black text-white">Return</Link>
                <Link href="/settings" className="fixed bottom-8 right-6 rounded-[18px] bg-[#7bdc55] px-24 py-8 text-3xl font-black text-white">Edit</Link>
            </section>
        </AppLayout>
    );
}
