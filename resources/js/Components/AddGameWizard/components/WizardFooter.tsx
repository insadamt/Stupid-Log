import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { steps } from "../constants";

export default function WizardFooter({
    previous,
    stepIndex,
    currentError,
    next,
    submit,
    saving,
    checkingDuplicates,
    creatingImportDraft,
}: {
    previous: () => void;
    stepIndex: number;
    currentError: string | null;
    next: () => void;
    submit: (forceCreateDuplicate?: boolean) => Promise<void>;
    saving: boolean;
    checkingDuplicates: boolean;
    creatingImportDraft: boolean;
}) {
    return (
                        <footer className="sl-wizard-footer flex items-center justify-between gap-5 border-t border-black/10 bg-[#f6faf4] px-7 py-5">
                            <button type="button" onClick={previous} disabled={stepIndex === 0} className="flex items-center gap-3 rounded-2xl bg-black px-7 py-3.5 text-base font-black text-white transition hover:-translate-y-0.5 disabled:bg-black/[0.06] disabled:text-black/35 disabled:opacity-100 disabled:hover:translate-y-0"><ChevronLeft size={18} /> Back</button>
                            <div className={`hidden min-w-0 flex-1 text-center text-xs font-black uppercase tracking-[0.18em] md:block ${currentError ? "rounded-full bg-red-500/10 px-4 py-2 text-red-700" : "text-black/35"}`}>{currentError ? currentError : `${stepIndex + 1} / ${steps.length}`}</div>
                            {stepIndex < steps.length - 1 ? <button type="button" onClick={next} disabled={!!currentError} className="flex items-center gap-3 rounded-2xl bg-black px-7 py-3.5 text-base font-black text-white disabled:opacity-35">Next <ChevronRight size={18} /></button> : <button type="button" onClick={() => void submit()} disabled={!!currentError || saving || checkingDuplicates || creatingImportDraft} className="flex items-center gap-3 rounded-2xl bg-[#b7ff63] px-7 py-3.5 text-base font-black text-black disabled:opacity-35">{saving || checkingDuplicates || creatingImportDraft ? <><Loader2 className="animate-spin" size={18} /> {creatingImportDraft ? "Preparing" : "Saving"}</> : <><Check size={18} /> Save Game</>}</button>}
                        </footer>
    );
}
