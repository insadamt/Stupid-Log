import { ChevronLeft, ChevronRight, Gamepad2, Trophy } from 'lucide-react';
import AddGameWizard from '../Components/AddGameWizard';
import AppLayout from '../Components/AppLayout';
import GameCard from '../Components/GameCard';
import { GameCardData, ReferenceData, StatsData } from '../types';

export default function Home({ stats, recentGames, references }: { stats: StatsData; recentGames: GameCardData[]; references: ReferenceData }) {
    const shelfGames = recentGames.slice(0, 3);
    const centerGame = shelfGames[0];

    return (
        <AppLayout title="Home">
            <section className="grid min-h-[760px] grid-cols-[minmax(0,1fr)_344px] items-end gap-14 pr-8">
                <div className="pb-10">
                    <div className="flex items-center justify-center gap-7">
                        <button className="grid size-16 shrink-0 place-items-center rounded-full bg-black text-white shadow-lg" aria-label="Previous game">
                            <ChevronLeft size={44} />
                        </button>
                        {centerGame ? (
                            <div className="flex min-h-[580px] items-end justify-center gap-8 overflow-visible">
                                {shelfGames[1] && (
                                    <div className="mb-20 opacity-95">
                                        <GameCard game={shelfGames[1]} expanded={false} homeSide />
                                    </div>
                                )}
                                <GameCard game={centerGame} featured />
                                {shelfGames[2] && (
                                    <div className="mb-20 opacity-95">
                                        <GameCard game={shelfGames[2]} expanded={false} homeSide />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid min-h-[580px] w-[620px] place-items-center rounded-[46px] bg-[#b7ff63] p-12 text-center text-4xl font-black">
                                Add your first game to start the recent shelf.
                            </div>
                        )}
                        <button className="grid size-16 shrink-0 place-items-center rounded-full bg-black text-white shadow-lg" aria-label="Next game">
                            <ChevronRight size={44} />
                        </button>
                    </div>
                    <h1 className="mt-8 text-center text-[56px] font-black leading-none">Recent&nbsp; games</h1>
                </div>
                <div className="flex h-full flex-col justify-end gap-8 pb-10">
                    <aside className="rounded-[48px] bg-[#b7ff63] px-10 py-12 text-center shadow-[0_24px_38px_rgb(0_0_0/0.08)]">
                        <h2 className="text-5xl font-black">Brief</h2>
                        <div className="mt-12 space-y-9 text-3xl font-black">
                            <div>
                                <Trophy className="mx-auto mb-2" size={42} fill="black" />
                                {stats.earned_achievements} / {stats.total_achievements}
                                <div className="text-2xl text-black/60">Achievements</div>
                            </div>
                            <div className="h-1 bg-black/20" />
                            <div>
                                {stats.playtime_hours} H
                                <div className="text-2xl text-black/60">Playtime</div>
                            </div>
                            <div className="h-1 bg-black/20" />
                            <div>
                                <Gamepad2 className="mx-auto mb-2" size={42} fill="black" />
                                {stats.library_games}
                                <div className="text-2xl text-black/60">Total Games</div>
                            </div>
                        </div>
                    </aside>
                    <AddGameWizard
                        references={references}
                        buttonClassName="h-28 rounded-[18px] bg-[#b7ff63] px-12 text-3xl font-black shadow-[0_20px_34px_rgb(0_0_0/0.08)]"
                    />
                </div>
            </section>
        </AppLayout>
    );
}
