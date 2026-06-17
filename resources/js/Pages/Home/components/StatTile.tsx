import { ComponentType } from 'react';

export default function StatTile({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    icon: ComponentType<{
        size?: number;
        strokeWidth?: number;
        className?: string;
    }>;
}) {
    return (
        <div data-home-stat className="rounded-[22px] border border-white/8 bg-black/38 px-4 py-3 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">{label}</p>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#b7ff63] text-black">
                    <Icon size={19} strokeWidth={3} />
                </span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
                <div className="min-w-0 truncate text-2xl font-black leading-none tracking-[-0.04em]">{value}</div>
                <span className="h-1.5 w-8 shrink-0 rounded-full bg-[#b7ff63]/70" />
            </div>
        </div>
    );
}
