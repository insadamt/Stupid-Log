import { Database, Layers3, Package } from "lucide-react";
import Metric from "../components/Metric";
import { Draft } from "../types";
import { money, sourceName } from "../utils";

export default function ReviewStep({
    draft,
    platform,
    selectedDevices,
    selectedOwnerships,
    ownedDlcCount,
    status,
    statusPillStyle,
    coverPreview,
}: {
    draft: Draft;
    platform: { name: string } | undefined;
    selectedDevices: string[];
    selectedOwnerships: string[];
    ownedDlcCount: number;
    status: { name: string; color_hex?: string | null } | undefined;
    statusPillStyle: (input: { status: string; status_color_hex?: string | null }) => React.CSSProperties;
    coverPreview: string;
}) {
    return (
<div className="grid gap-6"><div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Review</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Save receipt.</h3></div><div className="rounded-[30px] border border-black/10 bg-white p-6"><h4 className="text-4xl font-black tracking-[-0.06em]">{draft.title}</h4><div className="mt-5 grid gap-3 text-base font-bold text-black/60 md:grid-cols-2"><p><span className="font-black text-black">Source:</span> {sourceName(draft.source)}</p><p><span className="font-black text-black">Platform:</span> {platform?.name || "Missing"}</p><p><span className="font-black text-black">Devices:</span> {selectedDevices.length ? selectedDevices.join(", ") : "Missing"}</p><p><span className="font-black text-black">Ownership:</span> {selectedOwnerships.length ? selectedOwnerships.join(", ") : "Missing"}</p><p><span className="font-black text-black">DLCs marked:</span> {ownedDlcCount}</p><p className="flex items-center gap-2"><span className="font-black text-black">Status:</span> {status ? <span className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]" style={statusPillStyle({ status: status.name, status_color_hex: status.color_hex })}>{status.name}</span> : "Missing"}</p><p><span className="font-black text-black">Playtime:</span> {draft.playtime_hours || 0}h</p><p><span className="font-black text-black">Achievements:</span> {draft.earned_achievements || 0} / {draft.total_achievements || "Unknown"}</p><p><span className="font-black text-black">Base price:</span> {money(draft.base_price_default)}</p></div></div><div className="grid gap-4 md:grid-cols-4"><Metric label="Cover" value={draft.cover_path ? "Uploaded" : coverPreview ? "Provider" : "Missing"} icon={<Package />} /><Metric label="Devices" value={selectedDevices.length} icon={<Layers3 />} /><Metric label="Copies" value={draft.ownership_copies.length} icon={<Database />} /><Metric label="DLCs" value={ownedDlcCount} icon={<Package />} /></div></div>
    );
}
