export function formatMoney(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') return 'Free';

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return String(value);

    return parsed === 0 ? 'Free' : `$${parsed.toFixed(2)}`;
}

export function formatHours(value: number | null | undefined) {
    if (!Number.isFinite(value)) return '0H';
    if (Number.isInteger(value)) return `${value}H`;
    return `${value.toFixed(1)}H`;
}

export function statusTone(state: string) {
    if (state === 'Not Owned') return 'bg-white/10 text-white/45 ring-white/10';
    if (state === 'Edition Included') return 'bg-[#d7ffc0] text-black ring-[#d7ffc0]';
    return 'bg-[#b7ff63] text-black ring-[#b7ff63]';
}
