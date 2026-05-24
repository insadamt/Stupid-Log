import type { CSSProperties } from 'react';

type StatusColorSource = {
    status?: string | null;
    label?: string | null;
    color_hex?: string | null;
    status_color_hex?: string | null;
};

const fallbackColors: Record<string, string> = {
    'not played': '#9CA3AF',
    'in progress': '#FACC15',
    dropped: '#EF4444',
    completed: '#22C55E',
    '100%': '#F59E0B',
};

function statusName(source: StatusColorSource) {
    return (source.status ?? source.label ?? '').trim().toLowerCase();
}

export function statusColor(source: StatusColorSource) {
    return source.status_color_hex ?? source.color_hex ?? fallbackColors[statusName(source)] ?? '#9CA3AF';
}

function readableTextColor(hex: string) {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return '#000000';

    const r = Number.parseInt(clean.slice(0, 2), 16);
    const g = Number.parseInt(clean.slice(2, 4), 16);
    const b = Number.parseInt(clean.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.56 ? '#000000' : '#FFFFFF';
}

export function statusPillStyle(source: StatusColorSource): CSSProperties {
    const backgroundColor = statusColor(source);

    return {
        backgroundColor,
        color: readableTextColor(backgroundColor),
    };
}

export function statusDotStyle(source: StatusColorSource): CSSProperties {
    return { backgroundColor: statusColor(source) };
}
