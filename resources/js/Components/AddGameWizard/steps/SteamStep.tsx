import { ReactNode } from "react";
import Field from "../components/Field";
import TextInput from "../components/TextInput";
import { Draft } from "../types";

export default function SteamStep({
    draft,
    update,
    resetButtons,
}: {
    draft: Draft;
    update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
    resetButtons: ReactNode;
}) {
    return (
                                        <div className="grid gap-6">
                                            <div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Steam Data</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Verify store fields.</h3></div>
                                            <div className="grid gap-4 rounded-[28px] border border-black/10 bg-white/70 p-5 md:grid-cols-2">
                                                <Field label="Base Price"><TextInput value={draft.base_price_default} onChange={(event) => update("base_price_default", event.target.value)} type="number" step="0.01" placeholder="Unknown" /></Field>
                                                <Field label="Total Achievements"><TextInput value={draft.total_achievements} onChange={(event) => update("total_achievements", event.target.value)} type="number" placeholder="Unknown" /></Field>
                                            </div>
                                            {resetButtons}
                                        </div>
    );
}
