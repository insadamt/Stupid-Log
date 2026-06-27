import { Link } from '@inertiajs/react';
import { ArrowUpRight, Clock3, Gamepad2, ImageOff, Link2, RadioTower, Trophy } from 'lucide-react';
import { ReactNode } from 'react';
import PlatformIcon from './PlatformIcon';
import { GameCardData } from '../types';
import { statusPillStyle } from '../statusColors';

function coverTitle(title: string) {
    const clean = title.trim();

    return clean.length > 18 ? `${clean.slice(0, 18)}...` : clean;
}

function panelTitle(title: string) {
    const clean = title.trim();

    return clean.length > 52 ? `${clean.slice(0, 52)}...` : clean;
}

function gameDetailsHref(gameId: number) {
    if (gameId <= 0) return '/library';
    if (typeof window === 'undefined' || window.location.pathname !== '/library') return `/games/${gameId}`;

    return `/games/${gameId}${window.location.search}`;
}

export function CoverArt({
    game,
    titleSize = 'text-[25px]',
}: {
    game: GameCardData;
    titleSize?: string;
}) {
    if (game.cover_url) {
        return (
            <div className="relative h-full w-full overflow-hidden bg-[#d9dedb]">
                <img
                    src={game.cover_url}
                    alt={game.title}
                    className="h-full w-full object-cover object-top"
                    draggable={false}
                    decoding="async"
                />
            </div>
        );
    }

    return (
        <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[#d9dedb] p-5 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.58),transparent_62%)]" />

            <div className="relative z-10 grid max-w-full justify-items-center gap-3">
                <div className="grid size-14 place-items-center rounded-3xl bg-black/10 text-black/42">
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
    const href = gameDetailsHref(game.id);

    const progress = Math.min(Math.max(Number(game.progress ?? 0), 0), 100);
    const hasAchievements = Number(game.total_achievements ?? 0) > 0;
    const isLinkedTarget = Boolean(game.linked_progress_summary?.is_target);
    const isSyncSource = Number(game.linked_progress_summary?.source_count ?? 0) > 0;

    const shellWidth = featured ? 'w-[314px]' : homeSide ? 'w-[258px]' : compact ? 'w-[180px]' : 'w-[226px]';
    const cardHeight = featured ? 'h-[514px]' : homeSide ? 'h-[444px]' : compact ? 'h-[306px]' : 'h-[378px]';
    const coverHeight = featured ? 'h-[382px]' : homeSide ? 'h-[326px]' : compact ? 'h-[214px]' : 'h-[270px]';
    const padding = featured ? 'p-4' : compact ? 'p-2.5' : 'p-3';
    const radius = featured ? 'rounded-[28px]' : compact ? 'rounded-[24px]' : 'rounded-[24px]';
    const panelWidth = compact ? 'w-[310px]' : 'w-[380px]';

    const panelPosition =
        panelSide === 'left'
            ? `${compact ? 'right-[180px]' : 'right-[226px]'} rounded-l-[28px]`
            : `${compact ? 'left-[180px]' : 'left-[226px]'} rounded-r-[28px]`;
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
                    'sl-card-shell relative z-10 flex h-full shrink-0 flex-col overflow-hidden bg-[#b7ff63] focus:outline-none',
                    shellWidth,
                    padding,
                    radius,
                    featured ? 'shadow-[0_30px_70px_rgb(0_0_0/0.16)]' : 'shadow-[0_16px_34px_rgb(0_0_0/0.08)]',
                ].join(' ')}
            >
                <div className={`${coverHeight} relative z-0 overflow-hidden rounded-[18px] bg-[#d9dedb]`}>
                    <CoverArt game={game} titleSize={featured ? 'text-[32px]' : compact ? 'text-[24px]' : 'text-[24px]'} />
                    {(isLinkedTarget || isSyncSource) && (
                        <div className="absolute left-2.5 top-2.5 z-20 flex flex-wrap gap-1.5">
                            {isLinkedTarget && <ProgressBadge icon={<Link2 size={11} strokeWidth={3} />} label="Linked" />}
                            {isSyncSource && <ProgressBadge icon={<RadioTower size={11} strokeWidth={3} />} label="Source" />}
                        </div>
                    )}
                </div>

                <span
                    className={[
                        'relative z-20 mx-auto -mt-4 rounded-full px-5 py-2 font-black leading-none outline-4 outline-[#b7ff63]',
                        featured ? 'text-lg' : compact ? 'text-sm' : 'text-base',
                    ].join(' ')}
                    style={statusPillStyle(game)}
                >
                    {game.status}
                </span>

                <div className="relative z-10 mt-auto flex items-center gap-3 pb-1">
                    <PlatformIcon platform={game.platform} surface="lime" size={featured ? 'lg' : compact ? 'sm' : 'md'} />

                    {hasAchievements ? (
                        <>
                            <div className="h-5 flex-1 overflow-hidden rounded-full bg-[#a8d8ff]">
                                <div className="h-full rounded-full bg-[#4f8cf7]" style={{ width: `${progress}%` }} />
                            </div>

                            <span className="sl-mini-stat text-base font-black">{progress}%</span>
                        </>
                    ) : (
                        <span className={compact ? 'text-sm font-black leading-none' : 'text-base font-black leading-none'}>
                            No Achievements
                        </span>
                    )}
                </div>
            </Link>

            {!featured && !homeSide && expanded && (
                <div
                    className={`sl-card-panel absolute ${panelPosition} top-0 flex h-full ${panelWidth} flex-col overflow-hidden bg-black px-6 py-5 text-[#b7ff63]`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-[#b7ff63]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">
                            Inspect
                        </span>

                        <span className="inline-flex max-w-[150px] items-center gap-2 rounded-full border border-[#b7ff63]/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#b7ff63]/70">
                            <PlatformIcon platform={game.platform} surface="dark" size="xs" className="-ml-1" />
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

                    {(isLinkedTarget || isSyncSource) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {isLinkedTarget && <ProgressBadge icon={<Link2 size={11} strokeWidth={3} />} label="Linked" dark />}
                            {isSyncSource && <ProgressBadge icon={<RadioTower size={11} strokeWidth={3} />} label="Source" dark />}
                        </div>
                    )}

                    <div className={`${isLinkedTarget || isSyncSource ? 'mt-3' : 'mt-4'} grid grid-cols-2 gap-3`}>
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

                            <div className="text-lg font-black text-white">{game.playtime_hours} H</div>

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

function ProgressBadge({ icon, label, dark = false }: { icon: ReactNode; label: string; dark?: boolean }) {
    return (
        <span
            className={[
                'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[9px] font-black uppercase tracking-[0.12em] shadow-[0_8px_16px_rgb(0_0_0/0.16)]',
                dark ? 'bg-[#b7ff63] text-black' : 'bg-black/84 text-[#b7ff63]',
            ].join(' ')}
        >
            {icon}
            {label}
        </span>
    );
}
