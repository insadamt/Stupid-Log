import { ReactNode } from 'react';

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
    return (
        <label className="grid gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">{label}</span>
            {children}
            {error && <span className="text-xs font-black text-[#ff6068]">{error}</span>}
        </label>
    );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={`h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none placeholder:text-white/28 focus:border-[#b7ff63] ${props.className ?? ''}`}
        />
    );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={`min-h-32 w-full min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white outline-none placeholder:text-white/28 focus:border-[#b7ff63] ${props.className ?? ''}`}
        />
    );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={`h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white outline-none focus:border-[#b7ff63] ${props.className ?? ''}`}
        />
    );
}
