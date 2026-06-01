import { Gamepad2 } from 'lucide-react';
import { GrowthMetric } from '../../../types';
import { DeltaBadge } from './Badges';

export default function StatCard({ label, value, detail, delta, icon: Icon }: { label: string; value: string; detail: string; delta?: GrowthMetric | null; icon: typeof Gamepad2 }) {
    return (
        <article className="min-h-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-[0_18px_45px_rgb(9_14_12/0.06)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
                <div className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-black/40">{label}</div>
                <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-black text-[#b7ff63]"><Icon size={18} strokeWidth={3} /></div>
            </div>
            <div className="mt-3 truncate text-3xl font-black text-black">{value}</div>
            <div className="mt-1 truncate text-xs font-bold text-black/42">{detail}</div>
            <div className="mt-3"><DeltaBadge value={delta} compact /></div>
        </article>
    );
}
