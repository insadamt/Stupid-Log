import { BarChart3, ChevronLeft, ChevronRight, Clock3, DollarSign, Gamepad2, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import AppLayout from '../Components/AppLayout';
import { ConfirmedYearStats, GrowthMetric, PlatformBreakdown, StatsArchiveGame, StatsData, StatusBreakdown } from '../types';

type TabKey = 'overview' | 'breakdowns' | 'progression' | 'archive';
type MetricKey = 'library_games' | 'completed' | 'hundred_percent' | 'playtime_hours' | 'earned_achievements' | 'total_achievements' | 'achievement_progress' | 'base_value' | 'purchased_value';
type StatView = StatsData & { year?: number; growth?: Record<string, GrowthMetric>; best_games?: ConfirmedYearStats['best_games'] };
type Slice = { label: string; value: number; color: string; growth?: GrowthMetric | null };
type ChartConfig = { title: string; eyebrow: string; data: Slice[]; total: string; center: string; delta?: GrowthMetric | null; format: (value: number) => string };

const tabs: Array<{ key: TabKey; title: string; sub: string }> = [
    { key: 'overview', title: 'Overview', sub: 'core totals' },
    { key: 'breakdowns', title: 'Breakdowns', sub: 'charts' },
    { key: 'progression', title: 'Progression', sub: 'completion' },
    { key: 'archive', title: 'Game Archive', sub: 'records' },
];

const palette = ['#9BE44D', '#61C7DF', '#E86D78', '#DFC96B', '#A382DB', '#5CC193', '#D88F45', '#CED8D2'];

function n(value: unknown) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function num(value: unknown, decimals = 0) {
    return n(value).toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function money(value: unknown) {
    const parsed = n(value);
    return Math.abs(parsed) >= 1000 ? `$${(parsed / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K` : `$${num(parsed, parsed % 1 ? 2 : 0)}`;
}

function hours(value: unknown) {
    return `${num(value, n(value) % 1 ? 1 : 0)}H`;
}

function growth(current: number, previous: number): GrowthMetric {
    const delta = Number((current - previous).toFixed(1));
    return { delta, percentage: previous > 0 ? Number(((delta / previous) * 100).toFixed(1)) : null };
}

function metricGrowth(key: MetricKey, current: StatView, previous?: StatView | null) {
    return current.growth?.[key] ?? (previous ? growth(n(current[key]), n(previous[key])) : null);
}

function slices<T extends { label: string }>(items: T[], getter: (item: T) => number, previousItems: T[] = []): Slice[] {
    return items
        .map((item, index) => {
            const previous = previousItems.find((candidate) => candidate.label === item.label);
            const value = getter(item);
            return {
                label: item.label,
                value,
                color: palette[index % palette.length],
                growth: previous ? growth(value, getter(previous)) : null,
            };
        })
        .filter((slice) => slice.value > 0)
        .sort((a, b) => b.value - a.value);
}

function DeltaBadge({ value, compact = false }: { value?: GrowthMetric | null; compact?: boolean }) {
    if (!value) {
        return <span className={`${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} inline-flex rounded-full border border-black/10 bg-white/55 font-black text-black/35`}>— | no baseline</span>;
    }

    const positive = value.delta > 0;
    const negative = value.delta < 0;
    const arrow = positive ? '▲' : negative ? '▼' : '→';
    const percentage = value.percentage === null ? 'new' : `${value.percentage > 0 ? '+' : ''}${num(value.percentage, 1)}%`;

    return (
        <span className={`${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} inline-flex rounded-full font-black ring-1 ring-black/5 ${positive ? 'bg-[#b7ff63] text-black' : negative ? 'bg-[#ffe0dd] text-[#ad2c21]' : 'bg-[#edf1ec] text-black/50'}`}>
            {positive ? '+' : ''}{num(value.delta, Math.abs(value.delta) % 1 ? 1 : 0)} | {percentage} {arrow}
        </span>
    );
}

function PercentDeltaBadge({ value, compact = false }: { value?: GrowthMetric | null; compact?: boolean }) {
    if (!value) {
        return <span className={`${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} inline-flex rounded-full border border-black/10 bg-white/55 font-black text-black/35`}>—</span>;
    }

    const positive = value.delta > 0;
    const negative = value.delta < 0;
    const arrow = positive ? '▲' : negative ? '▼' : '→';

    return (
        <span className={`${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} inline-flex rounded-full font-black ring-1 ring-black/5 ${positive ? 'bg-[#b7ff63] text-black' : negative ? 'bg-[#ffe0dd] text-[#ad2c21]' : 'bg-[#edf1ec] text-black/50'}`}>
            {positive ? '+' : ''}{num(value.delta, Math.abs(value.delta) % 1 ? 1 : 0)}% {arrow}
        </span>
    );
}

function ProgressBar({ value, large = false }: { value: number; large?: boolean }) {
    return (
        <div className={`${large ? 'h-4' : 'h-2.5'} overflow-hidden rounded-full bg-black/8`}>
            <div className="h-full rounded-full bg-[#9BE44D]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    );
}

function Switch<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
    return (
        <div className="inline-flex rounded-full bg-black/7 p-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition ${value === option.value ? 'bg-black text-[#b7ff63] shadow-sm' : 'text-black/42 hover:text-black'}`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function StatCard({ label, value, detail, delta, icon: Icon }: { label: string; value: string; detail: string; delta?: GrowthMetric | null; icon: typeof Gamepad2 }) {
    return (
        <article className="min-h-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-[0_18px_45px_rgb(9_14_12/0.06)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
                <div className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-black/40">{label}</div>
                <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-black text-[#b7ff63]"><Icon size={18} strokeWidth={3} /></div>
            </div>
            <div className="mt-3 truncate text-3xl font-black text-black">{value}</div>
            <div className="mt-1 truncate text-xs font-bold text-black/42">{detail}</div>
            <div className="mt-3"><DeltaBadge value={delta} compact /></div>
        </article>
    );
}

function Donut({ data, total, center }: { data: Slice[]; total: string; center: string }) {
    const radius = 67;
    const circumference = 2 * Math.PI * radius;
    const sum = data.reduce((acc, slice) => acc + slice.value, 0);
    let offset = 0;

    return (
        <div className="relative size-[330px] shrink-0">
            <svg viewBox="0 0 220 220" className="size-full">
                <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="19" />
                {sum > 0 && data.map((slice) => {
                    const length = (slice.value / sum) * circumference;
                    const segment = (
                        <circle
                            key={slice.label}
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="none"
                            stroke={slice.color}
                            strokeWidth="19"
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
                <div>
                    <div className="text-6xl font-black text-white">{total}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/32">{center}</div>
                </div>
            </div>
        </div>
    );
}

function GameUiChart({ config }: { config: ChartConfig }) {
    const data = [...config.data].sort((a, b) => b.value - a.value);
    const sum = data.reduce((acc, slice) => acc + slice.value, 0);

    return (
        <article className="grid h-full min-h-0 grid-cols-[0.95fr_1.25fr] gap-4 rounded-[30px] bg-black p-4 text-white shadow-[0_24px_75px_rgb(0_0_0/0.2)]">
            <section className="grid min-h-0 grid-rows-[auto_1fr] rounded-[26px] bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 ring-1 ring-white/8">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.26em] text-[#b7ff63]/70">{config.eyebrow}</div>
                    <div className="mt-2 flex items-start justify-between gap-3">
                        <h2 className="text-4xl font-black leading-none text-[#9BE44D]">{config.title}</h2>
                        <DeltaBadge value={config.delta} compact />
                    </div>
                </div>
                <div className="grid min-h-0 place-items-center">
                    <Donut data={data} total={config.total} center={config.center} />
                </div>
            </section>
            <section className="min-h-0 rounded-[26px] bg-white/[0.06] p-4 ring-1 ring-white/8">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Metric entries</div>
                    <div className="grid size-11 place-items-center rounded-2xl bg-[#b7ff63] text-black"><BarChart3 size={22} strokeWidth={3} /></div>
                </div>
                <div className="mt-4 grid max-h-[calc(100%-60px)] gap-3 overflow-y-auto pr-1">
                    {data.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm font-bold text-white/35">No rows available.</div>}
                    {data.map((slice) => {
                        const percent = sum > 0 ? (slice.value / sum) * 100 : 0;
                        return (
                            <div key={slice.label} className="rounded-[22px] bg-white/[0.07] p-4 ring-1 ring-white/8">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex min-w-0 items-center gap-3 text-sm font-black text-white/75">
                                        <span className="size-3 rounded-full" style={{ backgroundColor: slice.color }} />
                                        <span className="truncate">{slice.label}</span>
                                    </span>
                                    <span className="text-sm font-black text-white/80">{num(percent, 1)}%</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3 text-xs font-black text-white/35">
                                    <span>{config.format(slice.value)}</span>
                                    <DeltaBadge value={slice.growth} compact />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </article>
    );
}

function Overview({ stats, previous, selectedYear }: { stats: StatView; previous?: StatView | null; selectedYear?: ConfirmedYearStats | null }) {
    return (
        <div className="grid h-full min-h-0 grid-rows-[1fr_1.05fr] gap-4">
            <div className="grid min-h-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total Games" value={num(stats.library_games)} detail="Library game entries" delta={metricGrowth('library_games', stats, previous)} icon={Gamepad2} />
                <StatCard label="Completed Games" value={num(stats.completed)} detail="Completed + 100%" delta={metricGrowth('completed', stats, previous)} icon={Trophy} />
                <StatCard label="100% Games" value={num(stats.hundred_percent)} detail="Perfect achievement runs" delta={metricGrowth('hundred_percent', stats, previous)} icon={Trophy} />
                <StatCard label="Playtime" value={hours(stats.playtime_hours)} detail="Total tracked hours" delta={metricGrowth('playtime_hours', stats, previous)} icon={Clock3} />
            </div>
            <div className="grid min-h-0 gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
                <article className="min-h-0 rounded-[26px] border border-black/10 bg-black p-5 text-white shadow-[0_20px_55px_rgb(9_14_12/0.14)]">
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b7ff63]/70">Achievements</div>
                        <div className="grid size-10 place-items-center rounded-2xl bg-[#b7ff63] text-black"><Trophy size={20} strokeWidth={3} /></div>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                            <div className="text-4xl font-black">{num(stats.earned_achievements)} / {num(stats.total_achievements)}</div>
                            <div className="mt-2 text-sm font-bold text-white/42">{num(stats.achievement_progress, 1)}% progression</div>
                        </div>
                        <PercentDeltaBadge value={metricGrowth('achievement_progress', stats, previous)} />
                    </div>
                    <div className="mt-5 h-5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#b7ff63]" style={{ width: `${Math.max(0, Math.min(100, stats.achievement_progress))}%` }} /></div>
                    {selectedYear && <div className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-white/30">Best of {selectedYear.year} is available in this snapshot</div>}
                </article>
                <StatCard label="Base Value" value={money(stats.base_value)} detail="Digital/Physical + owned DLCs" delta={metricGrowth('base_value', stats, previous)} icon={DollarSign} />
                <StatCard label="Paid Value" value={money(stats.purchased_value)} detail="What you paid" delta={metricGrowth('purchased_value', stats, previous)} icon={DollarSign} />
            </div>
        </div>
    );
}

function Breakdowns({ stats, previous }: { stats: StatView; previous?: StatView | null }) {
    const [chart, setChart] = useState<'games' | 'playtime' | 'achievements' | 'value'>('achievements');
    const [gamesMode, setGamesMode] = useState<'platform' | 'status'>('platform');
    const [achievementMode, setAchievementMode] = useState<'earned' | 'total'>('earned');
    const [valueMode, setValueMode] = useState<'base' | 'paid'>('base');
    const [includeDlcs, setIncludeDlcs] = useState(true);

    const platforms = stats.breakdowns.platforms;
    const prevPlatforms = previous?.breakdowns.platforms ?? [];
    const statuses = stats.breakdowns.statuses;
    const prevStatuses = previous?.breakdowns.statuses ?? [];

    const valueGetter = (item: PlatformBreakdown) => valueMode === 'base'
        ? (includeDlcs ? item.base_value : n(item.base_value_without_dlcs ?? item.base_value))
        : (includeDlcs ? item.purchased_value : n(item.purchased_value_without_dlcs ?? item.purchased_value));

    const chartConfig: ChartConfig = (() => {
        if (chart === 'games') {
            const data = gamesMode === 'platform' ? slices<PlatformBreakdown>(platforms, (item) => item.library_games, prevPlatforms) : slices<StatusBreakdown>(statuses, (item) => item.library_games, prevStatuses);
            return { title: 'Total Games', eyebrow: gamesMode === 'platform' ? 'By platform' : 'By status', data, total: num(stats.library_games), center: 'games', delta: metricGrowth('library_games', stats, previous), format: (value: number) => num(value) };
        }
        if (chart === 'playtime') {
            return { title: 'Playtime Pool', eyebrow: 'Only by platform', data: slices<PlatformBreakdown>(platforms, (item) => item.playtime_hours, prevPlatforms), total: hours(stats.playtime_hours), center: 'hours played', delta: metricGrowth('playtime_hours', stats, previous), format: hours };
        }
        if (chart === 'achievements') {
            const key = achievementMode === 'total' ? 'total_achievements' : 'earned_achievements';
            return { title: 'Achievement Pool', eyebrow: `Only by platform · ${achievementMode}`, data: slices<PlatformBreakdown>(platforms, (item) => n(item[key]), prevPlatforms), total: num(achievementMode === 'total' ? stats.total_achievements : stats.earned_achievements), center: achievementMode === 'total' ? 'available achievements' : 'earned achievements', delta: metricGrowth(achievementMode === 'total' ? 'total_achievements' : 'earned_achievements', stats, previous), format: (value: number) => num(value) };
        }
        const data = slices<PlatformBreakdown>(platforms, valueGetter, prevPlatforms);
        const total = data.reduce((sum, item) => sum + item.value, 0);
        const prevTotal = prevPlatforms.reduce((sum, item) => sum + valueGetter(item), 0);
        return { title: 'Library Value', eyebrow: `Only by platform · ${valueMode}`, data, total: money(total), center: includeDlcs ? 'with DLCs' : 'no DLCs', delta: previous ? growth(total, prevTotal) : null, format: money };
    })();

    return (
        <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
            <div className="flex min-h-0 flex-wrap items-center justify-between gap-2 rounded-[24px] border border-black/8 bg-[#eef4eb]/80 p-3 shadow-[0_14px_40px_rgb(9_14_12/0.05)]">
                <Switch value={chart} options={[{ value: 'games', label: 'Games' }, { value: 'playtime', label: 'Playtime' }, { value: 'achievements', label: 'Achievements' }, { value: 'value', label: 'Value' }]} onChange={setChart} />
                <div className="flex flex-wrap items-center gap-2">
                    {chart === 'games' && <Switch value={gamesMode} options={[{ value: 'platform', label: 'By Platform' }, { value: 'status', label: 'By Status' }]} onChange={setGamesMode} />}
                    {chart === 'achievements' && <Switch value={achievementMode} options={[{ value: 'earned', label: 'Earned' }, { value: 'total', label: 'Total' }]} onChange={setAchievementMode} />}
                    {chart === 'value' && <Switch value={valueMode} options={[{ value: 'base', label: 'Base' }, { value: 'paid', label: 'Paid' }]} onChange={setValueMode} />}
                    {chart === 'value' && <button type="button" onClick={() => setIncludeDlcs((value) => !value)} className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] ring-1 ring-black/10 ${includeDlcs ? 'bg-[#b7ff63] text-black' : 'bg-white/75 text-black/45 hover:text-black'}`}>{includeDlcs ? 'DLCs included' : 'DLCs excluded'}</button>}
                </div>
            </div>
            <GameUiChart config={chartConfig} />
        </div>
    );
}

function Progression({ stats, previous }: { stats: StatView; previous?: StatView | null }) {
    const platforms = [...stats.breakdowns.platforms];
    const achievementPlatforms = [...platforms]
        .filter((platform) => platform.total_achievements > 0)
        .sort((a, b) => b.achievement_progress - a.achievement_progress || b.earned_achievements - a.earned_achievements);
    const statusPlatforms = [...platforms].sort((a, b) => b.library_games - a.library_games);
    const prevPlatforms = previous?.breakdowns.platforms ?? [];

    return (
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="grid min-h-0 grid-rows-[auto_1fr] rounded-[30px] border border-black/10 bg-black p-5 text-white shadow-[0_24px_70px_rgb(0_0_0/0.18)]">
                <div>
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">Achievements</div>
                    <div className="mt-2 flex items-end justify-between gap-4">
                        <h2 className="text-4xl font-black leading-none">Platform Progress</h2>
                        <div className="text-right">
                            <div className="text-4xl font-black text-[#b7ff63]">{num(stats.achievement_progress, 1)}%</div>
                            <PercentDeltaBadge value={metricGrowth('achievement_progress', stats, previous)} compact />
                        </div>
                    </div>
                    <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#b7ff63]" style={{ width: `${Math.max(0, Math.min(100, stats.achievement_progress))}%` }} /></div>
                </div>
                <div className="mt-5 min-h-0 overflow-y-auto pr-1">
                    <div className="grid gap-3">
                        {achievementPlatforms.map((platform) => {
                            const previousPlatform = prevPlatforms.find((item) => item.label === platform.label);
                            return (
                                <div key={platform.label} className="rounded-[22px] bg-white/[0.07] p-4 ring-1 ring-white/8">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-lg font-black">{platform.label}</div>
                                            <div className="text-xs font-bold text-white/38">{num(platform.earned_achievements)} / {num(platform.total_achievements)} achievements</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black text-[#b7ff63]">{num(platform.achievement_progress, 1)}%</div>
                                            <PercentDeltaBadge value={previousPlatform ? growth(platform.achievement_progress, previousPlatform.achievement_progress) : null} compact />
                                        </div>
                                    </div>
                                    <div className="mt-3"><ProgressBar value={platform.achievement_progress} /></div>
                                </div>
                            );
                        })}
                        {achievementPlatforms.length === 0 && <Empty dark text="No achievement totals are available yet." />}
                    </div>
                </div>
            </section>
            <section className="grid min-h-0 grid-rows-[auto_1fr] rounded-[30px] border border-black/10 bg-[#eef4eb] p-5 shadow-[0_22px_65px_rgb(9_14_12/0.06)]">
                <div>
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-black/38">Status</div>
                    <h3 className="mt-1 text-3xl font-black">Status split by platform</h3>
                </div>
                <div className="mt-4 min-h-0 overflow-y-auto pr-1">
                    <div className="grid gap-3">
                        {statusPlatforms.map((platform) => <StatusStack key={platform.label} platform={platform} previous={prevPlatforms.find((item) => item.label === platform.label)} />)}
                        {statusPlatforms.length === 0 && <Empty text="Add games to build status progression." />}
                    </div>
                </div>
            </section>
        </div>
    );
}

function StatusStack({ platform, previous }: { platform: PlatformBreakdown; previous?: PlatformBreakdown }) {
    const statuses = [...(platform.statuses ?? [])].sort((a, b) => b.library_games - a.library_games);
    const total = Math.max(1, platform.library_games);

    return (
        <div className="rounded-[24px] bg-white/78 p-4 ring-1 ring-black/8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-lg font-black text-black">{platform.label}</div>
                    <div className="text-xs font-bold text-black/42">{num(platform.library_games)} games divided by status</div>
                </div>
            </div>
            <div className="mt-3 flex h-5 overflow-hidden rounded-full bg-black/8">
                {statuses.length === 0 && <div className="h-full w-full bg-black/10" />}
                {statuses.map((status, index) => <div key={status.label} className="h-full" style={{ width: `${(status.library_games / total) * 100}%`, backgroundColor: palette[index % palette.length] }} />)}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {statuses.map((status, index) => {
                    const previousStatus = previous?.statuses?.find((item) => item.label === status.label);
                    return (
                        <div key={status.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-[#f6faf4] px-3 py-2 text-xs font-black text-black/60">
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="size-2.5 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
                                <span className="truncate">{status.label}</span>
                            </span>
                            <span className="flex items-center gap-2">
                                <span>{num(status.library_games)} · {num((status.library_games / total) * 100, 1)}%</span>
                                <DeltaBadge value={previousStatus ? growth(status.library_games, previousStatus.library_games) : null} compact />
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Archive({ stats }: { stats: StatView }) {
    return (
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-3">
            <ArchiveList title="Most Played" sub="Playtime record" games={stats.archive?.most_played ?? []} metric="playtime" />
            <ArchiveList title="Biggest Base Price" sub="Base value record" games={stats.archive?.biggest_base_price ?? []} metric="base" />
            <ArchiveList title="Biggest Paid Price" sub="Paid value record" games={stats.archive?.biggest_paid_price ?? []} metric="paid" />
        </div>
    );
}

function ArchiveList({ title, sub, games, metric }: { title: string; sub: string; games: StatsArchiveGame[]; metric: 'playtime' | 'base' | 'paid' }) {
    const value = (game: StatsArchiveGame) => metric === 'playtime' ? hours(game.playtime_hours) : metric === 'base' ? money(game.base_value) : money(game.purchased_value);

    return (
        <section className="grid min-h-0 grid-rows-[auto_1fr] rounded-[28px] border border-black/10 bg-white/80 p-5 shadow-[0_22px_65px_rgb(9_14_12/0.07)]">
            <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-black/38">{sub}</div>
                <h3 className="mt-1 text-2xl font-black">{title}</h3>
            </div>
            <div className="mt-4 min-h-0 overflow-y-auto pr-1">
                <div className="grid gap-3">
                    {games.length === 0 && <Empty text="No games match this archive record yet." />}
                    {games.map((game, index) => (
                        <div key={`${game.library_game_id}-${title}`} className="grid grid-cols-[54px_1fr_auto] items-center gap-3 rounded-[22px] bg-[#f6faf4] p-3 ring-1 ring-black/6">
                            <div className="aspect-square overflow-hidden rounded-2xl bg-black/8">{game.cover_url ? <img src={game.cover_url} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-sm font-black text-black/35">#{index + 1}</div>}</div>
                            <div className="min-w-0">
                                <div className="truncate text-base font-black text-black">{game.title}</div>
                                <div className="mt-1 truncate text-xs font-bold text-black/42">{game.platform} · {game.status}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-black text-black">{value(game)}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-black/35">#{index + 1}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Empty({ text, dark = false }: { text: string; dark?: boolean }) {
    return <div className={`rounded-[22px] border border-dashed p-5 text-sm font-bold ${dark ? 'border-white/10 bg-white/[0.04] text-white/35' : 'border-black/14 bg-white/70 text-black/42'}`}>{text}</div>;
}

function SlideNav({ active, setActive }: { active: TabKey; setActive: (tab: TabKey) => void }) {
    return (
        <div className="flex h-[112px] shrink-0 justify-center px-2 py-5">
            <div className="flex max-w-full items-center justify-center gap-2 overflow-hidden rounded-[28px] border border-black/10 bg-black px-5 py-4 shadow-[0_22px_70px_rgb(0_0_0/0.24)]">
                {tabs.map((tab) => (
                    <button key={tab.key} type="button" onClick={() => setActive(tab.key)} className={`min-w-[165px] rounded-[20px] px-5 py-3 text-left transition ${active === tab.key ? 'bg-[#b7ff63] text-black' : 'bg-white/7 text-white/45 hover:text-white'}`}>
                        <div className="text-sm font-black">{tab.title}</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-50">{tab.sub}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function Stats({ stats, confirmedYears = [] }: { stats: StatsData; confirmedYears?: ConfirmedYearStats[] }) {
    const [view, setView] = useState<'all-time' | string>('all-time');
    const [active, setActive] = useState<TabKey>('overview');
    const yearsAsc = useMemo(() => [...confirmedYears].sort((a, b) => a.year - b.year), [confirmedYears]);
    const yearsDesc = useMemo(() => [...confirmedYears].sort((a, b) => b.year - a.year), [confirmedYears]);
    const selectedYear = view === 'all-time' ? null : confirmedYears.find((year) => String(year.year) === view) ?? null;
    const previousYear = selectedYear ? [...yearsAsc].filter((year) => year.year < selectedYear.year).pop() ?? null : null;
    const latestYear = yearsDesc[0] ?? null;
    const current: StatView = selectedYear ?? stats;
    const previous: StatView | null = selectedYear ? previousYear : latestYear;
    const displayedYear = selectedYear?.year ?? latestYear?.year ?? null;
    const yearIndex = displayedYear ? yearsAsc.findIndex((year) => year.year === displayedYear) : -1;

    const stepYear = (direction: number) => {
        if (yearsAsc.length === 0) return;
        const base = yearIndex >= 0 ? yearIndex : yearsAsc.length - 1;
        const next = Math.max(0, Math.min(yearsAsc.length - 1, base + direction));
        setView(String(yearsAsc[next].year));
    };

    const panel = active === 'overview'
        ? <Overview stats={current} previous={previous} selectedYear={selectedYear} />
        : active === 'breakdowns'
            ? <Breakdowns stats={current} previous={previous} />
            : active === 'progression'
                ? <Progression stats={current} previous={previous} />
                : <Archive stats={current} />;

    return (
        <AppLayout title="Stats" lockViewport>
            <section className="h-full overflow-hidden px-4 py-3 md:pl-[88px] md:pr-6">
                <div className="mx-auto grid h-full max-w-[1540px] grid-rows-[120px_minmax(0,1fr)_112px] gap-4 overflow-hidden">
                    <header className="rounded-[34px] bg-black px-6 py-5 text-white shadow-[0_24px_80px_rgb(0_0_0/0.20)]">
                        <div className="grid h-full gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
                            <div className="min-w-0">
                                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]/70">{selectedYear ? `${selectedYear.year} confirmed snapshot` : 'All-time live profile'}</div>
                                <div className="mt-1 flex items-end gap-4">
                                    <h1 className="text-6xl font-black leading-none tracking-[-0.06em]">Stats</h1>
                                    <p className="mb-2 hidden max-w-2xl truncate text-sm font-bold text-white/38 xl:block">Fixed screen modules. Data overflow stays inside game-style containers.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setView('all-time')} className={`rounded-[22px] px-6 py-4 text-sm font-black uppercase tracking-[0.16em] transition ${view === 'all-time' ? 'bg-[#b7ff63] text-black' : 'bg-white/8 text-white/50 hover:text-white'}`}>All Time</button>
                                <div className="flex items-center gap-2 rounded-[24px] bg-white/8 p-2">
                                    <button type="button" onClick={() => stepYear(-1)} disabled={yearsAsc.length === 0 || yearIndex <= 0} className="grid size-11 place-items-center rounded-[18px] bg-black text-white ring-1 ring-white/10 transition hover:text-[#b7ff63] disabled:cursor-not-allowed disabled:opacity-25"><ChevronLeft size={18} /></button>
                                    <button type="button" onClick={() => displayedYear && setView(String(displayedYear))} disabled={!displayedYear} className={`min-w-[116px] rounded-[18px] px-5 py-3 text-center text-lg font-black tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-35 ${selectedYear ? 'bg-[#b7ff63] text-black' : 'bg-white/7 text-white/55 hover:text-white'}`}>{displayedYear ?? '—'}</button>
                                    <button type="button" onClick={() => stepYear(1)} disabled={yearsAsc.length === 0 || yearIndex >= yearsAsc.length - 1} className="grid size-11 place-items-center rounded-[18px] bg-black text-white ring-1 ring-white/10 transition hover:text-[#b7ff63] disabled:cursor-not-allowed disabled:opacity-25"><ChevronRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main className="min-h-0 overflow-hidden rounded-[34px] border border-black/8 bg-white/35 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.58)]">
                        {panel}
                    </main>
                    <SlideNav active={active} setActive={setActive} />
                </div>
            </section>
        </AppLayout>
    );
}
