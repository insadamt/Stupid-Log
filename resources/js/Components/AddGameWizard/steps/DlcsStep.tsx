import { Loader2 } from "lucide-react";
import EmptyCard from "../components/EmptyCard";
import Notice from "../components/Notice";
import Pill from "../components/Pill";
import Select from "../components/Select";
import TextInput from "../components/TextInput";
import { dlcAcquisitionTypes } from "../constants";
import { DlcCatalogItem, Draft, OwnedDlcDraft } from "../types";
import { money } from "../utils";

export default function DlcsStep({
    enriching,
    draft,
    dlcQuery,
    setDlcQuery,
    ownedDlcCount,
    filteredDlcs,
    ownedDlcFor,
    removeOwnedDlc,
    updateOwnedDlc,
}: {
    enriching: boolean;
    draft: Draft;
    dlcQuery: string;
    setDlcQuery: (value: string) => void;
    ownedDlcCount: number;
    filteredDlcs: DlcCatalogItem[];
    ownedDlcFor: (steamAppId: string) => OwnedDlcDraft | undefined;
    removeOwnedDlc: (steamAppId: string) => void;
    updateOwnedDlc: (steamAppId: string, patch: Partial<OwnedDlcDraft>) => void;
}) {
    return (
                                        <div className="grid gap-6">
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">DLCs</div>
                                                <h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Mark expansions.</h3>
                                            </div>

                                            {enriching && <Notice><span className="inline-flex items-center gap-3"><Loader2 className="size-5 animate-spin" /> Steam DLC catalog is loading.</span></Notice>}

                                            {!draft.steam_app_id && (
                                                <EmptyCard title="No Steam App ID." body="DLC catalog import needs a Steam App ID. Continue now and refresh DLCs from the details page after adding one." />
                                            )}

                                            {draft.steam_app_id && !draft.dlcs.length && !enriching && (
                                                <EmptyCard title="No DLC catalog loaded." body="Steam did not return DLCs for this game yet. The full catalog will still be imported locally when the game is saved." />
                                            )}

                                            {draft.dlcs.length > 0 && (
                                                <>
                                                    <div className="grid gap-4 rounded-[28px] border border-black/10 bg-white/70 p-4 md:grid-cols-[1fr_auto] md:items-center">
                                                        <TextInput value={dlcQuery} onChange={(event) => setDlcQuery(event.target.value)} placeholder="Search DLCs..." />
                                                        <div className="flex flex-wrap gap-2">
                                                            <Pill active>{ownedDlcCount} marked</Pill>
                                                            <Pill muted>{draft.dlcs.length} imported on save</Pill>
                                                        </div>
                                                    </div>

                                                    <div className="grid max-h-[500px] gap-3 overflow-y-auto rounded-[28px] border border-black/10 bg-white/70 p-3">
                                                        {filteredDlcs.map((dlc) => {
                                                            const ownedDlc = ownedDlcFor(dlc.steam_app_id);
                                                            const selected = !!ownedDlc;
                                                            const acquisitionType = ownedDlc?.acquisition_type ?? "Owned";
                                                            const included = ["Edition Included", "Free"].includes(acquisitionType);

                                                            return (
                                                                <div key={dlc.steam_app_id} className={`grid gap-4 rounded-[22px] border p-3 transition ${selected ? "border-black bg-white" : "border-black/5 bg-white/55"} lg:grid-cols-[1fr_auto] lg:items-center`}>
                                                                    <div className="min-w-0">
                                                                        <div className="truncate text-lg font-black tracking-[-0.035em]">{dlc.title}</div>
                                                                        <div className="mt-1 text-sm font-bold text-black/45">{money(dlc.base_price)}</div>
                                                                    </div>
                                                                    <div className="grid gap-2 sm:grid-cols-[150px_120px_150px_auto]">
                                                                        <Select value={selected ? acquisitionType : "Not Owned"} onChange={(event) => event.target.value === "Not Owned" ? removeOwnedDlc(dlc.steam_app_id) : updateOwnedDlc(dlc.steam_app_id, { acquisition_type: event.target.value as OwnedDlcDraft["acquisition_type"] })}>
                                                                            <option value="Not Owned">Not Owned</option>
                                                                            {dlcAcquisitionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                                                                        </Select>
                                                                        <TextInput value={ownedDlc?.purchased_price ?? ""} onChange={(event) => updateOwnedDlc(dlc.steam_app_id, { purchased_price: event.target.value })} type="number" step="0.01" placeholder="Paid" disabled={!selected || included} />
                                                                        <TextInput value={ownedDlc?.purchased_at ?? ""} onChange={(event) => updateOwnedDlc(dlc.steam_app_id, { purchased_at: event.target.value })} type="date" disabled={!selected} />
                                                                        <button type="button" onClick={() => selected ? removeOwnedDlc(dlc.steam_app_id) : updateOwnedDlc(dlc.steam_app_id, { acquisition_type: "Owned" })} className={`rounded-2xl px-4 py-3 text-sm font-black ${selected ? "bg-black text-white" : "bg-black/5 text-black/55"}`}>
                                                                            {selected ? "Marked" : "Own"}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {!filteredDlcs.length && <Notice>No DLC matches the current search.</Notice>}
                                                </>
                                            )}
                                        </div>
    );
}
