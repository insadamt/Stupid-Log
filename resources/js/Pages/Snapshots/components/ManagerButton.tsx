import { ReactNode } from 'react';

export default function ManagerButton({
    children,
    onClick,
    disabled = false,
    tone = 'dark',
}: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    tone?: 'dark' | 'green' | 'danger' | 'ghost';
}) {
    const toneClass = {
        dark: 'bg-black text-white hover:bg-black/85',
        green: 'bg-[#b7ff63] text-black hover:brightness-95',
        danger: 'bg-[#fff0f0] text-[#d92d20] ring-1 ring-red-500/15 hover:bg-[#ffe2e2]',
        ghost: 'bg-white/70 text-black ring-1 ring-black/10 hover:bg-white',
    }[tone];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${toneClass} inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-4 text-xs font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40`}
        >
            {children}
        </button>
    );
}
