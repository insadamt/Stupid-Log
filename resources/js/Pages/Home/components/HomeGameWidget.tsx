import { RefObject, forwardRef } from 'react';
import { ArrowUpRight, Dice5, LucideIcon } from 'lucide-react';
import { CoverArt } from '../../../Components/GameCard';
import PlatformIcon from '../../../Components/PlatformIcon';
import { statusPillStyle } from '../../../statusColors';
import { GameCardData } from '../../../types';

type HomeGameWidgetProps = {
    title: string;
    eyebrow: string;
    game: GameCardData | null;
    icon: LucideIcon;
    emptyTitle: string;
    emptyText: string;
    variant: 'feature' | 'compact';
    coverRef?: RefObject<HTMLDivElement | null>;
    action?: {
        label: string;
        loading?: boolean;
        onClick: () => void;
    };
};

const HomeGameWidget = forwardRef<HTMLElement, HomeGameWidgetProps>(function HomeGameWidget({
    title,
    eyebrow,
    game,
    icon: Icon,
    emptyTitle,
    emptyText,
    variant,
    coverRef,
    action,
}, ref) {
    if (variant === 'feature') {
        return (
            <section ref={ref} data-home-widget className="relative min-h-0 overflow-hidden rounded-[38px] border border-white/10 bg-[#101816] p-6 shadow-[0_24px_70px_rgb(0_0_0/0.24)]">
                <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#b7ff63,rgba(183,255,99,0.12))]" />
                {game?.cover_url && (
                    <img
                        src={game.cover_url}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="pointer-events-none absolute -right-10 top-1/2 h-[115%] w-[36%] -translate-y-1/2 object-cover object-top opacity-[0.08] blur-[2px]"
                    />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.045),transparent_46%)]" />
                <div className="relative grid h-full min-h-0 content-center gap-8 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
                    <div className="min-w-0">
                        <div data-random-copy className="inline-flex items-center gap-3 rounded-full bg-[#b7ff63]/12 px-4 py-2 text-[#b7ff63]">
                            <Dice5 size={18} strokeWidth={3} />
                            <span className="text-[10px] font-black uppercase tracking-[0.26em]">{eyebrow}</span>
                        </div>

                        <h2 data-random-copy className="mt-6 max-w-[680px] text-[54px] font-black leading-[0.88] tracking-[-0.065em] text-white">
                            {game?.title ?? emptyTitle}
                        </h2>

                        <p data-random-copy className="mt-5 max-w-[540px] text-base font-black leading-relaxed text-white/46">
                            {game ? 'This one is still open. Give it a clean session or roll again.' : emptyText}
                        </p>

                        {game && (
                            <div data-random-copy className="mt-6 flex flex-wrap items-center gap-3">
                                <MetaPill game={game} />
                                <Metric label="Playtime" value={`${Number(game.playtime_hours ?? 0).toFixed(1)}H`} />
                                <Metric label="Progress" value={`${Math.min(Math.max(Number(game.progress ?? 0), 0), 100)}%`} />
                            </div>
                        )}

                        <div data-random-copy className="mt-8 flex flex-wrap gap-3">
                            {action && <ActionButton action={action} />}
                            {game && (
                                <a href={`/games/${game.id}`} className="group inline-flex h-13 items-center gap-2 rounded-full bg-[#b7ff63] px-5 text-sm font-black text-black transition hover:-translate-y-0.5">
                                    Open Game
                                    <ArrowUpRight size={18} strokeWidth={3} className="transition group-hover:rotate-45" />
                                </a>
                            )}
                        </div>
                    </div>

                    <div ref={coverRef} className="hidden xl:block">
                        {game ? (
                            <div className="relative aspect-[3/4] rotate-2 overflow-hidden rounded-[28px] bg-white/80 p-2 shadow-[0_22px_54px_rgb(0_0_0/0.28)]">
                                <div className="absolute inset-2 rounded-[22px] border border-black/10" />
                                <div className="h-full overflow-hidden rounded-[20px]">
                                    <CoverContent game={game} titleSize="text-[24px]" />
                                </div>
                            </div>
                        ) : (
                            <EmptyThumb icon={Icon} />
                        )}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section data-home-widget className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[30px] border border-white/10 bg-[#101816]/92 text-white shadow-[0_18px_48px_rgb(0_0_0/0.18)]">
            <header className="flex items-center justify-between gap-4 border-b border-white/8 bg-white/[0.035] px-5 py-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#b7ff63]">{eyebrow}</p>
                    <h2 className="mt-1 text-2xl font-black leading-none tracking-[-0.04em]">{title}</h2>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#b7ff63] text-black">
                    <Icon size={22} strokeWidth={3} />
                </span>
            </header>

            {game ? (
                <div className="grid min-h-0 grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-4 p-5">
                    <div className="aspect-[3/4] overflow-hidden rounded-[20px] bg-white/80 p-1 shadow-[0_14px_30px_rgb(0_0_0/0.18)]">
                        <div className="h-full overflow-hidden rounded-[16px]">
                        <CoverContent game={game} titleSize="text-[18px]" />
                        </div>
                    </div>
                    <div className="min-w-0">
                        <h3 className="line-clamp-2 text-[23px] font-black leading-[0.96] tracking-[-0.045em]">{game.title}</h3>
                        <div className="mt-3 flex min-w-0 items-center gap-2 text-sm font-black text-white/42">
                            <PlatformIcon platform={game.platform} surface="dark" size="sm" />
                            <span className="truncate">{game.platform}</span>
                        </div>
                    </div>
                    <a href={`/games/${game.id}`} className="group grid size-12 place-items-center rounded-full bg-[#b7ff63] text-black shadow-[0_12px_24px_rgb(183_255_99/0.12)] transition hover:-translate-y-0.5">
                        <ArrowUpRight size={21} strokeWidth={3} className="transition group-hover:rotate-45" />
                    </a>
                </div>
            ) : (
                <div className="grid place-items-center p-6 text-center">
                    <div>
                        <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#b7ff63] text-black">
                            <Icon size={24} strokeWidth={3} />
                        </div>
                        <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">{emptyTitle}</h3>
                        <p className="mx-auto mt-2 max-w-[260px] text-sm font-black leading-relaxed text-white/36">{emptyText}</p>
                    </div>
                </div>
            )}
        </section>
    );
});

function MetaPill({ game }: { game: GameCardData }) {
    return (
        <span className="inline-flex h-11 items-center gap-2 rounded-full bg-white/8 px-4 text-sm font-black text-white/52">
            <PlatformIcon platform={game.platform} surface="dark" size="sm" />
            {game.platform}
        </span>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <span className="rounded-full bg-white/8 px-4 py-3">
            <span className="mr-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/28">{label}</span>
            <span className="text-sm font-black text-[#b7ff63]">{value}</span>
        </span>
    );
}

function ActionButton({ action }: { action: NonNullable<HomeGameWidgetProps['action']> }) {
    return (
        <button
            type="button"
            onClick={action.onClick}
            disabled={action.loading}
            className="inline-flex h-13 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-black transition hover:-translate-y-0.5 disabled:opacity-50"
        >
            <Dice5 size={18} strokeWidth={3} />
            {action.loading ? 'Picking' : action.label}
        </button>
    );
}

function CoverContent({ game, titleSize }: { game: GameCardData; titleSize: string }) {
    return game.cover_url ? (
        <img src={game.cover_url} alt={game.title} className="h-full w-full object-cover object-top" draggable={false} decoding="async" />
    ) : (
        <CoverArt game={game} titleSize={titleSize} />
    );
}

function EmptyThumb({ icon: Icon }: { icon: LucideIcon }) {
    return (
        <div className="grid aspect-[3/4] place-items-center rounded-[26px] bg-white/8 text-[#b7ff63]">
            <Icon size={42} strokeWidth={3} />
        </div>
    );
}

export default HomeGameWidget;
