import { ReactNode } from "react";

export default function Notice({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warning" | "danger" }) {
    return (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-relaxed ${tone === "danger" ? "border-red-500/30 bg-red-500/10 text-red-700" : tone === "warning" ? "border-black/10 bg-[#fff4c8] text-black/70" : "border-black/10 bg-white text-black/55"}`}>
            {children}
        </div>
    );
}
