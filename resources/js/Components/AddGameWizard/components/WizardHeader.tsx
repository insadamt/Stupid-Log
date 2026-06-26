import { X } from "lucide-react";
import { steps } from "../constants";
import { StepKey } from "../types";

export default function WizardHeader({ stepIndex, step, stepProgress, closeWizard }: { stepIndex: number; step: { key: StepKey; label: string }; stepProgress: number; closeWizard: () => void; }) {
    return (
        <header className="sl-wizard-header border-b border-white/10 bg-[#050907] px-8 py-5 text-white">
            <div className="flex items-center justify-between gap-6">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.34em] text-[#b7ff63]/70">Stupid Log Archive Builder</div>
                    <h2 className="mt-1 text-[40px] font-black leading-none tracking-[-0.06em] text-white">Add Game</h2>
                </div>
                <div className="flex items-center gap-3">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/55">{stepIndex + 1} / {steps.length}</span>
                    <span className="rounded-full bg-[#b7ff63] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black">{step.label}</span>
                    <button type="button" onClick={closeWizard} className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white"><X size={20} /></button>
                </div>
            </div>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#b7ff63]" style={{ width: stepProgress + "%" }} />
            </div>
        </header>
    );
}
