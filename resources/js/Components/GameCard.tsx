import { Link } from '@inertiajs/react';
import { Clock3, Gamepad2, ImageOff, Trophy } from 'lucide-react';
import { GameCardData } from '../types';

function PlatformIcon({ platform, large = false, compact = false }: { platform: string; large?: boolean; compact?: boolean }) {
    const label = platform === 'Steam' ? 'S' : platform === 'Xbox' ? 'X' : platform.slice(0, 1);

    return (
        <span
            className={[
                'grid shrink-0 place-items-center rounded-full bg-black font-black text-[#b7ff63]',
                large ? 'size-12 text-2xl' : compact ? 'size-10 text-xl' : 'size-10 text-xl',
            ].join(' ')}
        >
            {label}
        </span>
    );
}

export function CoverArt({ game, titleSize = 'text-[25px]' }: { game: GameCardData; titleSize?: string }) {
    if (game.cover_url) {
        return <img src={game.cover_url} alt={game.title} className="h-full w-full object-cover" />;
    }

    return (
        <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[#d9dedb] p-5 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.58),transparent_62%)]" />
            <div className="relative z-10 grid max-w-full justify-items-center gap-3">
                <div className="grid size-14 place-items-center rounded-3xl bg-black/10 text-black/42">
                    <ImageOff size={30} strokeWidth={3} />
                </div>
                <div className={`${titleSize} line-clamp-3 max-w-full [overflow-wrap:anywhere] font-black leading-[0.95] text-black/72`}>
                    {game.title}
                </div>
            </div>
        </div>
    );
}

function statusClass(status: string) {
    const value = status.toLowerCase();

    if (value === '100%') return 'bg-[#ff3131] text-black';
    if (value.includes('progress')) return 'bg-[#f4df4d] text-black';
    return 'bg-[#adadad] text-black';
}

export default function GameCard({
    game,
    expanded = true,
    featured = false,
    homeSide = false,
    compact = false,
}: {
    game: GameCardData;
    expanded?: boolean;
    featured?: boolean;
    homeSide?: boolean;
    compact?: boolean;
}) {
    const href = game.id > 0 ? `/games/${game.id}` : '/library';
    const progress = Math.min(Math.max(Number(game.progress ?? 0), 0), 100);
    const hasAchievements = Number(game.total_achievements ?? 0) > 0;
    const shellWidth = featured ? 'w-[342px]' : homeSide ? 'w-[286px]' : compact ? 'w-[230px]' : 'w-[250px]';
    const cardHeight = featured ? 'h-[560px]' : homeSide ? 'h-[500px]' : compact ? 'h-[330px]' : 'h-[410px]';
    const coverHeight = featured ? 'h-[424px]' : homeSide ? 'h-[386px]' : compact ? 'h-[230px]' : 'h-[300px]';
    const padding = featured ? 'p-4' : compact ? 'p-3' : 'p-3';
    const radius = featured ? 'rounded-[28px]' : compact ? 'rounded-[24px]' : 'rounded-[24px]';
    const panelLeft = compact ? 'left-[230px]' : 'left-[250px]';
    const panelWidth = compact ? 'w-[350px]' : 'w-[380px]';

    return (
        <article className={['sl-card-hover group relative flex shrink-0 overflow-visible', shellWidth, cardHeight].join(' ')}>
            <Link
                href={href}
                className={[
                    'sl-card-shell relative z-10 flex h-full shrink-0 flex-col overflow-hidden bg-[#b7ff63] focus:outline-none',
                    shellWidth,
                    padding,
                    radius,
                    featured ? 'shadow-[0_30px_70px_rgb(0_0_0/0.16)]' : 'shadow-[0_16px_34px_rgb(0_0_0/0.08)]',
                ].join(' ')}
            >
                <div className={`${coverHeight} relative z-0 overflow-hidden rounded-[18px] bg-[#d9dedb]`}>
                    <CoverArt game={game} titleSize={featured ? 'text-[32px]' : compact ? 'text-[24px]' : 'text-[24px]'} />
                </div>

                <span className={['relative z-20 mx-auto -mt-4 rounded-full px-6 py-2 font-black leading-none', featured ? 'text-lg' : compact ? 'text-base' : 'text-base', statusClass(game.status)].join(' ')}>
                    {game.status}
                </span>

                <div className="relative z-10 mt-auto flex items-center gap-3 pb-1">
                    <PlatformIcon platform={game.platform} large={featured} compact={compact} />
                    {hasAchievements ? (
                        <>
                            <div className={['flex-1 overflow-hidden rounded-full bg-[#a8d8ff]', compact ? 'h-5' : 'h-5'].join(' ')}>
                                <div className="h-full rounded-full bg-[#4f8cf7]" style={{ width: `${progress}%` }} />
                            </div>
                            <span className={['sl-mini-stat font-black', compact ? 'text-base' : 'text-base'].join(' ')}>{progress}%</span>
                        </>
                    ) : (
                        <span className={['font-black leading-none', compact ? 'text-lg' : 'text-lg'].join(' ')}>No Achievements</span>
                    )}
                </div>
            </Link>

            {!featured && !homeSide && expanded && (
                <div className={`sl-card-panel absolute ${panelLeft} top-0 flex h-full ${panelWidth} flex-col overflow-hidden rounded-r-[28px] bg-[#b7ff63] px-7 py-6`}>
                    <h3 className="line-clamp-2 border-b-4 border-black/20 pb-2 text-[28px] font-black leading-[0.98]">{game.title}</h3>
                    <p className="mt-3 truncate text-base font-black">{game.publisher || 'Unknown Publisher'}</p>
                    <div className="mt-6 space-y-4 text-center">
                        <div className="flex items-center justify-center gap-4">
                            <Trophy size={30} fill="black" />
                            <div>
                                <div className="text-xl font-black">{game.earned_achievements} / {game.total_achievements || 0}</div>
                                <div className="text-lg font-black text-black/60">Achievements</div>
                            </div>
                        </div>
                        <div className="mx-auto h-1 w-56 bg-black/20" />
                        <div className="flex items-center justify-center gap-4">
                            <Clock3 size={30} />
                            <div>
                                <div className="text-xl font-black">{game.playtime_hours} H</div>
                                <div className="text-lg font-black text-black/60">Playtime</div>
                            </div>
                        </div>
                    </div>
                    <Link href={href} className="mt-auto flex h-[58px] items-center justify-center rounded-[20px] bg-black text-2xl font-black text-white">Details</Link>
                    <Gamepad2 className="sr-only" />
                </div>
            )}
        </article>
    );
}
