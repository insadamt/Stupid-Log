import { ReactNode } from 'react';
import { TestResult } from '../types';

export function ControlButton({
    children,
    type = 'button',
    tone = 'dark',
    disabled,
    onClick,
}: {
    children: ReactNode;
    type?: 'button' | 'submit';
    tone?: 'dark' | 'lime' | 'ghost';
    disabled?: boolean;
    onClick?: () => void;
}) {
    const toneClass = {
        dark: 'bg-black text-white hover:bg-black/85',
        lime: 'bg-[#b7ff63] text-black hover:brightness-95',
        ghost: 'bg-white/8 text-white ring-1 ring-white/14 hover:bg-white/14',
    }[tone];

    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={`${toneClass} inline-flex h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-black uppercase transition disabled:cursor-not-allowed disabled:opacity-40`}
        >
            {children}
        </button>
    );
}

export function TextField({
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
    required,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
}) {
    return (
        <label className="grid gap-2" data-wizard-item>
            <span className="text-[11px] font-black uppercase text-white/42">{label}</span>
            <input
                type={type}
                value={value}
                required={required}
                onChange={(event) => onChange(event.currentTarget.value)}
                placeholder={placeholder}
                className="h-14 rounded-[16px] border border-white/10 bg-white/[0.08] px-4 text-base font-black text-white outline-none placeholder:text-white/24 focus:border-[#b7ff63] focus:bg-white/[0.12]"
            />
        </label>
    );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-[16px] bg-white/[0.08] px-4 py-3 ring-1 ring-white/10" data-wizard-item>
            <span className="text-xs font-black uppercase text-white/42">{label}</span>
            <span className="truncate text-sm font-black text-white">{value}</span>
        </div>
    );
}

export function OverviewCard({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <div className="rounded-[22px] bg-white/[0.08] px-5 py-4 ring-1 ring-white/10" data-wizard-item>
            <div className="text-[11px] font-black uppercase text-white/42">{label}</div>
            <div className="mt-2 truncate text-xl font-black text-white">{value}</div>
            <p className="mt-1 text-sm font-bold leading-snug text-white/44">{detail}</p>
        </div>
    );
}

export function TestMessage({ result }: { result: TestResult | null }) {
    if (!result) return null;

    return (
        <div className={`rounded-[18px] px-4 py-3 text-sm font-black ${result.ok ? 'bg-[#b7ff63] text-black' : 'bg-[#ffe0dd] text-[#ad2c21]'}`}>
            {result.message}
        </div>
    );
}

export function ProviderResultRow({
    label,
    configured,
    result,
}: {
    label: string;
    configured: boolean;
    result?: TestResult;
}) {
    const status = !configured ? 'Later' : result ? (result.ok ? 'Connected' : 'Needs review') : 'Untested';
    const message = providerMessage(label, configured, result);
    const tone = !configured
        ? 'bg-white/[0.08] text-white ring-white/10'
        : result?.ok
            ? 'bg-[#b7ff63] text-black ring-[#b7ff63]/40'
            : 'bg-[#ffe0dd] text-[#ad2c21] ring-[#ffe0dd]/50';

    return (
        <div className={`min-h-[128px] rounded-[22px] px-5 py-4 ring-1 ${tone}`} data-wizard-item>
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase">{label}</span>
                <span className="shrink-0 text-[10px] font-black uppercase">{status}</span>
            </div>
            <p className="mt-3 text-sm font-black leading-snug opacity-70">{message}</p>
        </div>
    );
}

function providerMessage(label: string, configured: boolean, result?: TestResult) {
    if (!configured) return `${label} will stay disconnected for now.`;
    if (!result) return `${label} was not tested yet.`;
    if (result.ok) return result.message;
    if (result.message.toLowerCase().includes('timed out')) {
        return `${label} test timed out. You can finish setup and update it later in Settings.`;
    }

    return result.message.replace(/\s*\(see https:\/\/curl\.haxx\.se\/libcurl\/c\/libcurl-errors\.html\)/, '');
}
