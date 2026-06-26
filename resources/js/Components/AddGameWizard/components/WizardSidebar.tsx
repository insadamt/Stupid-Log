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
        <aside className="border-r border-white/10 bg-[#080d0b] p-5 text-white lg:p-6">
            <div className="grid gap-5">
                <div className="rounded-[24px] border border-white/10 bg-black p-2 shadow-[0_22px_60px_rgb(0_0_0/0.35)]">
                    <CoverImage src={coverPreview} className="h-[260px] w-full rounded-[18px]" />
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/60">Current Draft</div>
                    <div className="sl-wizard-draft-title mt-2 line-clamp-2 text-lg font-black leading-tight text-white">{draft.title || "Untitled Game"}</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#b7ff63] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-black">{sourceName(draft.source as GameSource)}</span>
                        {draft.steam_app_id && <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Steam {draft.steam_app_id}</span>}
                    </div>
                </div>

                <div className="grid gap-3">
                    {visibleStepQueue.map((item, queueIndex) => {
                        const index = stepIndex + queueIndex;
                        const active = queueIndex === 0;

                        return (
                            <button
                                key={item.key}
                                type="button"
                                disabled={!canOpenStep(index)}
                                onClick={() => canOpenStep(index) && setWizardStep(index)}
                                className={`sl-wizard-step grid grid-cols-[40px_1fr] items-center gap-3 rounded-[18px] border px-3.5 py-3 text-left transition ${active ? "border-[#b7ff63]/50 bg-[#b7ff63] text-black" : "border-white/10 bg-white/[0.04] text-white/55"} ${!canOpenStep(index) ? "cursor-not-allowed opacity-45" : "hover:border-[#b7ff63]/30 hover:bg-white/[0.08]"}`}
                            >
                                <span className={`grid size-10 place-items-center rounded-xl text-xs font-black ${active ? "bg-black text-[#b7ff63]" : "bg-white/10 text-white"}`}>{index + 1}</span>
                                <span className="min-w-0">
                                    <span className={`block text-[9px] font-black uppercase tracking-[0.18em] ${active ? "text-black/45" : "text-white/35"}`}>{active ? "Current" : "Next"}</span>
                                    <span className="mt-1 block truncate text-xs font-black uppercase tracking-[0.12em]">{item.label}</span>
                                </span>
                            </button>
                        );
                    })}

                    {stepIndex === steps.length - 1 && (
                        <div className="rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-3 text-white/40">
                            <div className="text-[9px] font-black uppercase tracking-[0.18em]">Next</div>
                            <div className="mt-1 text-xs font-black uppercase tracking-[0.12em]">Ready to save</div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
