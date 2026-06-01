import { Clock3, DollarSign, Gamepad2, Trophy } from 'lucide-react';
import { ConfirmedYearStats } from '../../../types';
import { PercentDeltaBadge } from '../components/Badges';
import { ProgressBar } from '../components/Progress';
import StatCard from '../components/StatCard';
import { StatView } from '../types';
import { hours, metricGrowth, num, money } from '../utils';

export default function Overview({ stats, previous, selectedYear }: { stats: StatView; previous?: StatView | null; selectedYear?: ConfirmedYearStats | null }) {
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
                    <div className="mt-5"><ProgressBar value={stats.achievement_progress} large tone="dark" /></div>
                    {selectedYear && <div className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-white/30">Best of {selectedYear.year} is available in this snapshot</div>}
                </article>
                <StatCard label="Base Value" value={money(stats.base_value)} detail="Digital/Physical + owned DLCs" delta={metricGrowth('base_value', stats, previous)} icon={DollarSign} />
                <StatCard label="Paid Value" value={money(stats.purchased_value)} detail="What you paid" delta={metricGrowth('purchased_value', stats, previous)} icon={DollarSign} />
            </div>
        </div>
    );
}
