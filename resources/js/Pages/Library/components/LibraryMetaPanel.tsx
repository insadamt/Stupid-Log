import { Clock3, Gamepad2, ShieldCheck } from 'lucide-react';
import { LibraryMeta } from '../types';

function formatHours(value: number | string | null | undefined) {
    const parsed = Number(value ?? 0);
    return `${Number.isInteger(parsed) ? parsed : parsed.toFixed(1)}H`;
}

function StatPill({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Gamepad2 }) {
    return (
        <div className="flex h-[48px] items-center gap-3 rounded-[18px] bg-white/[0.08] px-4 ring-1 ring-white/10">
            <span className="grid size-9 shrink-0 place-items-center rounded-[14px] bg-[#b7ff63] text-black">
                <Icon size={18} strokeWidth={3} />
            </span>
            <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/35">{label}</span>
                <span className="block truncate text-base font-black leading-none text-white">{value}</span>
            </span>
        </div>
    );
}

export default function LibraryMetaPanel({ libraryMeta }: { libraryMeta: LibraryMeta }) {
    return (
        <header className="relative overflow-hidden rounded-[30px] bg-black px-6 py-3 text-white shadow-[0_24px_70px_rgb(0_0_0/0.22)]">
            <div className="absolute inset-y-0 right-0 w-1/3 bg-[linear-gradient(135deg,transparent,rgba(183,255,99,0.22))]" />
            <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#b7ff63]/75">Library Archive</p>
                    <h1 className="mt-1 truncate text-[44px] font-black leading-none tracking-[-0.06em]">Game Vault</h1>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <StatPill label="Games" value={libraryMeta.total} icon={Gamepad2} />
                    <StatPill label="Cleared" value={libraryMeta.completed} icon={ShieldCheck} />
                    <StatPill label="Playtime" value={formatHours(libraryMeta.playtime_hours)} icon={Clock3} />
                </div>
            </div>
        </header>
    );
}
