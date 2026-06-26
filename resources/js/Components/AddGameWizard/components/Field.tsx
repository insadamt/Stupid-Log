import { ReactNode } from "react";

export default function Field({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) {
    return (
        <label className="grid gap-2">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
                {label}
                {required && <span className="text-[#b7ff63]">Required</span>}
            </span>
            {children}
        </label>
    );
}
