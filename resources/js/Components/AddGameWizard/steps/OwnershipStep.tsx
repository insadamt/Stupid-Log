import { ReferenceData } from "../../../types";
import Field from "../components/Field";
import Select from "../components/Select";
import TextInput from "../components/TextInput";
import { physicalLike } from "../constants";
import { Draft, OwnershipCopyDraft } from "../types";

export default function OwnershipStep({
    platform,
    draft,
    addCopy,
    removeCopy,
    ownershipById,
    updateCopy,
    references,
}: {
    platform: ReferenceData["platforms"][number] | undefined;
    draft: Draft;
    addCopy: (ownershipTypeId?: number) => void;
    removeCopy: (localIdValue: string) => void;
    ownershipById: Map<number, string>;
    updateCopy: (localIdValue: string, patch: Partial<OwnershipCopyDraft>) => void;
    references: ReferenceData;
}) {
    return (
                                        <div className="grid gap-6"><div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Ownership</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Select your copies.</h3></div><div className="flex flex-wrap gap-2">{platform?.ownership_types.map((type) => { const selected = draft.ownership_copies.some((copy) => copy.ownership_type_id === type.id); return <button key={type.id} type="button" onClick={() => selected ? removeCopy(draft.ownership_copies.find((copy) => copy.ownership_type_id === type.id)?.local_id ?? "") : addCopy(type.id)} className={`rounded-2xl px-5 py-3 text-sm font-black ${selected ? "bg-black text-white" : "bg-white text-black/55"}`}>{type.name}</button>; })}</div><div className="grid gap-3">{draft.ownership_copies.map((copy, index) => { const name = ownershipById.get(copy.ownership_type_id); const needsPhysical = !!name && physicalLike.includes(name); return <div key={copy.local_id} className="rounded-[24px] border border-black/10 bg-white/70 p-4"><div className="mb-4 flex items-center justify-between"><div><div className="text-[11px] font-black uppercase tracking-[0.2em] text-black/35">Copy {index + 1}</div><div className="text-2xl font-black tracking-[-0.04em]">{name || "Ownership"}</div></div><button type="button" onClick={() => removeCopy(copy.local_id)} disabled={draft.ownership_copies.length === 1} className="rounded-xl bg-red-500/10 px-4 py-2 text-xs font-black text-red-700 disabled:opacity-35">Remove</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2"><Field label="Edition"><TextInput value={copy.edition_name} onChange={(event) => updateCopy(copy.local_id, { edition_name: event.target.value })} placeholder="Standard" /></Field><Field label="Base Price"><TextInput value={copy.base_price} onChange={(event) => updateCopy(copy.local_id, { base_price: event.target.value })} type="number" step="0.01" placeholder="Unknown" /></Field><Field label="Paid"><TextInput value={copy.purchased_price} onChange={(event) => updateCopy(copy.local_id, { purchased_price: event.target.value })} type="number" step="0.01" placeholder="Unknown" /></Field>{needsPhysical && <Field label="Physical Status"><Select value={copy.physical_status_id ?? ""} onChange={(event) => updateCopy(copy.local_id, { physical_status_id: Number(event.target.value) || null })}><option value="">Required</option>{references.physicalStatuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>}<Field label="Purchased At"><TextInput value={copy.purchased_at} onChange={(event) => updateCopy(copy.local_id, { purchased_at: event.target.value })} type="date" /></Field></div></div>; })}</div></div>
    );
}
