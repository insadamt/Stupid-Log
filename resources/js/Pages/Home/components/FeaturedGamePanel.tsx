import { ArrowUpRight } from 'lucide-react';
import { CoverArt } from '../../../Components/GameCard';
import PlatformIcon from '../../../Components/PlatformIcon';
import { statusPillStyle } from '../../../statusColors';
import { GameCardData } from '../../../types';

export default function FeaturedGamePanel({ game }: { game: GameCardData }) {
    const progress = Math.min(Math.max(Number(game.progress ?? 0), 0), 100);

    return (
        <a
            href={game.id > 0 ? `/games/${game.id}` : "/library"}
            className="group relative z-20 h-[565px] w-[350px] overflow-visible rounded-[46px] bg-black p-3 shadow-[0_48px_95px_rgb(0_0_0/0.28)] transition duration-300 hover:-translate-y-1 hover:scale-[1.012]"
        >
            <div className="relative flex h-full flex-col overflow-hidden rounded-[38px] bg-[#b7ff63] p-3">
                <div className="relative h-[435px] overflow-hidden rounded-[30px] bg-black shadow-[0_22px_42px_rgb(0_0_0/0.22)]">
                    {game.cover_url ? (
                        <img
                            src={game.cover_url}
                            alt={game.title}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <CoverArt game={game} titleSize="text-[34px]" />
                    )}

                    <div className="absolute left-4 top-4 rounded-full bg-black/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63] shadow-[0_12px_22px_rgb(0_0_0/0.22)]">
                        Active File
                    </div>
                </div>

                <span
                    className={[
                        "relative z-20 mx-auto -mt-4 rounded-full px-7 py-2 text-base font-black leading-none shadow-[0_12px_22px_rgb(0_0_0/0.18)]",
                    ].join(" ")}
                    style={statusPillStyle(game)}
                >
                    {game.status}
                </span>

                <div className="mt-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[26px] bg-black px-4 py-3 text-white">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-black p-1">
                        <PlatformIcon platform={game.platform} surface="dark" size="lg" />
                    </span>

                    <div className="min-w-0">
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">
                                    Achievements
                                </p>

                                <p className="mt-1 text-[24px] font-black leading-none text-white">
                                    {Number(game.total_achievements ?? 0) > 0
                                        ? `${game.earned_achievements ?? 0}/${game.total_achievements ?? 0}`
                                        : "None"}
                                </p>
                            </div>

                            <p className="text-[22px] font-black leading-none text-[#b7ff63]">
                                {progress}%
                            </p>
                        </div>

                        <div className="mt-2 h-3.5 overflow-hidden rounded-full bg-white/12">
                            <div
                                className="h-full rounded-full bg-[#4f8cf7]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="grid size-[46px] place-items-center rounded-full bg-[#b7ff63] text-black transition group-hover:rotate-45">
                        <ArrowUpRight size={24} strokeWidth={3.2} />
                    </div>
                </div>
            </div>
        </a>
    );
}
