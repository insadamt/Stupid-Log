import { Link } from '@inertiajs/react';
import { ArrowUpRight, Clock3, Gamepad2, ImageOff, Trophy } from 'lucide-react';
import { statusPillStyle } from '../statusColors';
import { GameCardData } from '../types';

function PlatformIcon({
    platform,
    large = false,
    compact = false,
}: {
    platform: string;
    large?: boolean;
    compact?: boolean;
}) {
    const label = platform === 'Steam' ? 'S' : platform === 'Xbox' ? 'X' : platform.slice(0, 1);

    return (
        <span
            className={[
                'grid shrink-0 place-items-center rounded-full bg-[#b7ff63] font-black text-black shadow-[0_10px_22px_rgb(0_0_0/0.24)] ring-2 ring-black',
                large ? 'size-12 text-2xl' : compact ? 'size-10 text-xl' : 'size-10 text-xl',
            ].join(' ')}
        >
            {label}
        </span>
    );
}

function coverTitle(title: string) {
    const clean = title.trim();

    return clean.length > 18 ? `${clean.slice(0, 18)}...` : clean;
}

function panelTitle(title: string) {
    const clean = title.trim();

    return clean.length > 52 ? `${clean.slice(0, 52)}...` : clean;
}

function formatHours(value: number | string | null | undefined) {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return '0';
    return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(1);
}

