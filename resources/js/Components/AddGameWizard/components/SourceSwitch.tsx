import { ProviderMode } from "../types";

export default function SourceSwitch({
    providerMode,
    setProviderMode,
}: {
    providerMode: ProviderMode;
    setProviderMode: (mode: ProviderMode) => void;
}) {
    return (
        <div className="grid grid-cols-2 rounded-[24px] bg-white/8 p-1.5 ring-1 ring-white/10">
            <button
                type="button"
                onClick={() => setProviderMode("igdb")}
                className={[
                    "h-12 rounded-[18px] px-6 text-sm font-black uppercase tracking-[0.22em] transition",
                    providerMode === "igdb"
                        ? "bg-[#b7ff63] text-black shadow-[0_12px_24px_rgb(183_255_99/0.18)]"
                        : "text-white/42 hover:bg-white/8 hover:text-white",
                ].join(" ")}
            >
                IGDB
            </button>

            <button
                type="button"
                onClick={() => setProviderMode("steam")}
                className={[
                    "h-12 rounded-[18px] px-6 text-sm font-black uppercase tracking-[0.22em] transition",
                    providerMode === "steam"
                        ? "bg-[#b7ff63] text-black shadow-[0_12px_24px_rgb(183_255_99/0.18)]"
                        : "text-white/42 hover:bg-white/8 hover:text-white",
                ].join(" ")}
            >
                Steam
            </button>
        </div>
    );
}
