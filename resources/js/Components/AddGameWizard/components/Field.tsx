import { ReactNode } from "react";

export default function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-black/40">{label}</span>
            {children}
        </label>
    );
}
