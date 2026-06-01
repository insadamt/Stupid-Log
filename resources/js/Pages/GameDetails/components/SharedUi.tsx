import { HardDrive } from 'lucide-react';
import { ReactNode } from 'react';

export function Chip({ children, active = false }: { children: ReactNode; active?: boolean }) {
    return (
        <span
            className={[
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em]',
                active ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/68',
            ].join(' ')}
        >
            {children}
        </span>
    );
}

export function MetricTile({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    return (
        <div className="rounded-[28px] border border-black/10 bg-white/70 p-4 shadow-[0_18px_44px_rgb(0_0_0/0.075)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-black/38">{label}</div>
                <div className="grid size-10 place-items-center rounded-2xl bg-black text-[#b7ff63]">{icon}</div>
            </div>
            <div className="mt-3 truncate text-[26px] font-black leading-none tracking-[-0.045em] text-black">{value}</div>
        </div>
    );
}

export function DeviceLoadoutTile({ devices }: { devices: string[] }) {
    const visible = devices.slice(0, 4);
    const extra = Math.max(0, devices.length - visible.length);

    return (
        <div className="min-w-0 rounded-[28px] border border-black/10 bg-white/70 p-4 shadow-[0_18px_44px_rgb(0_0_0/0.075)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-black/38">Devices</div>
                <div className="grid size-10 place-items-center rounded-2xl bg-black text-[#b7ff63]">
                    <HardDrive size={22} />
                </div>
            </div>

            <div className="mt-3 text-[24px] font-black leading-none tracking-[-0.045em] text-black">
                {devices.length} {devices.length === 1 ? 'device' : 'devices'}
            </div>

            <div className="mt-3 flex max-h-[62px] min-w-0 flex-wrap gap-2 overflow-hidden">
                {visible.map((device) => (
                    <span key={device} className="max-w-[108px] truncate rounded-full bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#b7ff63]">
                        {device}
                    </span>
                ))}
                {extra > 0 && (
                    <span className="rounded-full bg-black/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-black/55">
                        +{extra}
                    </span>
                )}
            </div>
        </div>
    );
}

export function BlackTile({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    return (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-4 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
            <div className="flex items-center justify-between gap-3 text-white/35">
                <div className="text-[10px] font-black uppercase tracking-[0.22em]">{label}</div>
                {icon}
            </div>
            <div className="mt-3 truncate text-[24px] font-black leading-none tracking-[-0.04em]">{value}</div>
        </div>
    );
}

export function ModeButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'rounded-[19px] px-7 py-4 text-base font-black transition hover:-translate-y-0.5',
                active ? 'bg-[#b7ff63] text-black shadow-[inset_0_-4px_0_rgb(0_0_0/0.12)]' : 'text-white/42 hover:bg-white/10 hover:text-white',
            ].join(' ')}
        >
            {children}
        </button>
    );
}
