import { CheckCircle2, Clock3, Gamepad2, Trophy } from 'lucide-react';
import { StatsData } from '../../../types';
import { numberFormat } from '../formatters';
import StatTile from './StatTile';

export default function BriefPanel({ stats }: { stats: StatsData }) {
    const playtime = numberFormat(stats.playtime_hours, 1);
    const topPlatform = stats.breakdowns.platforms[0];

    return (
        <aside className="grid gap-3 rounded-[30px] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Games" value={stats.library_games ?? 0} icon={Gamepad2} />
            <StatTile label="Complete" value={stats.completed ?? 0} icon={CheckCircle2} />
            <StatTile label="Hours" value={`${playtime}H`} icon={Clock3} />
            <StatTile label="Top" value={topPlatform?.label ?? 'No data'} icon={Trophy} />
        </aside>
    );
}
