import { GrowthMetric } from '../../types';
import { palette } from './constants';
import { MetricKey, Slice, StatView } from './types';

export function n(value: unknown) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function num(value: unknown, decimals = 0) {
    return n(value).toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export function money(value: unknown) {
    const parsed = n(value);
    return Math.abs(parsed) >= 1000 ? `$${(parsed / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K` : `$${num(parsed, parsed % 1 ? 2 : 0)}`;
}

export function hours(value: unknown) {
    return `${num(value, n(value) % 1 ? 1 : 0)}H`;
}

export function percentLabel(value: number) {
    if (value > 0 && value < 0.1) return '<0.1%';
    return `${num(value, value < 10 ? 2 : 1)}%`;
}

export function clampPercent(value: number) {
    return Math.max(0, Math.min(100, value));
}

export function growth(current: number, previous: number): GrowthMetric {
    const delta = Number((current - previous).toFixed(1));
    return { delta, percentage: previous > 0 ? Number(((delta / previous) * 100).toFixed(1)) : null };
}

export function metricGrowth(key: MetricKey, current: StatView, previous?: StatView | null) {
    return current.growth?.[key] ?? (previous ? growth(n(current[key]), n(previous[key])) : null);
}

export function slices<T extends { label: string; color_hex?: string | null }>(items: T[], getter: (item: T) => number, previousItems: T[] = []): Slice[] {
    return items
        .map((item, index) => {
            const previous = previousItems.find((candidate) => candidate.label === item.label);
            const value = getter(item);
            return {
                label: item.label,
                value,
                color: item.color_hex ?? palette[index % palette.length],
                growth: previous ? growth(value, getter(previous)) : null,
            };
        })
        .filter((slice) => slice.value > 0)
        .sort((a, b) => b.value - a.value);
}

export function animationKey(parts: Array<string | number | null | undefined>) {
    return parts.map((part) => String(part ?? '')).join('|');
}
