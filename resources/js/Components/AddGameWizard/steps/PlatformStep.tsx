import PlatformIcon from "../../PlatformIcon";
import TextInput from "../components/TextInput";
import { Draft } from "../types";

export default function PlatformStep({
    platformQuery,
    setPlatformQuery,
    filteredPlatforms,
    draft,
    choosePlatform,
}: {
    platformQuery: string;
    setPlatformQuery: (value: string) => void;
    filteredPlatforms: Array<{ id: number; name: string; devices: Array<unknown> }>;
    draft: Draft;
    choosePlatform: (platformId: number) => void;
}) {
    return (
                                        <div className="grid gap-6"><div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Platform</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Choose the ecosystem.</h3></div><TextInput value={platformQuery} onChange={(event) => setPlatformQuery(event.target.value)} placeholder="Search platform..." /><div className="grid gap-2 rounded-[28px] border border-black/10 bg-white/70 p-3">{filteredPlatforms.map((item) => { const selected = draft.platform_id === item.id; return <button key={item.id} type="button" onClick={() => choosePlatform(item.id)} className={`flex items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition ${selected ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"}`}><span className="flex min-w-0 items-center gap-3"><PlatformIcon platform={item.name} surface={selected ? "dark" : "light"} size="md" /><span className="truncate text-lg font-black">{item.name}</span></span><span className="shrink-0 text-xs font-black uppercase tracking-[0.16em] opacity-45">{item.devices.length} devices</span></button>; })}</div></div>
    );
}
