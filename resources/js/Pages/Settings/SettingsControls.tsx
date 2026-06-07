import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes, ReactNode } from 'react';

export function SettingsField({
    label,
    name,
    defaultValue,
    placeholder,
    type = 'text',
    error,
}: {
    label: string;
    name: string;
    defaultValue?: string;
    placeholder?: string;
    type?: string;
    error?: string;
}) {
    return (
        <label className="grid gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-black/42">{label}</span>
            <input
                name={name}
                type={type}
                defaultValue={defaultValue}
                placeholder={placeholder}
                aria-invalid={Boolean(error)}
                className="h-12 rounded-[18px] border border-black/10 bg-[#f4f7f1] px-4 text-base font-black text-black outline-none transition placeholder:text-black/28 focus:border-black focus:bg-white focus:ring-4 focus:ring-[#b7ff63]/30"
            />
            {error && <span className="text-sm font-bold text-[#b42318]">{error}</span>}
        </label>
    );
}

export function SettingsButton({
    children,
    busy = false,
    tone = 'dark',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    busy?: boolean;
    tone?: 'dark' | 'green' | 'ghost' | 'danger';
}) {
    const toneClass = {
        dark: 'bg-black text-white hover:text-[#b7ff63]',
        green: 'bg-[#b7ff63] text-black hover:brightness-95',
        ghost: 'bg-white text-black ring-1 ring-black/10 hover:bg-[#f4f7f1]',
        danger: 'bg-[#d92d20] text-white hover:bg-[#b42318]',
    }[tone];

    return (
        <button
            {...props}
            disabled={busy || props.disabled}
            className={`${toneClass} inline-flex h-11 items-center justify-center gap-2 rounded-[18px] px-5 text-xs font-black uppercase tracking-[0.14em] transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b7ff63]/45 disabled:cursor-not-allowed disabled:opacity-40 ${props.className ?? ''}`}
        >
            {busy && <Loader2 className="animate-spin" size={16} strokeWidth={3} />}
            {children}
        </button>
    );
}

export function StatusBadge({ active, label, dark = false }: { active: boolean; label: string; dark?: boolean }) {
    const className = active
        ? 'bg-[#b7ff63] text-black'
        : dark
            ? 'bg-white/8 text-white/50 ring-1 ring-white/10'
            : 'bg-black/5 text-black/48 ring-1 ring-black/8';

    return (
        <span className={`${className} inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]`}>
            {active ? <CheckCircle2 size={13} strokeWidth={3} /> : <CircleAlert size={13} strokeWidth={3} />}
            {label}
        </span>
    );
}

export function FeedbackMessage({ result }: { result: { ok: boolean; message: string } | null }) {
    if (!result) return null;

    return (
        <div
            role="status"
            className={`rounded-[14px] px-4 py-3 text-sm font-black ${result.ok ? 'bg-[#eaffd1] text-black' : 'bg-[#ffe0dd] text-[#ad2c21]'}`}
        >
            {result.message}
        </div>
    );
}
