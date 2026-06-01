export function formatNumber(value: number | string | null | undefined, decimals = 0) {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return '0';
    return parsed.toLocaleString(undefined, {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
    });
}

export function formatDate(value: string | null | undefined) {
    if (!value) return 'Not confirmed';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
