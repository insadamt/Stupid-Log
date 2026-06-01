import { ComponentType } from 'react';

export default function StatTile({
    label,
    value,
    icon: Icon,
    dark = false,
}: {
    label: string;
    value: string | number;
    icon: ComponentType<{
        size?: number;
        strokeWidth?: number;
        className?: string;
    }>;
    dark?: boolean;
}) {
    return (
        <div
            className={[
                "rounded-[24px] border p-4 shadow-[0_14px_28px_rgb(0_0_0/0.06)]",
                dark
                    ? "border-white/10 bg-black text-white"
                    : "border-black/5 bg-[#eef2ed] text-black",
            ].join(" ")}
        >
            <div className="mb-5 flex items-center justify-between gap-4">
                <p
                    className={[
                        "text-[11px] font-black uppercase tracking-[0.26em]",
                        dark ? "text-white/45" : "text-black/42",
                    ].join(" ")}
                >
                    {label}
                </p>
                <span
                    className={[
                        "grid size-10 place-items-center rounded-[14px]",
                        dark
                            ? "bg-[#b7ff63] text-black"
                            : "bg-black text-[#b7ff63]",
                    ].join(" ")}
                >
                    <Icon size={22} strokeWidth={3} />
                </span>
            </div>
            <div className="text-[30px] font-black leading-none tracking-[-0.03em]">
                {value}
            </div>
        </div>
    );
}
