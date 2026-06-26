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
        <footer className="sl-wizard-footer flex items-center justify-between gap-5 border-t border-white/10 bg-[#050907] px-7 py-5 text-white">
            <button type="button" onClick={previous} disabled={stepIndex === 0} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-7 py-3.5 text-base font-black text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-35"><ChevronLeft size={18} /> Back</button>
            <div className={`hidden min-w-0 flex-1 text-center text-xs font-black uppercase tracking-[0.18em] md:block ${currentError ? "rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-red-100" : "text-white/35"}`}>{currentError ? currentError : `${stepIndex + 1} / ${steps.length}`}</div>
            {stepIndex < steps.length - 1 ? <button type="button" onClick={next} disabled={!!currentError} className="flex items-center gap-3 rounded-2xl bg-[#b7ff63] px-7 py-3.5 text-base font-black text-black shadow-[0_16px_36px_rgb(183_255_99/0.13)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-35">Next <ChevronRight size={18} /></button> : <button type="button" onClick={() => void submit()} disabled={!!currentError || saving || checkingDuplicates || creatingImportDraft} className="flex items-center gap-3 rounded-2xl bg-[#b7ff63] px-7 py-3.5 text-base font-black text-black shadow-[0_16px_36px_rgb(183_255_99/0.13)] disabled:opacity-35">{saving || checkingDuplicates || creatingImportDraft ? <><Loader2 className="animate-spin" size={18} /> {creatingImportDraft ? "Preparing" : "Saving"}</> : <><Check size={18} /> Save Game</>}</button>}
        </footer>
    );
}
