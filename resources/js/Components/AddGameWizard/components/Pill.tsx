import { ReactNode } from "react";

export default function Pill({ children, active = false, muted = false }: { children: ReactNode; active?: boolean; muted?: boolean }) {
    return (
        <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] ${active ? "bg-[#b7ff63] text-black" : muted ? "bg-black/5 text-black/45" : "bg-black text-white"}`}>
            {children}
        </span>
    );
}
