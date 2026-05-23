import {
    BarChart3,
    Clock3,
    Copy,
    DollarSign,
    Gamepad2,
    Sparkles,
    Trophy,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import AppLayout from '../Components/AppLayout';
import { ConfirmedYearStats, GrowthMetric, PlatformBreakdown, StatsData, StatusBreakdown } from '../types';

type Slice = {
    label: string;
    value: number;
    color: string;
    delta?: GrowthMetric | null;
};

type StatView = StatsData & {
    year?: number;
    status?: string;
    growth?: Record<string, GrowthMetric>;
    best_games?: ConfirmedYearStats['best_games'];
};

type Deck = 'command' | 'charts' | 'progress' | 'archive';

const palette = ['#b7ff63', '#68d7ff', '#f56d7a', '#ffe36b', '#a77be8', '#55d59c', '#ff9f43', '#e8eee8'];

const summaryCards = [
    { key: 'library_games', label: 'Library Games', icon: Gamepad2 },
    { key: 'unique_titles', label: 'Unique Titles', icon: Sparkles },
    { key: 'ownership_copies', label: 'Ownership Copies', icon: Copy },
    { key: 'completed', label: 'Completed', icon: Trophy },
    { key: 'hundred_percent', label: '100%', icon: Trophy },
    { key: 'playtime_hours', label: 'Playtime', icon: Clock3 },
    { key: 'earned_achievements', label: 'Earned', icon: BarChart3 },
    { key: 'base_value', label: 'Base Value', icon: DollarSign },
] as const;

const decks: Array<{ key: Deck; label: string; caption: string }> = [
    { key: 'command', label: 'Command', caption: 'Totals' },
    { key: 'charts', label: 'Charts', caption: 'Breakdowns' },
    { key: 'progress', label: 'Progress', caption: 'Achievements' },
    { key: 'archive', label: 'Archive', caption: 'Years' },
];

function numberValue(value: unknown) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown, decimals = 0) {
    return numberValue(value).toLocaleString(undefined, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
    });
}

