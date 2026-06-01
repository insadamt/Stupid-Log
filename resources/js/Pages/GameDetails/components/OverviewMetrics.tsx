import { Clock3, DollarSign, Trophy } from 'lucide-react';
import { RefObject } from 'react';
import { formatHours, formatMoney } from '../formatters';
import { DeviceLoadoutTile, MetricTile } from './SharedUi';

export default function OverviewMetrics({
    metricsRef,
    achievements,
    playtimeHours,
    basePrice,
    devices,
}: {
    metricsRef: RefObject<HTMLElement | null>;
    achievements: string;
    playtimeHours: number;
    basePrice: string | number | null | undefined;
    devices: string[];
}) {
    return (
        <aside ref={metricsRef} data-details-panel className="relative z-10 grid min-w-0 gap-3 self-center">
            <MetricTile icon={<Trophy size={22} fill="currentColor" />} value={achievements} label="Achievements" />
            <MetricTile icon={<Clock3 size={22} />} value={formatHours(playtimeHours)} label="Playtime" />
            <MetricTile icon={<DollarSign size={22} />} value={formatMoney(basePrice)} label="Base Value" />
            <DeviceLoadoutTile devices={devices} />
        </aside>
    );
}
