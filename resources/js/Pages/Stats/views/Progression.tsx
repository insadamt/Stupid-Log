import PlatformIcon from '../../../Components/PlatformIcon';
import { statusColor, statusDotStyle } from '../../../statusColors';
import { PlatformBreakdown } from '../../../types';
import { DeltaBadge, PercentDeltaBadge } from '../components/Badges';
import { Empty } from '../components/Controls';
import { ProgressBar, StackedProgressBar } from '../components/Progress';
import { StatView } from '../types';
import { growth, metricGrowth, num } from '../utils';

function StatusStack({ platform, previous }: { platform: PlatformBreakdown; previous?: PlatformBreakdown }) {
    const statuses = [...(platform.statuses ?? [])].sort((a, b) => b.library_games - a.library_games);
    const total = Math.max(1, platform.library_games);

    return (
        <div className="rounded-[24px] bg-white/78 p-4 ring-1 ring-black/8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <PlatformIcon platform={platform.label} surface="light" size="sm" />
                    <div className="min-w-0">
                        <div className="truncate text-lg font-black text-black">{platform.label}</div>
                        <div className="text-xs font-bold text-black/42">{num(platform.library_games)} games divided by status</div>
                    </div>
                </div>
            </div>
            <div className="mt-3">
                <StackedProgressBar total={total} segments={statuses.map((status) => ({ label: status.label, value: status.library_games, color: statusColor(status) }))} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {statuses.map((status) => {
                    const previousStatus = previous?.statuses?.find((item) => item.label === status.label);
                    return (
                        <div key={status.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-[#f6faf4] px-3 py-2 text-xs font-black text-black/60">
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="size-2.5 rounded-full" style={statusDotStyle(status)} />
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

export default function Progression({ stats, previous }: { stats: StatView; previous?: StatView | null }) {
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
                    <div className="mt-4"><ProgressBar value={stats.achievement_progress} large tone="dark" /></div>
                </div>
                <div className="mt-5 min-h-0 overflow-y-auto pr-1">
                    <div className="grid gap-3">
                        {achievementPlatforms.map((platform) => {
                            const previousPlatform = prevPlatforms.find((item) => item.label === platform.label);
                            return (
                                <div key={platform.label} className="rounded-[22px] bg-white/[0.07] p-4 ring-1 ring-white/8">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <PlatformIcon platform={platform.label} surface="dark" size="sm" />
                                            <div className="min-w-0">
                                                <div className="truncate text-lg font-black">{platform.label}</div>
                                                <div className="text-xs font-bold text-white/38">{num(platform.earned_achievements)} / {num(platform.total_achievements)} achievements</div>
                                            </div>
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
