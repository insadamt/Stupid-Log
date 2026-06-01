import { Medal } from 'lucide-react';
import PlatformIcon from '../../../Components/PlatformIcon';
import { statusPillStyle } from '../../../statusColors';
import { ConfirmedYearStats, SnapshotBestGame } from '../../../types';
import { Empty } from '../components/Controls';
import { ProgressBar } from '../components/Progress';
import { hours } from '../utils';

function BestGameCard({ game }: { game: SnapshotBestGame }) {
    const progress = game.total_achievements > 0 ? Math.round((game.earned_achievements / game.total_achievements) * 100) : 0;

    return (
        <article className="grid gap-2">
            <div className="relative aspect-[3/4] min-h-0 overflow-hidden rounded-[24px] bg-black shadow-[0_22px_55px_rgb(9_14_12/0.16)] ring-1 ring-black/10">
                {game.cover_url ? <img src={game.cover_url} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center bg-[#d9dedb] text-5xl font-black text-black/28">#{game.rank ?? '?'}</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-[#b7ff63] px-3 py-1 text-sm font-black text-black shadow-[0_10px_24px_rgb(0_0_0/0.22)]">#{game.rank ?? '?'}</span>
                <div className="absolute inset-x-0 bottom-0 grid gap-3 p-4 text-white">
                    <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]" style={statusPillStyle(game)}>{game.status}</span>
                        <span className="rounded-full bg-white/14 px-2.5 py-1 text-xs font-black text-white">{hours(game.playtime_hours)}</span>
                    </div>
                    <div className="grid gap-1.5">
                        <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/58">
                            <span>Achievements</span>
                            <span>{game.earned_achievements}/{game.total_achievements || 0}</span>
                        </div>
                        <ProgressBar value={progress} tone="dark" />
                    </div>
                </div>
            </div>
            <div className="grid h-[100px] grid-rows-[44px_auto] rounded-[20px] bg-black p-4 text-white shadow-[0_16px_34px_rgb(0_0_0/0.14)]">
                <h3 className="line-clamp-2 text-lg font-black leading-[1.04]">{game.title}</h3>
                <div className="mt-2 flex min-w-0 items-center gap-2 text-xs font-bold text-[#b7ff63]/78">
                    <PlatformIcon platform={game.platform} surface="dark" size="xs" />
                    <span className="truncate">{game.platform}</span>
                </div>
            </div>
        </article>
    );
}

function BestGameGrid({ games, empty }: { games: SnapshotBestGame[]; empty: string }) {
    if (games.length === 0) {
        return <Empty text={empty} />;
    }

    return (
        <div className="grid min-h-0 items-start gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-5">
            {games.map((game, index) => <BestGameCard key={`${game.library_game_id}-${game.rank ?? index}`} game={game} />)}
        </div>
    );
}

export default function BestGames({ year }: { year?: ConfirmedYearStats | null }) {
    return (
        <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-4">
            <section className="rounded-[30px] bg-black p-5 text-white shadow-[0_24px_70px_rgb(0_0_0/0.18)]">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="text-xs font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">Best Games</div>
                        <h2 className="mt-1 text-4xl font-black leading-none tracking-[-0.05em]">
                            {year ? `Top 5 of ${year.year}` : 'Latest Snapshot'}
                        </h2>
                    </div>
                    <div className="grid size-12 place-items-center rounded-[18px] bg-[#b7ff63] text-black"><Medal size={25} strokeWidth={3} /></div>
                </div>
            </section>

            {year
                ? <BestGameGrid games={year.best_games ?? []} empty={`No best games were selected for ${year.year}.`} />
                : <Empty text="Confirm a yearly snapshot and select best games to build this list." />}
        </div>
    );
}
