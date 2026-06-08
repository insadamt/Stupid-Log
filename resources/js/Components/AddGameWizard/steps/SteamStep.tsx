import { Loader2 } from "lucide-react";
import { ReactNode } from "react";
import Field from "../components/Field";
import Notice from "../components/Notice";
import TextInput from "../components/TextInput";
import { Draft, SteamEnrichmentStatus } from "../types";

export default function SteamStep({
    enrichmentStatus,
    retryAchievements,
    draft,
    update,
    resetButtons,
}: {
    enrichmentStatus: SteamEnrichmentStatus;
    retryAchievements: () => Promise<void>;
    draft: Draft;
    update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
    resetButtons: ReactNode;
}) {
    return (
                                        <div className="grid gap-6">
                                            <div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Steam Data</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Verify store fields.</h3></div>
                                            {enrichmentStatus === "loading" && <Notice><span className="inline-flex items-center gap-3"><Loader2 className="size-5 animate-spin" /> Loading public Steam achievements.</span></Notice>}
                                            {enrichmentStatus === "warning" && <Notice tone="danger"><div className="flex flex-wrap items-center justify-between gap-3"><span>Steam achievement totals are still unavailable.</span><button type="button" onClick={() => void retryAchievements()} className="rounded-xl bg-black px-4 py-2 text-xs font-black text-white">Retry achievements</button></div></Notice>}
                                            <div className="grid gap-4 rounded-[28px] border border-black/10 bg-white/70 p-5 md:grid-cols-2">
                                                <Field label="Base Price"><TextInput value={draft.base_price_default} onChange={(event) => update("base_price_default", event.target.value)} type="number" step="0.01" placeholder="Unknown" /></Field>
                                                <Field label="Total Achievements"><TextInput value={draft.total_achievements} onChange={(event) => update("total_achievements", event.target.value)} type="number" placeholder="Unknown" /></Field>
                                            </div>
                                            {resetButtons}
                                        </div>
    );
}
