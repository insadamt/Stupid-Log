import { Activity } from 'lucide-react';
import AppLayout from '../../Components/AppLayout';
import { GameCardData, ReferenceData, StatsData } from '../../types';
import BriefPanel from './components/BriefPanel';
import EmptyArchiveCard from './components/EmptyArchiveCard';
import FeaturedGamePanel from './components/FeaturedGamePanel';
import LibraryArchiveLink from './components/LibraryArchiveLink';
import MiniGameSlab from './components/MiniGameSlab';

export default function Home({
    stats,
    recentGames,
    references,
}: {
    stats: StatsData;
    recentGames: GameCardData[];
    references: ReferenceData;
}) {
    const featuredGame = recentGames[0];
    const leftGame = recentGames[1];
    const rightGame = recentGames[2];
    const latestStatus = featuredGame?.status ?? "No files";
    const achievementProgress = Math.min(
        Math.max(Number(stats.achievement_progress ?? 0), 0),
        100,
    );

    return (
        <AppLayout title="Home" lockViewport>
            <section className="grid h-full grid-cols-[minmax(0,1fr)_400px] gap-8 pl-[88px]">
                <section className="relative flex min-w-0 flex-col overflow-hidden rounded-[52px] border border-black/8 bg-[#eef2ed] p-7 shadow-[0_28px_65px_rgb(0_0_0/0.08)]">
                    <div className="absolute inset-0 opacity-[0.42] [background-image:linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />
                    <div className="absolute left-[20%] top-[18%] h-[360px] w-[520px] rounded-full bg-[#b7ff63]/25 blur-3xl" />

                    <header className="relative z-10 flex items-start justify-between gap-6">
                        <div>
                            <p className="text-[12px] font-black uppercase tracking-[0.34em] text-black/38">
                                Stupid Log Command Deck
                            </p>
                            <h1 className="mt-2 text-[64px] font-black leading-[0.88] tracking-[-0.06em]">
                                Home Base
                            </h1>
                        </div>

                        <div className="flex items-center gap-3 rounded-full bg-black px-4 py-3 text-white shadow-[0_18px_36px_rgb(0_0_0/0.16)]">
                            <span className="grid size-10 place-items-center rounded-full bg-[#b7ff63] text-black">
                                <Activity size={22} strokeWidth={3} />
                            </span>
                            <div className="pr-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">
                                    Latest State
                                </p>
                                <p className="text-sm font-black">
                                    {latestStatus}
                                </p>
                            </div>
                        </div>
                    </header>

                    <div className="relative z-10 mt-0 grid flex-1 grid-rows-[minmax(0,1fr)_auto]">
                        <div className="relative flex min-h-0 items-center justify-center">

                            {featuredGame ? (
                                <>
                                    {leftGame && (
                                        <MiniGameSlab
                                            game={leftGame}
                                            side="left"
                                        />
                                    )}
                                    <FeaturedGamePanel game={featuredGame} />
                                    {rightGame && (
                                        <MiniGameSlab
                                            game={rightGame}
                                            side="right"
                                        />
                                    )}
                                </>
                            ) : (
                                <EmptyArchiveCard />
                            )}
                        </div>

                        <footer className="relative z-20 mx-auto -mt-1 grid w-full max-w-[940px] grid-cols-[1fr_auto_1fr] items-center gap-5 rounded-[30px] bg-black p-3 text-white shadow-[0_24px_50px_rgb(0_0_0/0.22)]">
                            <div className="rounded-[24px] bg-white/8 px-5 py-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/36">
                                    Library Energy
                                </p>
                                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/12">
                                    <div
                                        className="h-full rounded-full bg-[#b7ff63]"
                                        style={{
                                            width: `${achievementProgress}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="px-4 text-center">
                                <p className="text-[11px] font-black uppercase tracking-[0.36em] text-[#b7ff63]">
                                    Recent Games
                                </p>
                                <h2 className="mt-1 text-[32px] font-black leading-none tracking-[0.12em]">
                                    Save Files
                                </h2>
                            </div>

                            <LibraryArchiveLink />
                        </footer>
                    </div>
                </section>

                <BriefPanel stats={stats} references={references} />
            </section>
        </AppLayout>
    );
}
