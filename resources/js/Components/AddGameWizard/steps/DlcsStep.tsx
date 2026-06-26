import { Check, Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import EmptyCard from "../components/EmptyCard";
import Field from "../components/Field";
import Notice from "../components/Notice";
import Pill from "../components/Pill";
import Select from "../components/Select";
import TextInput from "../components/TextInput";
import { dlcAcquisitionTypes } from "../constants";
import { DlcCatalogItem, Draft, OwnedDlcDraft, SteamDlcData, SteamEnrichmentStatus } from "../types";
import { money } from "../utils";

export default function DlcsStep({
    enrichmentStatus,
    dlcSummary,
    loadLargeDlcCatalog,
    deferDlcCatalog,
    draft,
    dlcQuery,
    setDlcQuery,
    ownedDlcCount,
    filteredDlcs,
    ownedDlcFor,
    removeOwnedDlc,
    updateOwnedDlc,
}: {
    enrichmentStatus: SteamEnrichmentStatus;
    dlcSummary: SteamDlcData | null;
    loadLargeDlcCatalog: () => Promise<void>;
    deferDlcCatalog: () => void;
    draft: Draft;
    dlcQuery: string;
    setDlcQuery: (value: string) => void;
    ownedDlcCount: number;
    filteredDlcs: DlcCatalogItem[];
    ownedDlcFor: (steamAppId: string) => OwnedDlcDraft | undefined;
    removeOwnedDlc: (steamAppId: string) => void;
    updateOwnedDlc: (steamAppId: string, patch: Partial<OwnedDlcDraft>) => void;
}) {
    const [editingSteamAppId, setEditingSteamAppId] = useState<string | null>(null);
    const editingDlc = draft.dlcs.find((dlc) => dlc.steam_app_id === editingSteamAppId);
    const editingOwnedDlc = editingSteamAppId ? ownedDlcFor(editingSteamAppId) : undefined;
    const editingAcquisitionType = editingOwnedDlc?.acquisition_type ?? "Owned";
    const editingIncluded = ["Edition Included", "Free"].includes(editingAcquisitionType);

    function openDlcEditor(dlc: DlcCatalogItem) {
        if (!ownedDlcFor(dlc.steam_app_id)) {
            updateOwnedDlc(dlc.steam_app_id, { acquisition_type: "Owned" });
        }

        setEditingSteamAppId(dlc.steam_app_id);
    }

    function removeDlcAndClose(steamAppId: string) {
        removeOwnedDlc(steamAppId);
        setEditingSteamAppId(null);
    }

    const dlcEditor = editingDlc && editingSteamAppId && typeof document !== "undefined"
        ? createPortal(
            <div className="sl-dlc-editor fixed inset-0 z-[70] grid place-items-center bg-black/55 px-5 py-6" role="dialog" aria-modal="true" aria-labelledby="dlc-editor-title">
                <section className="grid w-full max-w-md gap-5 rounded-[30px] bg-white p-6 text-black shadow-[0_32px_120px_rgb(0_0_0/0.4)]">
                    <div className="min-w-0">
                        <div className="text-xs font-black uppercase tracking-[0.24em] text-black/35">DLC Ownership</div>
                        <h4 id="dlc-editor-title" className="mt-2 line-clamp-3 text-3xl font-black leading-[0.96]">
                            {editingDlc.title}
                        </h4>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.12em] text-black/38">
                            <span>Steam {editingDlc.steam_app_id}</span>
                            <span aria-hidden="true">/</span>
                            <span>{money(editingDlc.base_price)}</span>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <Field label="Ownership">
                            <Select
                                value={editingAcquisitionType}
                                onChange={(event) => event.target.value === "Not Owned" ? removeDlcAndClose(editingSteamAppId) : updateOwnedDlc(editingSteamAppId, { acquisition_type: event.target.value as OwnedDlcDraft["acquisition_type"] })}
                            >
                                <option value="Not Owned">Not Owned</option>
                                {dlcAcquisitionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                            </Select>
                        </Field>
                        <Field label="Paid">
                            <TextInput value={editingOwnedDlc?.purchased_price ?? ""} onChange={(event) => updateOwnedDlc(editingSteamAppId, { purchased_price: event.target.value })} type="number" step="0.01" placeholder="Unknown" disabled={editingIncluded} />
                        </Field>
                        <Field label="Purchased At">
                            <TextInput value={editingOwnedDlc?.purchased_at ?? ""} onChange={(event) => updateOwnedDlc(editingSteamAppId, { purchased_at: event.target.value })} type="date" />
                        </Field>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <button type="button" onClick={() => removeDlcAndClose(editingSteamAppId)} className="h-12 rounded-2xl bg-red-500/10 px-5 text-sm font-black text-red-700 transition hover:bg-red-500/15">
                            Unmark DLC
                        </button>
                        <button type="button" onClick={() => setEditingSteamAppId(null)} className="h-12 rounded-2xl bg-black px-6 text-sm font-black text-white transition hover:-translate-y-0.5">
                            Done
                        </button>
                    </div>
                </section>
            </div>,
            document.body,
        )
        : null;

    return (
        <>
        <div className="grid gap-6">
            <div>
                <div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">DLCs</div>
                <h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Mark expansions.</h3>
            </div>

            {enrichmentStatus === "loading" && <Notice><span className="inline-flex items-center gap-3"><Loader2 className="size-5 animate-spin" /> Steam DLC catalog is loading.</span></Notice>}
            {enrichmentStatus === "warning" && <Notice tone="danger"><div className="flex flex-wrap items-center justify-between gap-3"><span>{dlcSummary ? `${dlcSummary.loaded} of ${dlcSummary.total} DLCs loaded. ${dlcSummary.missing_app_ids.length} are unavailable from Steam.` : "Steam DLC details are unavailable."}</span><button type="button" onClick={() => void loadLargeDlcCatalog()} className="rounded-xl bg-black px-4 py-2 text-xs font-black text-white">Retry missing DLCs</button></div></Notice>}
            {enrichmentStatus === "choice" && dlcSummary && (
                <Notice>
                    <div className="grid gap-4">
                        <div><strong>{dlcSummary.total} DLCs found.</strong> Loading a large catalog can take a while.</div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => void loadLargeDlcCatalog()} className="rounded-xl bg-black px-4 py-2 text-xs font-black text-white">Load DLCs now</button>
                            <button type="button" onClick={deferDlcCatalog} className="rounded-xl bg-black/10 px-4 py-2 text-xs font-black text-black">Add later in Game Details</button>
                        </div>
                    </div>
                </Notice>
            )}
            {enrichmentStatus === "complete" && dlcSummary && dlcSummary.total > 0 && dlcSummary.loaded === 0 && (
                <Notice>DLC import was deferred. After saving, open Game Details and refresh DLCs.</Notice>
            )}

            {!draft.steam_app_id && <EmptyCard title="No Steam App ID." />}

            {draft.steam_app_id && !draft.dlcs.length && enrichmentStatus !== "loading" && (!dlcSummary || dlcSummary.total === 0) && (
                <EmptyCard title="No DLC catalog." />
            )}

            {draft.dlcs.length > 0 && (
                <>
                    <div className="sl-dlc-toolbar grid gap-4 rounded-[28px] border border-black/10 bg-white/70 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        <label className="flex h-[58px] min-w-0 items-center gap-3 rounded-[20px] bg-white px-4 ring-1 ring-black/10">
                            <Search className="size-5 shrink-0 text-black/35" strokeWidth={3} />
                            <input
                                value={dlcQuery}
                                onChange={(event) => setDlcQuery(event.target.value)}
                                placeholder="Search DLCs..."
                                className="min-w-0 flex-1 border-0 bg-transparent text-lg font-black outline-none placeholder:text-black/28"
                            />
                        </label>

                        <div className="flex flex-wrap gap-2">
                            <Pill active>{ownedDlcCount} marked</Pill>
                            <Pill muted>{draft.dlcs.length} imported</Pill>
                        </div>
                    </div>

                    <div className="sl-dlc-grid grid max-h-[520px] gap-4 overflow-y-auto pr-2 xl:grid-cols-2">
                        {filteredDlcs.map((dlc) => {
                            const ownedDlc = ownedDlcFor(dlc.steam_app_id);
                            const selected = !!ownedDlc;

                            return (
                                <article key={dlc.steam_app_id} className={`sl-dlc-card grid gap-4 rounded-[26px] border p-4 transition ${selected ? "is-selected border-[#b7ff63] bg-black text-white" : "border-black/8 bg-white/75 text-black"}`}>
                                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                                        <div className="min-w-0">
                                            <h4 className="line-clamp-2 text-xl font-black leading-[1.04]">
                                                {dlc.title}
                                            </h4>
                                            <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.12em] ${selected ? "text-white/42" : "text-black/38"}`}>
                                                <span>Steam {dlc.steam_app_id}</span>
                                                <span aria-hidden="true">/</span>
                                                <span>{money(dlc.base_price)}</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => openDlcEditor(dlc)}
                                            aria-label={selected ? `Edit ${dlc.title}` : `Mark ${dlc.title} as owned`}
                                            className={`grid size-11 shrink-0 place-items-center rounded-[16px] transition ${selected ? "bg-[#b7ff63] text-black" : "bg-black/7 text-black/50 hover:bg-black hover:text-[#b7ff63]"}`}
                                        >
                                            {selected ? <Check size={21} strokeWidth={3.2} /> : <Plus size={21} strokeWidth={3.2} />}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {!filteredDlcs.length && <Notice>No DLC matches.</Notice>}
                </>
            )}

        </div>
        {dlcEditor}
        </>
    );
}
