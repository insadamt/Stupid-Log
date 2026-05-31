import CoverImage from "./CoverImage";
import { steps } from "../constants";
import { Draft, GameSource, StepKey } from "../types";
import { sourceName } from "../utils";

export default function WizardSidebar({
    coverPreview,
    draft,
    visibleStepQueue,
    stepIndex,
    canOpenStep,
    setWizardStep,
}: {
    coverPreview: string;
    draft: Draft;
    visibleStepQueue: Array<{ key: StepKey; label: string }>;
    stepIndex: number;
    canOpenStep: (index: number) => boolean;
    setWizardStep: (index: number) => void;
}) {
    return (
                                <aside className="relative overflow-hidden p-5 text-black lg:p-6">
                                    <div className="relative z-10 grid gap-5">
                                        <div className="rounded-[28px] bg-black/[0.06] p-2 ring-1 ring-black/10">
                                            <CoverImage src={coverPreview} className="h-[260px] w-full rounded-[22px]" />
                                        </div>
                                        <div className="rounded-[26px] bg-black/[0.045] p-4 ring-1 ring-black/10">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/42">Current Draft</div>
                                            <div className="sl-wizard-draft-title mt-2 font-black text-black">{draft.title || "Untitled Game"}</div>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-black px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white">{sourceName(draft.source as GameSource)}</span>
                                                {draft.steam_app_id && <span className="rounded-full bg-[#b7ff63] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-black">Steam {draft.steam_app_id}</span>}
                                            </div>
                                        </div>
                                        <div className="sl-wizard-rail relative grid gap-3">
                                            {visibleStepQueue.map((item, queueIndex) => {
                                                const index = stepIndex + queueIndex;
                                                const active = queueIndex === 0;

                                                return (
                                                    <button
                                                        key={item.key}
                                                        type="button"
                                                        disabled={!canOpenStep(index)}
                                                        onClick={() => canOpenStep(index) && setWizardStep(index)}
                                                        className={`sl-wizard-step grid grid-cols-[36px_1fr] items-center gap-3 rounded-[20px] px-3.5 py-3 text-left opacity-100 transition ${active ? "is-active bg-[#b7ff63] text-black" : "bg-black/[0.055] text-black/58"} ${!canOpenStep(index) ? "cursor-not-allowed opacity-45" : "hover:bg-black/10"}`}
                                                    >
                                                        <span className={`grid size-9 place-items-center rounded-xl text-xs font-black ${active ? "bg-black text-[#b7ff63]" : "bg-black/10 text-black"}`}>{index + 1}</span>
                                                        <span className="min-w-0">
                                                            <span className={`block text-[9px] font-black uppercase tracking-[0.16em] ${active ? "text-black/45" : "text-black/35"}`}>{active ? "Current" : "Next"}</span>
                                                            <span className="mt-1 block truncate text-xs font-black uppercase tracking-[0.1em]">{item.label}</span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                            {stepIndex === steps.length - 1 && (
                                                <div className="sl-wizard-step rounded-[20px] bg-black/[0.045] px-3.5 py-3 text-black/40 ring-1 ring-black/10">
                                                    <div className="text-[9px] font-black uppercase tracking-[0.16em]">Next</div>
                                                    <div className="mt-1 text-xs font-black uppercase tracking-[0.1em]">Ready to save</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </aside>
    );
}
