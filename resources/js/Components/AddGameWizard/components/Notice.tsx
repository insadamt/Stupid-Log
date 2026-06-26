import { ReactNode } from "react";

export default function Notice({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warning" | "danger" }) {
    return (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-black leading-relaxed ${tone === "danger" ? "border-red-400/35 bg-red-500/12 text-red-100" : tone === "warning" ? "border-yellow-300/30 bg-yellow-300/12 text-yellow-50" : "border-[#b7ff63]/20 bg-[#b7ff63]/10 text-[#eaffd8]"}`}>
            {children}
        </div>
    );
}