export function CoverArt({
    game,
    titleSize = 'text-[25px]',
}: {
    game: GameCardData;
    titleSize?: string;
}) {
    if (game.cover_url) {
        return <img src={game.cover_url} alt={game.title} className="h-full w-full object-cover" />;
    }

    return (
        <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[#dfe5df] p-5 text-center">
            <div className="absolute inset-0 [background-image:linear-gradient(rgba(0,0,0,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.055)_1px,transparent_1px)] [background-size:26px_26px]" />
            <div className="absolute inset-x-0 top-0 h-20 bg-[#b7ff63]/30" />

            <div className="relative z-10 grid max-w-full justify-items-center gap-3">
                <div className="grid size-14 place-items-center rounded-[20px] bg-black text-[#b7ff63] shadow-[0_14px_24px_rgb(0_0_0/0.16)]">
                    <ImageOff size={30} strokeWidth={3} />
                </div>

                <div className={`${titleSize} line-clamp-2 max-w-[92%] font-black leading-[0.96] text-black/72`}>
                    {coverTitle(game.title)}
                </div>
            </div>
        </div>
    );
}

export default function GameCard({
    game,
    expanded = true,
    featured = false,
    homeSide = false,
    compact = false,
    panelSide = 'right',
}: {
    game: GameCardData;
    expanded?: boolean;
    featured?: boolean;
    homeSide?: boolean;
    compact?: boolean;
    panelSide?: 'left' | 'right';
}) {
    const href = game.id > 0 ? `/games/${game.id}` : '/library';

    const progress = Math.min(Math.max(Number(game.progress ?? 0), 0), 100);
    const hasAchievements = Number(game.total_achievements ?? 0) > 0;

    const shellWidth = featured ? 'w-[342px]' : homeSide ? 'w-[286px]' : compact ? 'w-[200px]' : 'w-[250px]';
    const cardHeight = featured ? 'h-[560px]' : homeSide ? 'h-[500px]' : compact ? 'h-[335px]' : 'h-[410px]';
    const coverHeight = featured ? 'h-[424px]' : homeSide ? 'h-[386px]' : compact ? 'h-[235px]' : 'h-[300px]';
    const padding = featured ? 'p-4' : 'p-3';
    const radius = featured ? 'rounded-[30px]' : compact ? 'rounded-[26px]' : 'rounded-[24px]';
    const panelWidth = compact ? 'w-[310px]' : 'w-[380px]';

    const panelPosition =
        panelSide === 'left'
            ? `${compact ? 'right-[200px]' : 'right-[250px]'} rounded-l-[28px]`
            : `${compact ? 'left-[200px]' : 'left-[250px]'} rounded-r-[28px]`;

    return (
        <article
            className={[
                'sl-card-hover group relative flex shrink-0 overflow-visible',
                panelSide === 'left' ? 'sl-panel-left' : 'sl-panel-right',
                shellWidth,
                cardHeight,
            ].join(' ')}
        >
            <Link
                href={href}
                className={[
                    'sl-card-shell relative z-10 flex h-full shrink-0 flex-col overflow-hidden bg-black focus:outline-none ring-1 ring-white/10',
                    shellWidth,
                    padding,
                    radius,
                    featured ? 'shadow-[0_34px_80px_rgb(0_0_0/0.24)]' : 'shadow-[0_20px_46px_rgb(0_0_0/0.16)]',
                ].join(' ')}
            >
                <div className={`${coverHeight} relative z-0 overflow-hidden rounded-[18px] bg-[#dfe5df] ring-1 ring-white/10`}>
                    <CoverArt game={game} titleSize={featured ? 'text-[32px]' : compact ? 'text-[24px]' : 'text-[24px]'} />
                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" />
                </div>

                <div className="relative z-20 h-12 shrink-0 bg-[#b7ff63]">
                    <span
                        className={[
                            'absolute left-1/2 top-[62%] max-w-[88%] -translate-x-1/2 -translate-y-1/2 truncate rounded-full px-6 py-2 font-black leading-none shadow-[0_12px_22px_rgb(0_0_0/0.2)]',
                            featured ? 'text-lg' : compact ? 'text-base' : 'text-base',
                        ].join(' ')}
                        style={statusPillStyle(game)}
                    >
                        {game.status}
                    </span>
                </div>

                <div className="relative z-10 mt-auto flex items-center gap-3 pb-1 pt-2 text-white">
                    <PlatformIcon platform={game.platform} large={featured} compact={compact} />

                    {hasAchievements ? (
                        <>
                            <div className="h-5 flex-1 overflow-hidden rounded-full bg-white/12 ring-1 ring-white/10">
                                <div className="h-full rounded-full bg-[#b7ff63]" style={{ width: `${progress}%` }} />
                            </div>

                            <span className="sl-mini-stat text-base font-black text-[#b7ff63]">{progress}%</span>
                        </>
                    ) : (
                        <span className="text-lg font-black leading-none text-white">No Achievements</span>
                    )}
                </div>
            </Link>

            {!featured && !homeSide && expanded && (
                <div
                    className={`sl-card-panel absolute ${panelPosition} top-0 flex h-full ${panelWidth} flex-col overflow-hidden bg-black px-6 py-5 text-[#b7ff63] ring-1 ring-[#b7ff63]/20`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-[#b7ff63]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">
                            Inspect
                        </span>

                        <span className="max-w-[120px] truncate rounded-full border border-[#b7ff63]/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#b7ff63]/70">
                            {game.platform}
                        </span>
                    </div>

                    <div className="mt-3 h-[46px] overflow-hidden" title={game.title}>
                        <h3 className="line-clamp-2 text-[18px] font-black leading-[1.06] text-white [overflow-wrap:anywhere]">
                            {panelTitle(game.title)}
                        </h3>
                    </div>

                    <p className="mt-1 truncate text-[12px] font-black uppercase tracking-[0.14em] text-white/38">
                        {game.publisher || 'Unknown Publisher'}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-[18px] bg-white/10 p-3 text-center ring-1 ring-white/10">
                            <Trophy className="mx-auto mb-1 text-[#b7ff63]" size={24} fill="currentColor" />

                            <div className="text-lg font-black text-white">
                                {game.earned_achievements} / {game.total_achievements || 0}
                            </div>

                            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#b7ff63]/58">
                                Achievements
                            </div>
                        </div>

                        <div className="rounded-[18px] bg-white/10 p-3 text-center ring-1 ring-white/10">
                            <Clock3 className="mx-auto mb-1 text-[#b7ff63]" size={24} />

                            <div className="text-lg font-black text-white">{formatHours(game.playtime_hours)} H</div>

                            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#b7ff63]/58">
                                Playtime
                            </div>
                        </div>
                    </div>

                    <Link
                        href={href}
                        className="mt-auto flex h-[52px] items-center justify-center gap-3 rounded-[18px] bg-[#b7ff63] text-xl font-black text-black shadow-[inset_0_-5px_0_rgb(0_0_0/0.14)] transition hover:-translate-y-0.5"
                    >
                        Details <ArrowUpRight size={23} strokeWidth={3} />
                    </Link>

                    <Gamepad2 className="sr-only" />
                </div>
            )}
        </article>
    );
}
