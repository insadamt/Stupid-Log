import Field from "../components/Field";
import Notice from "../components/Notice";
import TextInput from "../components/TextInput";
import { Draft } from "../types";

export default function ProgressStep({
    availableStatuses,
    chooseStatus,
    draft,
    statusPillStyle,
    update,
    hasAchievements,
    status,
}: {
    availableStatuses: Array<{ id: number; name: string; color_hex?: string | null }>;
    chooseStatus: (statusId: number) => void;
    draft: Draft;
    statusPillStyle: (input: { status: string; status_color_hex?: string | null }) => React.CSSProperties;
    update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
    hasAchievements: boolean;
    status: { name: string } | undefined;
}) {
    return (
                                        <div className="grid gap-6"><div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Progress</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Track the state.</h3></div><div className="flex flex-wrap gap-2">{availableStatuses.map((item) => <button key={item.id} type="button" onClick={() => chooseStatus(item.id)} className={`rounded-2xl px-5 py-3 text-sm font-black ring-1 ring-black/10 ${draft.status_id === item.id ? "" : "bg-white text-black/55"}`} style={draft.status_id === item.id ? statusPillStyle({ status: item.name, status_color_hex: item.color_hex }) : undefined}>{item.name}</button>)}</div><div className="grid gap-4 rounded-[28px] border border-black/10 bg-white/70 p-5 md:grid-cols-2"><Field label="Playtime Hours"><TextInput value={draft.playtime_hours} onChange={(event) => update("playtime_hours", event.target.value)} type="number" step="0.1" /></Field><Field label="Earned Achievements"><TextInput value={draft.earned_achievements} onChange={(event) => update("earned_achievements", event.target.value)} type="number" placeholder={hasAchievements ? `0 / ${draft.total_achievements}` : "No achievements"} /></Field>{status?.name !== "Not Played" && <Field label="First Played"><TextInput value={draft.first_played_at} onChange={(event) => update("first_played_at", event.target.value)} type="date" /></Field>}{status?.name !== "Not Played" && <Field label="Last Played"><TextInput value={draft.last_played_at} onChange={(event) => update("last_played_at", event.target.value)} type="date" /></Field>}{(status?.name === "Completed" || status?.name === "100%") && <Field label="Completed At"><TextInput value={draft.completed_at} onChange={(event) => update("completed_at", event.target.value)} type="date" /></Field>}</div>{!hasAchievements && <Notice>100% is hidden because this game has no achievement total.</Notice>}</div>
    );
}
