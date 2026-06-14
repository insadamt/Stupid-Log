import { ArrowDown, ArrowUp, CircleDollarSign, Clock3, ReceiptText } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Flip } from 'gsap/Flip';
import { gsap, prefersReducedMotion, useGSAP } from '../../../animation';
import PlatformIcon from '../../../Components/PlatformIcon';
import { statusPillStyle } from '../../../statusColors';
import { StatsArchiveGame } from '../../../types';
import {
    ArchiveRow,
    buildArchiveRows,
    buildMostPlayedCumulativeRows,
    buildMostPlayedDeltaRows,
    getGameKey,
    RankMovement,
} from '../archiveRanking';
import { Empty } from '../components/Controls';
import { StatsComparison, StatView } from '../types';
import { animationKey, hours, money } from '../utils';

gsap.registerPlugin(Flip);

type PlaytimeMode = 'cumulative' | 'delta';

function RankMovementBadge({ movement }: { movement: RankMovement }) {
    if (movement.state === 'up') {
        return <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-[#397500]"><ArrowUp size={11} strokeWidth={3.5} />+{movement.places}</span>;
    }

    if (movement.state === 'down') {
        return <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-[#ad2c21]"><ArrowDown size={11} strokeWidth={3.5} />-{movement.places}</span>;
    }

    if (movement.state === 'new') {
        return <span className="inline-flex rounded-full bg-black px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-[#b7ff63]">New</span>;
    }

    return (
        <span className="inline-flex min-w-4 justify-center text-[12px] font-black leading-none text-black/28">
            {movement.state === 'same' ? '•' : '—'}
        </span>
    );
}

function PlaytimeModeSwitch({
    value,
    deltaLabel,
    deltaAvailable,
    onChange,
}: {
    value: PlaytimeMode;
    deltaLabel: string;
    deltaAvailable: boolean;
    onChange: (mode: PlaytimeMode) => void;
}) {
    return (
        <div className="grid grid-cols-2 rounded-[14px] bg-black/6 p-1" aria-label="Most played ranking mode">
            {([
                { value: 'cumulative' as const, label: 'Cumulative', disabled: false },
                { value: 'delta' as const, label: deltaLabel, disabled: !deltaAvailable },
            ]).map((option) => (
                <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => onChange(option.value)}
                    className={`rounded-[10px] px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-25 ${value === option.value ? 'bg-black text-[#b7ff63] shadow-sm' : 'text-black/38 hover:text-black'}`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function ArchiveList({
    title,
    sub,
    rows,
    formatValue,
    icon,
    controls,
}: {
    title: string;
    sub: string;
    rows: ArchiveRow[];
    formatValue: (value: number) => string;
    icon: ReactNode;
    controls?: ReactNode;
}) {
    const listRef = useRef<HTMLElement>(null);
    const incomingKey = animationKey(rows.map((row) => `${getGameKey(row.game)}:${row.rank}:${row.value}:${row.movement.state}:${row.movement.places}`));
    const [renderedRows, setRenderedRows] = useState(rows);
    const renderedKey = animationKey(renderedRows.map((row) => `${getGameKey(row.game)}:${row.rank}:${row.value}:${row.movement.state}:${row.movement.places}`));

    useGSAP(() => {
        const list = listRef.current;
        if (!list || incomingKey === renderedKey) return;

        if (prefersReducedMotion()) {
            setRenderedRows(rows);
            return;
        }

        const currentRows = Array.from(list.querySelectorAll<HTMLElement>('[data-archive-row]'));
        const state = currentRows.length ? Flip.getState(currentRows) : null;

        flushSync(() => setRenderedRows(rows));

        if (!state) return;

        Flip.from(state, {
            duration: 0.55,
            ease: 'power3.inOut',
            stagger: 0.035,
            absolute: true,
            prune: true,
            nested: true,
            onEnter: (elements) => gsap.fromTo(elements, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3, ease: 'power3.out' }),
            onLeave: (elements) => gsap.to(elements, { y: -8, autoAlpha: 0, duration: 0.2, ease: 'power2.in' }),
        });
    }, { scope: listRef, dependencies: [incomingKey, renderedKey] });

    return (
        <section ref={listRef} className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[28px] border border-black/8 bg-white/85 shadow-[0_22px_65px_rgb(9_14_12/0.07)]">
            <header className="min-h-[116px] border-b border-black/7 px-4 pb-3 pt-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-black/34">{sub}</div>
                        <h3 className="mt-0.5 truncate text-xl font-black tracking-[-0.025em]">{title}</h3>
                    </div>
                    <div className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-black text-[#b7ff63]">
                        {icon}
                    </div>
                </div>
                {controls && <div className="mt-3">{controls}</div>}
            </header>
            <div className="min-h-0 overflow-y-auto px-3 py-3">
                <div className="grid gap-2">
                    {renderedRows.length === 0 && <Empty text="No games match this archive record yet." />}
                    {renderedRows.map(({ game, rank, value, movement }) => (
                        <div
                            key={getGameKey(game)}
                            data-archive-row
                            data-flip-id={`${title}:${getGameKey(game)}`}
                            className="grid grid-cols-[34px_46px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[18px] bg-[#f5f8f3] p-2.5 ring-1 ring-black/5 transition-colors hover:bg-white"
                        >
                            <div className="flex min-h-10 flex-col items-center justify-center border-r border-black/7 pr-2">
                                <span className="text-[13px] font-black tracking-[-0.04em] text-black">#{rank}</span>
                                <span className="mt-1 h-3"><RankMovementBadge movement={movement} /></span>
                            </div>
                            <div className="aspect-[4/5] overflow-hidden rounded-[12px] bg-black/8 shadow-sm">{game.cover_url ? <img src={game.cover_url} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-[10px] font-black text-black/30">#{rank}</div>}</div>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-black leading-tight text-black">{game.title}</div>
                                <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-black/38">
                                    <PlatformIcon platform={game.platform} surface="light" size="xs" />
                                    <span className="truncate">{game.platform}</span>
                                    <span className="max-w-[76px] shrink-0 truncate rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.06em]" style={statusPillStyle(game)}>{game.status}</span>
                                </div>
                            </div>
                            <div className="pl-1 text-right">
                                <div className="whitespace-nowrap text-[15px] font-black tracking-[-0.025em] text-black">{formatValue(value)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function playtimeGames(stats?: StatView | null): StatsArchiveGame[] {
    return stats?.archive?.playtime_rankings ?? stats?.archive?.most_played ?? [];
}

export default function ArchivePanel({
    stats,
    previous,
    previousPrevious,
    comparison,
}: {
    stats: StatView;
    previous?: StatView | null;
    previousPrevious?: StatView | null;
    comparison: StatsComparison;
}) {
    const [playtimeMode, setPlaytimeMode] = useState<PlaytimeMode>('cumulative');
    const currentPlaytime = playtimeGames(stats);
    const previousPlaytime = playtimeGames(previous);
    const previousPreviousPlaytime = playtimeGames(previousPrevious);
    const deltaAvailable = comparison.hasPrevious && previousPlaytime.length > 0;
    const effectiveMode = playtimeMode === 'delta' && deltaAvailable ? 'delta' : 'cumulative';

    useEffect(() => {
        if (!deltaAvailable && playtimeMode === 'delta') {
            setPlaytimeMode('cumulative');
        }
    }, [deltaAvailable, playtimeMode]);

    const mostPlayedRows = useMemo(
        () => effectiveMode === 'delta'
            ? buildMostPlayedDeltaRows(currentPlaytime, previousPlaytime, previousPreviousPlaytime.length > 0 ? previousPreviousPlaytime : null)
            : buildMostPlayedCumulativeRows(currentPlaytime, deltaAvailable ? previousPlaytime : null),
        [currentPlaytime, deltaAvailable, effectiveMode, previousPlaytime, previousPreviousPlaytime],
    );
    const basePriceRows = useMemo(
        () => buildArchiveRows(stats.archive?.biggest_base_price ?? [], comparison.hasPrevious ? previous?.archive?.biggest_base_price ?? [] : null, (game) => game.base_value),
        [comparison.hasPrevious, previous, stats],
    );
    const paidPriceRows = useMemo(
        () => buildArchiveRows(stats.archive?.biggest_paid_price ?? [], comparison.hasPrevious ? previous?.archive?.biggest_paid_price ?? [] : null, (game) => game.purchased_value),
        [comparison.hasPrevious, previous, stats],
    );
    const deltaLabel = comparison.mode === 'all-time' ? 'Since Snapshot' : 'This Year';

    return (
        <div className="grid h-full min-h-0 grid-flow-col auto-cols-[minmax(360px,1fr)] gap-4 overflow-x-auto pb-1 xl:grid-flow-row xl:auto-cols-auto xl:grid-cols-3 xl:overflow-visible xl:pb-0" role="region" aria-label={`Game archive. ${comparison.contextLabel}`}>
            <ArchiveList
                title="Most Played"
                sub={effectiveMode === 'delta' ? `${deltaLabel} playtime` : 'Playtime record'}
                rows={mostPlayedRows}
                formatValue={(value) => `${effectiveMode === 'delta' && value > 0 ? '+' : ''}${hours(value)}`}
                icon={<Clock3 size={16} strokeWidth={3} />}
                controls={<PlaytimeModeSwitch value={effectiveMode} deltaLabel={deltaLabel} deltaAvailable={deltaAvailable} onChange={setPlaytimeMode} />}
            />
            <ArchiveList title="Biggest Base Price" sub="Base value record" rows={basePriceRows} formatValue={money} icon={<CircleDollarSign size={16} strokeWidth={3} />} />
            <ArchiveList title="Biggest Paid Price" sub="Paid value record" rows={paidPriceRows} formatValue={money} icon={<ReceiptText size={16} strokeWidth={3} />} />
        </div>
    );
}
