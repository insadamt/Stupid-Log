export function numberFormat(
    value: number | string | null | undefined,
    maximumFractionDigits = 0,
) {
    return Number(value ?? 0).toLocaleString(undefined, {
        maximumFractionDigits,
    });
}

export function moneyFormat(value: number | string | null | undefined) {
    return `$${Number(value ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}
