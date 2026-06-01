import { GrowthMetric } from '../../../types';
import { num } from '../utils';

export function DeltaBadge({ value, compact = false }: { value?: GrowthMetric | null; compact?: boolean }) {
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

export function PercentDeltaBadge({ value, compact = false }: { value?: GrowthMetric | null; compact?: boolean }) {
    if (!value) {
        return <span className={`${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} inline-flex rounded-full border border-black/10 bg-white/55 font-black text-black/35`}>—</span>;
    }

    const positive = value.delta > 0;
    const negative = value.delta < 0;
    const arrow = positive ? '▲' : negative ? '▼' : '→';

    return (
        <span className={`${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} inline-flex rounded-full font-black ring-1 ring-black/5 ${positive ? 'bg-[#b7ff63] text-black' : negative ? 'bg-[#ffe0dd] text-[#ad2c21]' : 'bg-[#edf1ec] text-black/50'}`}>
            {positive ? '+' : ''}{num(value.delta, 1)}% {arrow}
        </span>
    );
}