function formatMoney(value: unknown) {
    const parsed = numberValue(value);
    if (Math.abs(parsed) >= 1000) return `$${(parsed / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
    return `$${formatNumber(parsed, 2)}`;
}

function formatMetric(key: string, value: unknown) {
    if (key.includes('value')) return formatMoney(value);
    if (key === 'playtime_hours') return `${formatNumber(value, 1)}H`;
    return formatNumber(value);
}

function slicesFrom<T extends { label: string }>(items: T[], key: keyof T, previousItems: T[] = []): Slice[] {
    return items
        .map((item, index) => {
            const previous = previousItems.find((candidate) => candidate.label === item.label);
            return {
                label: item.label,
                value: numberValue(item[key]),
                color: palette[index % palette.length],
                delta: previous ? growthBetween(numberValue(item[key]), numberValue(previous[key])) : null,
            };
        })
        .filter((slice) => slice.value > 0);
}

function growthBetween(current: number, previous: number): GrowthMetric {
    const delta = Number((current - previous).toFixed(1));
    return {
        delta,
        percentage: previous > 0 ? Number(((delta / previous) * 100).toFixed(1)) : null,
    };
}

function DeltaBadge({ growth, compact = false }: { growth?: GrowthMetric | null; compact?: boolean }) {
    if (!growth) return null;

    const positive = growth.delta >= 0;
    const percent = growth.percentage === null ? '' : ` ${positive ? '+' : ''}${formatNumber(growth.percentage, 1)}%`;

    return (
        <span
            className={[
                'inline-flex items-center rounded-full font-black leading-none',
                compact ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs',
                positive ? 'bg-[#b7ff63] text-black' : 'bg-[#ffd6d6] text-[#b42318]',
            ].join(' ')}
        >
            {positive ? '+' : ''}{formatNumber(growth.delta, Math.abs(growth.delta) % 1 ? 1 : 0)}{percent}
        </span>
    );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <article className={`rounded-[34px] border border-white/10 bg-black text-white shadow-[0_28px_90px_rgb(0_0_0/0.2)] ${className}`}>
            {children}
        </article>
    );
}

function DeckButton({ active, label, caption, onClick }: { active: boolean; label: string; caption: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'min-w-[150px] rounded-[22px] px-5 py-3 text-left transition hover:-translate-y-0.5',
                active ? 'bg-[#b7ff63] text-black shadow-[inset_0_-4px_0_rgb(0_0_0/0.12)]' : 'bg-white/10 text-white/48 hover:bg-white/15 hover:text-white',
            ].join(' ')}
        >
            <span className="block text-base font-black leading-none tracking-[-0.025em]">{label}</span>
            <span className={`mt-1 block text-[10px] font-black uppercase tracking-[0.18em] ${active ? 'text-black/45' : 'text-white/30'}`}>{caption}</span>
        </button>
    );
}

function DonutChart({
    title,
    total,
    centerLabel,
    slices,
    tone = 'green',
    growth,
}: {
    title: string;
    total: string;
    centerLabel: string;
    slices: Slice[];
    tone?: 'red' | 'green';
    growth?: GrowthMetric | null;
}) {
    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const totalValue = slices.reduce((sum, slice) => sum + slice.value, 0);
    let offset = 0;
    const accent = tone === 'red' ? 'text-[#ff737d]' : 'text-[#b7ff63]';

    return (
        <Panel className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#b7ff63]/70">Breakdown</div>
                    <h2 className={`mt-2 truncate text-4xl font-black leading-none tracking-[-0.06em] ${accent}`}>{title}</h2>
                </div>
                <div className="grid size-12 shrink-0 place-items-center rounded-[20px] bg-white/10 text-[#b7ff63]">
                    <BarChart3 size={24} strokeWidth={3} />
                </div>
            </div>

            <div className="grid min-h-0 gap-6 pt-5 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-center">
                <div className="grid place-items-center">
                    <div className="relative size-[282px]">
                        <svg viewBox="0 0 220 220" className="size-full drop-shadow-[0_18px_24px_rgb(0_0_0/0.28)]">
                            <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="20" />
                            {totalValue > 0 && slices.map((slice) => {
                                const length = (slice.value / totalValue) * circumference;
                                const segment = (
                                    <circle
                                        key={slice.label}
                                        cx="110"
                                        cy="110"
                                        r={radius}
                                        fill="none"
                                        stroke={slice.color}
                                        strokeWidth="20"
                                        strokeDasharray={`${length} ${circumference - length}`}
                                        strokeDashoffset={-offset}
                                        strokeLinecap="round"
                                        transform="rotate(-90 110 110)"
                                    />
                                );
                                offset += length;
                                return segment;
                            })}
                        </svg>
                        <div className="absolute inset-0 grid place-items-center text-center">
                            <div className="max-w-[170px]">
                                <div className="truncate text-5xl font-black leading-none text-white">{total}</div>
                                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/32">{centerLabel}</div>
                                <div className="mt-3 flex justify-center"><DeltaBadge growth={growth} compact /></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid min-h-0 content-start gap-3 overflow-y-auto pr-2">
                    {slices.length === 0 && <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.045] p-6 text-sm font-black text-white/35">No data yet</div>}
                    {slices.map((slice) => {
                        const percent = totalValue > 0 ? (slice.value / totalValue) * 100 : 0;
                        return (
                            <div key={slice.label} className="rounded-[22px] border border-white/10 bg-white/[0.055] p-3">
                                <div className="flex items-center justify-between gap-3 text-sm font-black text-white/74">
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="size-3 rounded-full" style={{ backgroundColor: slice.color }} />
                                        <span className="truncate">{slice.label}</span>
                                    </span>
                                    <span>{formatNumber(percent, 1)}%</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-white/34">
                                    <span>{formatNumber(slice.value, slice.value % 1 ? 1 : 0)}</span>
                                    <DeltaBadge growth={slice.delta} compact />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Panel>
    );
}

function ProgressModule({ stats, previousStats }: { stats: StatView; previousStats?: StatView | null }) {
    const platforms = [...stats.breakdowns.platforms]
        .filter((platform) => platform.total_achievements > 0)
        .sort((a, b) => b.total_achievements - a.total_achievements)
        .slice(0, 6);

    return (
        <Panel className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#b7ff63]/70">Achievement System</div>
                    <h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.06em] text-[#b7ff63]">Progress</h2>
                </div>
                <div className="grid size-12 place-items-center rounded-[20px] bg-white/10 text-[#b7ff63]">
                    <Trophy size={24} strokeWidth={3} />
                </div>
            </div>

            <div className="min-h-0 overflow-y-auto pt-5 pr-2">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/35">Total Progress</div>
                            <div className="mt-2 border-l-4 border-[#b7ff63] pl-4 text-xl font-black text-white/75">
                                {formatNumber(stats.earned_achievements)} / {formatNumber(stats.total_achievements)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-5xl font-black leading-none text-[#b7ff63]">{formatNumber(stats.achievement_progress, 1)}%</div>
                            <div className="mt-3 flex justify-end">
                                <DeltaBadge growth={stats.growth?.achievement_progress ?? (previousStats ? growthBetween(stats.achievement_progress, previousStats.achievement_progress) : null)} />
                            </div>
                        </div>
                    </div>
                    <div className="mt-5">
                        <ProgressBar value={stats.achievement_progress} size="large" />
                    </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {platforms.map((platform) => {
                        const previous = previousStats?.breakdowns.platforms.find((item) => item.label === platform.label);
                        return (
                            <div key={platform.label} className="rounded-[24px] border border-white/10 bg-white/[0.055] p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="truncate text-lg font-black text-white">{platform.label}</div>
                                    <DeltaBadge growth={previous ? growthBetween(platform.achievement_progress, previous.achievement_progress) : null} compact />
                                </div>
                                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                                    <ProgressBar value={platform.achievement_progress} />
                                    <div className="text-right text-xl font-black text-[#b7ff63]">{formatNumber(platform.achievement_progress, 1)}%</div>
                                </div>
                                <div className="mt-3 text-sm font-black text-white/42">
                                    {formatNumber(platform.earned_achievements)} / {formatNumber(platform.total_achievements)}
                                </div>
                            </div>
                        );
                    })}
                    {platforms.length === 0 && <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.045] p-6 text-sm font-black text-white/35">No achievement totals yet</div>}
                </div>
            </div>
        </Panel>
    );
}

function ProgressBar({ value, size = 'normal' }: { value: number; size?: 'normal' | 'large' }) {
    const width = Math.max(0, Math.min(100, value));
    return (
        <div className={`${size === 'large' ? 'h-8' : 'h-4'} overflow-hidden rounded-full bg-white/10`}>
            <div className="h-full rounded-full bg-[#b7ff63] shadow-[0_0_24px_rgb(183_255_99/0.35)]" style={{ width: `${width}%` }} />
        </div>
    );
}

function SummaryCard({ item, stats, previousStats }: { item: (typeof summaryCards)[number]; stats: StatView; previousStats?: StatView | null }) {
    const Icon = item.icon;
    const value = stats[item.key as keyof StatsData];
    const growth = stats.growth?.[item.key] ?? (previousStats ? growthBetween(numberValue(value), numberValue(previousStats[item.key as keyof StatsData])) : null);

    return (
        <article className="group min-w-0 rounded-[26px] border border-black/10 bg-white/72 p-4 shadow-[0_14px_34px_rgb(0_0_0/0.06)] backdrop-blur transition hover:-translate-y-1 hover:bg-white/90">
            <div className="flex items-center justify-between gap-3">
                <div className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-black/42">{item.label}</div>
                <div className="grid size-10 shrink-0 place-items-center rounded-[16px] bg-black text-[#b7ff63] shadow-[0_12px_24px_rgb(0_0_0/0.16)]">
                    <Icon size={20} strokeWidth={3} />
                </div>
            </div>
            <div className="mt-4 flex min-h-[36px] items-end justify-between gap-3">
                <div className="truncate text-[30px] font-black leading-none tracking-[-0.055em] text-black">{formatMetric(item.key, value)}</div>
                <DeltaBadge growth={growth} compact />
            </div>
        </article>
    );
}

function Insights({ stats, previousStats }: { stats: StatView; previousStats?: StatView | null }) {
    const biggestPlatform = [...stats.breakdowns.platforms].sort((a, b) => b.library_games - a.library_games)[0];
    const highestValue = [...stats.breakdowns.platforms].sort((a, b) => b.base_value - a.base_value)[0];
    const fastestGrowth = previousStats
        ? stats.breakdowns.platforms
            .map((platform) => {
                const previous = previousStats.breakdowns.platforms.find((item) => item.label === platform.label);
                return {
                    label: platform.label,
                    growth: previous ? growthBetween(platform.library_games, previous.library_games) : null,
                };
            })
            .filter((item) => item.growth)
            .sort((a, b) => (b.growth?.delta ?? 0) - (a.growth?.delta ?? 0))[0]
        : null;

    return (
        <div className="grid gap-4 xl:grid-cols-3">
            <InsightCard label="Biggest platform" value={biggestPlatform ? biggestPlatform.label : 'No data'} detail={biggestPlatform ? `${formatNumber(biggestPlatform.library_games)} games` : 'Add games to build this insight.'} />
            <InsightCard label="Highest value platform" value={highestValue ? highestValue.label : 'No data'} detail={highestValue ? formatMoney(highestValue.base_value) : 'Value appears after prices are saved.'} />
            <InsightCard label="Biggest yearly growth" value={fastestGrowth?.label ?? 'No prior year'} detail={fastestGrowth?.growth ? `${fastestGrowth.growth.delta >= 0 ? '+' : ''}${formatNumber(fastestGrowth.growth.delta)} games` : 'Select a year with a previous snapshot.'} />
        </div>
    );
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
    return (
        <article className="min-w-0 rounded-[26px] border border-black/10 bg-black p-5 text-white shadow-[0_18px_44px_rgb(0_0_0/0.14)]">
            <div className="truncate text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">{label}</div>
            <div className="mt-4 truncate text-[28px] font-black leading-none tracking-[-0.05em]">{value}</div>
            <div className="mt-2 text-sm font-bold text-white/45">{detail}</div>
        </article>
    );
}

function YearRow({ year }: { year: ConfirmedYearStats }) {
    const growth = year.growth?.library_games;
    const delta = growth ? `${growth.delta >= 0 ? '+' : ''}${formatNumber(growth.delta)}` : 'First year';
    const percent = growth?.percentage === null || growth?.percentage === undefined ? '' : ` ${growth.percentage >= 0 ? '+' : ''}${formatNumber(growth.percentage, 1)}%`;

    return (
        <div className="grid gap-3 rounded-[24px] border border-black/10 bg-white/74 px-5 py-4 text-sm font-black shadow-[0_12px_30px_rgb(0_0_0/0.045)] xl:grid-cols-[92px_1fr_1fr_1fr_1fr_130px] xl:items-center">
            <span className="text-3xl tracking-[-0.04em]">{year.year}</span>
            <span>{formatNumber(year.library_games)} games</span>
            <span>{formatNumber(year.playtime_hours, 1)} hours</span>
            <span>{formatNumber(year.earned_achievements)} earned</span>
            <span>{formatMoney(year.base_value)} value</span>
            <span className="text-left text-black/45 xl:text-right">{delta}{percent}</span>
        </div>
    );
}

function YearBestGames({ year }: { year: ConfirmedYearStats }) {
    return (
        <article className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-[34px] border border-black/10 bg-white/62 p-6 shadow-[0_18px_44px_rgb(0_0_0/0.06)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/38">Best games played</div>
                    <h2 className="mt-2 text-4xl font-black tracking-[-0.055em] text-black">Top games of {year.year}</h2>
                </div>
                <div className="rounded-full bg-black px-4 py-2 text-sm font-black text-[#b7ff63]">{year.best_games.length} / 5</div>
            </div>
            <div className="mt-5 grid min-h-0 gap-4 overflow-y-auto pr-2 md:grid-cols-2 xl:grid-cols-5">
                {year.best_games.length === 0 && (
                    <div className="rounded-[28px] border border-dashed border-black/15 bg-white/58 p-6 text-sm font-bold text-black/45 md:col-span-2 xl:col-span-5">
                        No best games were selected for this confirmed year.
                    </div>
                )}
                {year.best_games.map((game) => (
                    <div key={game.library_game_id} className="min-w-0 overflow-hidden rounded-[28px] bg-black text-white shadow-[0_18px_42px_rgb(0_0_0/0.16)]">
                        <div className="aspect-[4/3] bg-white/10">
                            {game.cover_url ? <img src={game.cover_url} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-4xl font-black text-[#b7ff63]">#{game.rank}</div>}
                        </div>
                        <div className="p-4">
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#b7ff63]">#{game.rank}</div>
                            <div className="mt-2 truncate text-lg font-black">{game.title}</div>
                            <div className="mt-1 truncate text-xs font-bold text-white/45">{game.platform} - {game.status}</div>
                        </div>
                    </div>
                ))}
            </div>
        </article>
    );
}

export default function Stats({ stats, confirmedYears = [] }: { stats: StatsData; confirmedYears?: ConfirmedYearStats[] }) {
    const [selectedView, setSelectedView] = useState<'all-time' | string>('all-time');
    const [activeDeck, setActiveDeck] = useState<Deck>('command');
    const [activeChart, setActiveChart] = useState('playtime');
    const selectedYear = selectedView === 'all-time' ? null : confirmedYears.find((year) => String(year.year) === selectedView) ?? null;
    const previousYear = selectedYear ? [...confirmedYears].filter((year) => year.year < selectedYear.year).sort((a, b) => b.year - a.year)[0] ?? null : null;
    const activeStats: StatView = selectedYear ?? stats;
    const previousStats: StatView | null = selectedYear ? previousYear : null;
    const platforms = activeStats.breakdowns.platforms;
    const statuses = activeStats.breakdowns.statuses;
    const latest = confirmedYears[0] ?? null;
    const viewLabel = selectedYear ? `${selectedYear.year} yearly stats` : 'All-time live stats';
    const bestGamesYear = selectedYear ?? latest;

    const orderedYears = useMemo(() => [...confirmedYears].sort((a, b) => b.year - a.year), [confirmedYears]);
    const chronologicalYears = useMemo(() => [...confirmedYears].sort((a, b) => a.year - b.year), [confirmedYears]);

    const chartSpecs = useMemo(() => [
        {
            id: 'playtime',
            title: 'Playing Time',
            total: formatNumber(activeStats.playtime_hours, 1),
            centerLabel: 'Total Duration of Playing H',
            slices: slicesFrom<PlatformBreakdown>(platforms, 'playtime_hours', previousStats?.breakdowns.platforms),
            tone: 'red' as const,
            growth: activeStats.growth?.playtime_hours ?? (previousStats ? growthBetween(activeStats.playtime_hours, previousStats.playtime_hours) : null),
        },
        {
            id: 'total-achievements',
            title: 'Total Achievements',
            total: formatNumber(activeStats.total_achievements),
            centerLabel: 'Total Achievements',
            slices: slicesFrom<PlatformBreakdown>(platforms, 'total_achievements', previousStats?.breakdowns.platforms),
            tone: 'green' as const,
            growth: activeStats.growth?.total_achievements ?? (previousStats ? growthBetween(activeStats.total_achievements, previousStats.total_achievements) : null),
        },
        {
            id: 'earned-achievements',
            title: 'Earned Achievements',
            total: formatNumber(activeStats.earned_achievements),
            centerLabel: 'Total Earned Achievements',
            slices: slicesFrom<PlatformBreakdown>(platforms, 'earned_achievements', previousStats?.breakdowns.platforms),
            tone: 'red' as const,
            growth: activeStats.growth?.earned_achievements ?? (previousStats ? growthBetween(activeStats.earned_achievements, previousStats.earned_achievements) : null),
        },
        {
            id: 'accounts-value',
            title: 'Accounts Value',
            total: formatMoney(activeStats.base_value),
            centerLabel: 'Total Base Value',
            slices: slicesFrom<PlatformBreakdown>(platforms, 'base_value', previousStats?.breakdowns.platforms),
            tone: 'red' as const,
            growth: activeStats.growth?.base_value ?? (previousStats ? growthBetween(activeStats.base_value, previousStats.base_value) : null),
        },
        {
            id: 'status',
            title: 'By Status',
            total: formatNumber(activeStats.library_games),
            centerLabel: 'Total Games',
            slices: slicesFrom<StatusBreakdown>(statuses, 'library_games', previousStats?.breakdowns.statuses),
            tone: 'green' as const,
            growth: activeStats.growth?.library_games ?? (previousStats ? growthBetween(activeStats.library_games, previousStats.library_games) : null),
        },
        {
            id: 'library-games',
            title: 'Total Games By Library',
            total: formatNumber(activeStats.library_games),
            centerLabel: 'Total Games',
            slices: slicesFrom<PlatformBreakdown>(platforms, 'library_games', previousStats?.breakdowns.platforms),
            tone: 'red' as const,
            growth: activeStats.growth?.library_games ?? (previousStats ? growthBetween(activeStats.library_games, previousStats.library_games) : null),
        },
        {
            id: 'paid-value',
            title: 'Paid Value',
            total: formatMoney(activeStats.purchased_value),
            centerLabel: 'Total Paid Value',
            slices: slicesFrom<PlatformBreakdown>(platforms, 'purchased_value', previousStats?.breakdowns.platforms),
            tone: 'green' as const,
            growth: activeStats.growth?.purchased_value ?? (previousStats ? growthBetween(activeStats.purchased_value, previousStats.purchased_value) : null),
        },
    ], [activeStats, platforms, previousStats, statuses]);

    const activeChartSpec = chartSpecs.find((chart) => chart.id === activeChart) ?? chartSpecs[0];

    function shiftYear(delta: number) {
        if (!selectedYear) {
            const fallback = delta > 0 ? chronologicalYears[0] : chronologicalYears[chronologicalYears.length - 1];
            if (fallback) setSelectedView(String(fallback.year));
            return;
        }

        const index = chronologicalYears.findIndex((year) => year.year === selectedYear.year);
        const next = chronologicalYears[index + delta];
        if (next) setSelectedView(String(next.year));
    }

    return (
        <AppLayout title="Stats" lockViewport>
            <section className="relative isolate h-full overflow-hidden px-4 pb-4 pt-5 md:pl-[88px] md:pr-6">
                <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_12%,rgba(183,255,99,0.18),transparent_24%),linear-gradient(rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[length:auto,38px_38px,38px_38px]" />

                <div className="grid h-full grid-rows-[132px_minmax(0,1fr)_78px] gap-4">
                    <header className="min-h-0">
                        <Panel className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)] items-center overflow-hidden p-6">
                            <div className="min-w-0">
                                <div className="text-[11px] font-black uppercase tracking-[0.34em] text-[#b7ff63]/70">{viewLabel}</div>
                                <div className="mt-2 flex items-end gap-5">
                                    <h1 className="text-[58px] font-black leading-[0.82] tracking-[-0.08em]">Stats</h1>
                                    <div className="hidden max-w-2xl pb-1 text-sm font-bold leading-relaxed text-white/42 lg:block">
                                        Deck mode keeps every stat available without turning the page into a long scroll.
                                    </div>
                                </div>
                            </div>

                            <div className="grid min-w-0 gap-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Timeline</div>
                                    {selectedYear && (
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => shiftYear(-1)} className="rounded-full bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/55 transition hover:bg-white/15 hover:text-white">
                                                Previous Year
                                            </button>
                                            <button type="button" onClick={() => shiftYear(1)} className="rounded-full bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/55 transition hover:bg-white/15 hover:text-white">
                                                Next Year
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex min-w-0 gap-2 overflow-x-auto rounded-[24px] bg-white/[0.06] p-2">
                                    <button
                                        onClick={() => setSelectedView('all-time')}
                                        className={[
                                            'shrink-0 rounded-[18px] px-6 py-4 text-sm font-black uppercase tracking-[0.14em] transition',
                                            selectedView === 'all-time' ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/55 hover:text-white',
                                        ].join(' ')}
                                    >
                                        All Time
                                    </button>
                                    {orderedYears.map((year) => (
                                        <button
                                            key={year.snapshot_id}
                                            onClick={() => setSelectedView(String(year.year))}
                                            className={[
                                                'shrink-0 rounded-[18px] px-6 py-4 text-sm font-black uppercase tracking-[0.14em] transition',
                                                selectedView === String(year.year) ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/55 hover:text-white',
                                            ].join(' ')}
                                        >
                                            {year.year}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Panel>
                    </header>

                    <main className="relative min-h-0 overflow-hidden rounded-[42px] border border-black/10 bg-white/36 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.55)] backdrop-blur">
                        {activeDeck === 'command' && (
                            <div className="grid h-full min-h-0 gap-4 overflow-y-auto px-2 py-2 xl:grid-rows-[minmax(0,1fr)_150px]">
                                <div className="grid min-h-0 grid-cols-2 gap-4 xl:grid-cols-4">
                                    {summaryCards.map((item) => <SummaryCard key={item.key} item={item} stats={activeStats} previousStats={previousStats} />)}
                                </div>
                                <Insights stats={activeStats} previousStats={previousStats} />
                            </div>
                        )}

                        {activeDeck === 'charts' && (
                            <div className="grid h-full min-h-0 gap-4 px-2 py-2 xl:grid-cols-[310px_minmax(0,1fr)]">
                                <Panel className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] p-5">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#b7ff63]/70">Chart Bay</div>
                                        <h2 className="mt-2 text-4xl font-black leading-none tracking-[-0.06em]">Select Graph</h2>
                                    </div>
                                    <div className="mt-5 grid min-h-0 content-start gap-2 overflow-y-auto pr-2">
                                        {chartSpecs.map((chart, index) => (
                                            <button
                                                key={chart.id}
                                                type="button"
                                                onClick={() => setActiveChart(chart.id)}
                                                className={[
                                                    'grid grid-cols-[36px_minmax(0,1fr)] items-center gap-3 rounded-[20px] px-3 py-3 text-left transition',
                                                    activeChartSpec.id === chart.id ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/50 hover:text-white',
                                                ].join(' ')}
                                            >
                                                <span className={[
                                                    'grid size-9 place-items-center rounded-full text-sm font-black',
                                                    activeChartSpec.id === chart.id ? 'bg-black text-[#b7ff63]' : 'bg-black text-white/60',
                                                ].join(' ')}>{index + 1}</span>
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-black">{chart.title}</span>
                                                    <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.16em] opacity-45">{chart.total}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </Panel>

                                <DonutChart
                                    title={activeChartSpec.title}
                                    total={activeChartSpec.total}
                                    centerLabel={activeChartSpec.centerLabel}
                                    slices={activeChartSpec.slices}
                                    tone={activeChartSpec.tone}
                                    growth={activeChartSpec.growth}
                                />
                            </div>
                        )}

                        {activeDeck === 'progress' && (
                            <div className="h-full min-h-0 px-2 py-2">
                                <ProgressModule stats={activeStats} previousStats={previousStats} />
                            </div>
                        )}

                        {activeDeck === 'archive' && (
                            <div className="grid h-full min-h-0 gap-4 px-2 py-2 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                                <article className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-[34px] border border-black/10 bg-white/62 p-6 shadow-[0_18px_44px_rgb(0_0_0/0.06)] backdrop-blur">
                                    <div className="mb-5 flex items-center justify-between gap-4">
                                        <div>
                                            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/38">Confirmed yearly stats</div>
                                            <h2 className="mt-2 text-4xl font-black tracking-[-0.055em] text-black">Yearly Archive</h2>
                                        </div>
                                        <div className="rounded-full bg-black px-4 py-2 text-sm font-black text-[#b7ff63]">{confirmedYears.length} confirmed</div>
                                    </div>
                                    <div className="grid min-h-0 content-start gap-3 overflow-y-auto pr-2">
                                        {confirmedYears.length === 0 && (
                                            <div className="rounded-[28px] border border-dashed border-black/15 bg-white/60 p-7 text-center text-sm font-bold text-black/45">
                                                No confirmed yearly snapshots yet.
                                            </div>
                                        )}
                                        {confirmedYears.map((year) => <YearRow key={year.snapshot_id} year={year} />)}
                                    </div>
                                </article>

                                {bestGamesYear ? (
                                    <YearBestGames year={bestGamesYear} />
                                ) : (
                                    <article className="grid h-full place-items-center rounded-[34px] border border-dashed border-black/15 bg-white/56 p-10 text-center shadow-[0_18px_44px_rgb(0_0_0/0.05)] backdrop-blur">
                                        <div>
                                            <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-black text-[#b7ff63]"><Trophy size={30} /></div>
                                            <h2 className="mt-5 text-4xl font-black tracking-[-0.06em]">No official year yet</h2>
                                            <p className="mt-3 max-w-md text-sm font-bold text-black/45">Confirm a yearly snapshot to unlock best games and archive inspection.</p>
                                        </div>
                                    </article>
                                )}
                            </div>
                        )}
                    </main>

                    <footer className="grid min-h-0 place-items-center">
                        <nav className="mx-auto flex max-w-full gap-2 overflow-x-auto rounded-[28px] bg-black p-2 shadow-[0_18px_34px_rgb(0_0_0/0.25)]">
                            {decks.map((deck) => (
                                <DeckButton
                                    key={deck.key}
                                    active={activeDeck === deck.key}
                                    label={deck.label}
                                    caption={deck.caption}
                                    onClick={() => setActiveDeck(deck.key)}
                                />
                            ))}
                        </nav>
                    </footer>
                </div>
            </section>
        </AppLayout>
    );
}
