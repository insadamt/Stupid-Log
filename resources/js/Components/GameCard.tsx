import { Link } from '@inertiajs/react';
import { Clock3, Gamepad2, Trophy } from 'lucide-react';
import { GameCardData } from '../types';

function PlatformIcon({ platform }: { platform: string }) {
    const label = platform === 'Steam' ? 'S' : platform === 'Xbox' ? 'X' : platform.slice(0, 1);
    return <span className="grid size-10 place-items-center rounded-full bg-black text-xl font-black text-[#b7ff63]">{label}</span>;
}

function CoverArt({ game }: { game: GameCardData }) {
    if (game.cover_url) {
        return <img src={game.cover_url} alt="" className="h-full w-full object-contain" />;
    }

    return (
        <div className="sl-cover-art h-full w-full">
            <div className="absolute left-0 right-0 top-3 text-center text-[10px] font-black uppercase tracking-[0.35em] text-black/50">Premium</div>
            <div className="absolute left-4 right-4 top-[31%] text-center text-[25px] font-black leading-[0.96]">
                {game.title}
            </div>
            <div className="absolute bottom-[24%] left-1/2 grid size-20 -translate-x-1/2 place-items-center rounded-full border-4 border-black/15 text-4xl font-black text-black/25">
                S
            </div>
        </div>
    );
}

export default function GameCard({
    game,
    expanded = true,
    featured = false,
    homeSide = false,
}: {
    game: GameCardData;
    expanded?: boolean;
    featured?: boolean;
    homeSide?: boolean;
}) {
    const href = game.id > 0 ? `/games/${game.id}` : '/library';
    const cardHeight = featured ? 'h-[560px]' : homeSide ? 'h-[430px]' : 'h-[410px]';
    const coverHeight = featured ? 'h-[428px]' : homeSide ? 'h-[318px]' : 'h-[300px]';
    const baseWidth = featured ? '!w-[352px]' : homeSide ? '!w-[270px]' : 'w-[250px]';
    const cardWidth = featured ? 'w-[352px]' : homeSide ? 'w-[270px]' : 'w-[250px]';
    const panelLeft = featured || homeSide ? '' : 'left-[250px]';

    return (
        <article
            className={[
                'sl-card-hover group relative flex shrink-0 overflow-visible',
                cardHeight,
                baseWidth,
            ].join(' ')}
        >
            <Link
                href={href}
                className={`sl-card-shell relative z-10 flex ${cardWidth} ${featured ? 'p-4' : 'p-3'} h-full shrink-0 flex-col overflow-hidden rounded-[28px] bg-[#b7ff63] focus:outline-none`}
            >
                <div className={`${coverHeight} overflow-hidden rounded-[18px] bg-[#eef1ef]`}>
                    <CoverArt game={game} />
                </div>
                <span className={`${featured ? 'text-lg' : 'text-base'} mx-auto -mt-4 rounded-full bg-[#adadad] px-7 py-2 font-black`}>{game.status}</span>
                <div className="mt-auto flex items-center gap-3 pb-1">
                    <PlatformIcon platform={game.platform} />
                    <div className="h-5 flex-1 rounded-full bg-[#a8d8ff]">
                        <div className="h-full rounded-full bg-[#4f8cf7]" style={{ width: `${Math.min(game.progress, 100)}%` }} />
                    </div>
                    <span className="sl-mini-stat text-base font-black">{game.progress}%</span>
                </div>
            </Link>

            {!featured && !homeSide && (
            <div className={`sl-card-panel absolute ${panelLeft} top-0 flex h-full w-[380px] flex-col overflow-hidden rounded-r-[28px] bg-[#b7ff63] px-8 py-7`}>
                <h3 className="line-clamp-2 border-b-4 border-black/20 pb-2 text-[31px] font-black leading-[0.98]">{game.title}</h3>
                <p className="mt-3 truncate text-lg font-black">{game.publisher || 'Unknown Publisher'}</p>
                <div className="mt-7 space-y-5 text-center">
                    <div className="flex items-center justify-center gap-4">
                        <Trophy size={32} fill="black" />
                        <div>
                            <div className="text-2xl font-black">
                                {game.earned_achievements} / {game.total_achievements || 0}
                            </div>
                            <div className="text-xl font-black text-black/60">Achievements</div>
                        </div>
                    </div>
                    <div className="mx-auto h-1 w-64 bg-black/20" />
                    <div className="flex items-center justify-center gap-4">
                        <Clock3 size={32} />
                        <div>
                            <div className="text-2xl font-black">{game.playtime_hours} H</div>
                            <div className="text-xl font-black text-black/60">Playtime</div>
                        </div>
                    </div>
                </div>
                <Link
                    href={href}
                    className="mt-auto flex h-[68px] items-center justify-center rounded-[22px] bg-black text-3xl font-black text-white"
                >
                    Details
                </Link>
                <Gamepad2 className="sr-only" />
            </div>
            )}
        </article>
    );
}
