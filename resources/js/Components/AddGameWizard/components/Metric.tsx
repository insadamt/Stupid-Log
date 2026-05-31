import { ReactNode } from "react";

export default function Metric({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
    return (
        <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-black/35">{label}</div>
                {icon && <div className="text-black/25">{icon}</div>}
            </div>
            <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-black">{value}</div>
        </div>
    );
}
