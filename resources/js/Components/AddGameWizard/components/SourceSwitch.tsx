import { Database, Gamepad2, Keyboard } from "lucide-react";
import { ProviderMode } from "../types";

const sources: Array<{ mode: ProviderMode; label: string; description: string; icon: typeof Database }> = [
    { mode: "igdb", label: "IGDB", description: "Broad catalog", icon: Database },
    { mode: "steam", label: "Steam", description: "Price, IDs, DLCs", icon: Gamepad2 },
];

export default function SourceSwitch({
    providerMode,
    setProviderMode,
    manualEntry,
}: {
    providerMode: ProviderMode;
    setProviderMode: (mode: ProviderMode) => void;
    manualEntry?: () => void;
}) {
    return (
        <div className="grid gap-2 sm:grid-cols-3">
            {sources.map((source) => {
                const Icon = source.icon;
                const active = providerMode === source.mode;

                return (
                    <button
                        key={source.mode}
                        type="button"
                        onClick={() => setProviderMode(source.mode)}
                        className={`rounded-[18px] border px-4 py-3 text-left transition ${active ? "border-[#b7ff63] bg-[#b7ff63] text-black" : "border-white/10 bg-white/[0.05] text-white hover:border-[#b7ff63]/40 hover:bg-white/[0.08]"}`}
                    >
                        <span className={`grid size-9 place-items-center rounded-xl ${active ? "bg-black text-[#b7ff63]" : "bg-[#b7ff63] text-black"}`}><Icon size={18} /></span>
                        <span className="mt-3 block text-xs font-black uppercase tracking-[0.24em]">{source.label}</span>
                        <span className={`mt-1 block text-xs font-black ${active ? "text-black/55" : "text-white/40"}`}>{source.description}</span>
                    </button>
                );
            })}
            <button
                type="button"
                onClick={manualEntry}
                className="rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3 text-left text-white transition hover:border-[#b7ff63]/40 hover:bg-white/[0.08]"
            >
                <span className="grid size-9 place-items-center rounded-xl bg-[#b7ff63] text-black"><Keyboard size={18} /></span>
                <span className="mt-3 block text-xs font-black uppercase tracking-[0.24em]">Manual</span>
                <span className="mt-1 block text-xs font-black text-white/40">No lookup</span>
            </button>
        </div>
    );
}
