export function formatMoney(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') return 'Unknown';

    const parsed = Number(value);
    return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : String(value);
}

export function formatHours(value: number) {
    if (!Number.isFinite(value)) return '0H';
    if (Number.isInteger(value)) return `${value}H`;
    return `${value.toFixed(1)}H`;
}

export function statusTone(state: string) {
    if (state === 'Not Owned') return 'bg-white/10 text-white/45 ring-white/10';
    if (state === 'Edition Included') return 'bg-[#d7ffc0] text-black ring-[#d7ffc0]';
    return 'bg-[#b7ff63] text-black ring-[#b7ff63]';
}
