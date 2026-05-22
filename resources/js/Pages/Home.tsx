import { ChevronLeft, ChevronRight, Clock3, Gamepad2, Plus, Sparkles, Trophy } from 'lucide-react';
import AddGameWizard from '../Components/AddGameWizard';
import AppLayout from '../Components/AppLayout';
import { GameCardData, ReferenceData, StatsData } from '../types';

function Cover({ game, className = '' }: { game: GameCardData; className?: string }) {
    if (game.cover_url) {
        return <img src={game.cover_url} alt={game.title} className={`h-full w-full object-cover ${className}`} />;
    }

    return (
        <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br from-white via-[#e9f1ef] to-[#b7d8cf] ${className}`}>
            <div className="absolute left-0 right-0 top-4 text-center text-[10px] font-black uppercase tracking-[0.35em] text-black/45">
                Premium
            </div>

            <div className="absolute left-5 right-5 top-[34%] text-center text-[26px] font-black leading-[0.96]">
                {game.title}
            </div>

            <div className="absolute bottom-[25%] left-1/2 grid size-20 -translate-x-1/2 place-items-center rounded-full border-4 border-black/15 text-4xl font-black text-black/25">
                S
            </div>

            <div className="absolute bottom-[18%] left-[18%] right-[18%] h-[6px] rounded-full bg-black/15" />
        </div>
    );
}

function PlatformMark({ platform }: { platform: string }) {
    const label = platform === 'Steam' ? 'S' : platform === 'Xbox' ? 'X' : platform.slice(0, 1);

    return (
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-black text-2xl font-black text-[#b7ff63]">
            {label}
        </div>
    );
}

function statusClass(status: string) {
    const value = status.toLowerCase();

    if (value === '100%') {
        return 'bg-[#ff3131] text-black';
    }

    if (value.includes('progress')) {
        return 'bg-[#f4df4d] text-black';
    }

    return 'bg-[#adadad] text-black';
}

function MiniGameSlab({
    game,
    side,
}: {
    game: GameCardData;
    side: 'left' | 'right';
}) {
    const progress = Math.min(Math.max(Number(game.progress ?? 0), 0), 100);

    return (
        <a
            href={game.id > 0 ? `/games/${game.id}` : '/library'}
            className={[
                'absolute top-1/2 z-10 flex h-[355px] w-[235px] -translate-y-1/2 flex-col overflow-hidden rounded-[34px] bg-[#b7ff63] p-3 shadow-[0_30px_55px_rgb(0_0_0/0.13)] transition hover:z-30 hover:scale-105',
                side === 'left' ? 'left-[7%] -rotate-6' : 'right-[7%] rotate-6',
            ].join(' ')}
        >
            <div className="h-[250px] overflow-hidden rounded-[24px] bg-[#eef1ef]">
                <Cover game={game} />
            </div>

            <div className="mx-auto -mt-4 rounded-full bg-black px-5 py-2 text-sm font-black text-white">
                {game.status}
            </div>

            <div className="mt-auto flex items-center gap-3">
                <PlatformMark platform={game.platform} />

                <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#a8d8ff]">
                    <div className="h-full rounded-full bg-[#4f8cf7]" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </a>
    );
}

function FeaturedGamePanel({ game }: { game: GameCardData }) {
    const progress = Math.min(Math.max(Number(game.progress ?? 0), 0), 100);
    const hasAchievements = Number(game.total_achievements ?? 0) > 0;

    return (
        <a
            href={game.id > 0 ? `/games/${game.id}` : '/library'}
            className="relative z-20 grid h-[565px] w-[405px] grid-rows-[1fr_auto] overflow-hidden rounded-[42px] bg-black p-3 shadow-[0_45px_90px_rgb(0_0_0/0.26)] transition hover:scale-[1.015]"
        >
            <div className="relative overflow-hidden rounded-[32px] bg-[#eef1ef]">
                <Cover game={game} />

                <div className="absolute left-4 top-4 rounded-full bg-black/85 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#b7ff63]">
                    Recent File
                </div>

                <div className="absolute bottom-4 left-4 right-4 rounded-[28px] bg-[#fbfcf7]/92 p-4 backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="line-clamp-2 text-[30px] font-black leading-[0.95]">
                                {game.title}
                            </h2>

                            <p className="mt-2 line-clamp-1 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                                {game.publisher || 'Unknown Publisher'}
                            </p>
                        </div>

                        <span
                            className={[
                                'shrink-0 rounded-full px-4 py-2 text-sm font-black',
                                statusClass(game.status),
                            ].join(' ')}
                        >
                            {game.status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-3 py-4 text-white">
                <PlatformMark platform={game.platform} />

                <div>
                    {hasAchievements ? (
                        <>
                            <div className="mb-2 flex items-center justify-between text-sm font-black text-white/70">
                                <span>Achievement Sync</span>
                                <span>{progress}%</span>
                            </div>

                            <div className="h-5 overflow-hidden rounded-full bg-white/20">
                                <div className="h-full rounded-full bg-[#4f8cf7]" style={{ width: `${progress}%` }} />
                            </div>
                        </>
                    ) : (
                        <div className="text-lg font-black text-white/80">No Achievements</div>
                    )}
                </div>

                <div className="text-right">
                    <div className="text-2xl font-black">{game.playtime_hours}H</div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-white/45">Playtime</div>
                </div>
            </div>
        </a>
    );
}

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

    const playtime = Number(stats.playtime_hours ?? 0).toLocaleString(undefined, {
        maximumFractionDigits: 1,
    });

    return (
        <AppLayout title="Home" lockViewport>
            <section className="grid h-full grid-cols-[minmax(0,1fr)_320px] items-center gap-10 pl-[88px]">
                <section className="flex h-full min-w-0 flex-col items-center justify-center">
                    <div className="relative flex h-[610px] w-full max-w-[1120px] items-center justify-center">
                        <div className="absolute inset-x-[12%] top-1/2 h-[260px] -translate-y-1/2 rounded-full bg-[#b7ff63]/25 blur-3xl" />

                        <button
                            type="button"
                            className="absolute left-0 top-1/2 z-40 grid size-[62px] -translate-y-1/2 place-items-center rounded-full bg-black text-white shadow-[0_18px_28px_rgb(0_0_0/0.18)] transition hover:scale-105"
                            aria-label="Previous game"
                        >
                            <ChevronLeft size={44} strokeWidth={3.2} />
                        </button>

                        {featuredGame ? (
                            <>
                                {leftGame && <MiniGameSlab game={leftGame} side="left" />}
                                <FeaturedGamePanel game={featuredGame} />
                                {rightGame && <MiniGameSlab game={rightGame} side="right" />}
                            </>
                        ) : (
                            <div className="relative z-20 grid h-[500px] w-[620px] place-items-center rounded-[42px] bg-black p-5 text-center shadow-[0_45px_90px_rgb(0_0_0/0.22)]">
                                <div className="grid h-full w-full place-items-center rounded-[32px] bg-[#b7ff63] p-12">
                                    <div>
                                        <Sparkles className="mx-auto mb-5" size={52} />
                                        <h2 className="text-4xl font-black leading-tight">
                                            Start your archive.
                                        </h2>
                                        <p className="mt-4 text-xl font-black text-black/55">
                                            Add your first game and build the shelf.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            className="absolute right-0 top-1/2 z-40 grid size-[62px] -translate-y-1/2 place-items-center rounded-full bg-black text-white shadow-[0_18px_28px_rgb(0_0_0/0.18)] transition hover:scale-105"
                            aria-label="Next game"
                        >
                            <ChevronRight size={44} strokeWidth={3.2} />
                        </button>
                    </div>

                    <h1 className="-mt-2 text-center text-[52px] font-black leading-none tracking-[0.08em]">
                        Recent games
                    </h1>
                </section>

                <aside className="flex h-[650px] w-full flex-col gap-5">
                    <section className="flex-1 rounded-[42px] bg-[#b7ff63] px-8 py-8 text-center shadow-[0_24px_42px_rgb(0_0_0/0.08)]">
                        <h2 className="text-[42px] font-black leading-none tracking-[0.06em]">Brief</h2>

                        <div className="mt-8 space-y-6 text-[25px] font-black">
                            <div>
                                <Trophy className="mx-auto mb-2" size={40} fill="black" strokeWidth={2.8} />
                                <div>
                                    {stats.earned_achievements ?? 0} / {stats.total_achievements ?? 0}
                                </div>
                                <div className="mt-1 text-[22px] text-black/55">Achievements</div>
                            </div>

                            <div className="mx-auto h-[3px] w-full rounded-full bg-black/20" />

                            <div>
                                <Clock3 className="mx-auto mb-2" size={40} strokeWidth={3} />
                                <div>{playtime} H</div>
                                <div className="mt-1 text-[22px] text-black/55">Playtime</div>
                            </div>

                            <div className="mx-auto h-[3px] w-full rounded-full bg-black/20" />

                            <div>
                                <Gamepad2 className="mx-auto mb-2" size={42} fill="black" strokeWidth={2.8} />
                                <div>{stats.library_games ?? 0}</div>
                                <div className="mt-1 text-[22px] text-black/55">Total Games</div>
                            </div>
                        </div>
                    </section>

<AddGameWizard
references={references}
buttonClassName="group relative h-[92px] w-full overflow-hidden rounded-[30px] bg-black px-5 text-left shadow-[0_24px_42px_rgb(0_0_0/0.22)] transition hover:-translate-y-1 hover:scale-[1.015]"
buttonContent={
    <>
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(183,255,99,0.22),transparent_34%),linear-gradient(135deg,rgba(183,255,99,0.16),transparent_45%)]" />

        <span className="relative z-10 flex h-full w-full items-center justify-between gap-4">
            <span className="flex items-center gap-4">
                <span className="grid size-[54px] place-items-center rounded-[20px] bg-[#b7ff63] text-black shadow-[inset_0_-5px_0_rgb(0_0_0/0.16)] transition group-hover:rotate-90">
                    <Plus size={34} strokeWidth={4} />
                </span>

                <span className="flex flex-col leading-none">
                    <span className="text-[12px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/55">
                        New Archive File
                    </span>

                    <span className="mt-2 text-[29px] font-black text-[#b7ff63]">
                        Add Game
                    </span>
                </span>
            </span>

            <span className="rounded-full border-2 border-[#b7ff63]/35 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#b7ff63]/75">
                Start
            </span>
        </span>
    </>
}
/>
                </aside>
            </section>
        </AppLayout>
    );
}