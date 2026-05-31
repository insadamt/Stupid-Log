import { X } from "lucide-react";
import { steps } from "../constants";
import { StepKey } from "../types";

export default function WizardHeader({
    stepIndex,
    step,
    stepProgress,
    closeWizard,
}: {
    stepIndex: number;
    step: { key: StepKey; label: string };
    stepProgress: number;
    closeWizard: () => void;
}) {
    return (
                        <header className="sl-wizard-header relative overflow-hidden border-b border-white/10 bg-black px-6 py-5 text-white md:px-8">
                            <div className="relative z-10 flex items-start justify-between gap-6">
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="grid size-16 shrink-0 place-items-center rounded-[20px] bg-[#b7ff63] p-1.5 shadow-[0_16px_30px_rgb(0_0_0/0.28)]">
                                        <img
                                            src="/images/stupid-log/stupid-log.png"
                                            alt=""
                                            className="size-full object-contain"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-black uppercase tracking-[0.35em] text-[#b7ff63]/70">Stupid Log Archive Builder</div>
                                        <h2 className="mt-1 text-[42px] font-black leading-none tracking-[-0.06em] text-white">Add Game</h2>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                    <span className="hidden rounded-full bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/60 ring-1 ring-white/10 md:inline-flex">{stepIndex + 1} / {steps.length}</span>
                                    <span className="rounded-full bg-[#b7ff63] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black shadow-[0_12px_30px_rgb(183_255_99/0.16)]">{step.label}</span>
                                    <button type="button" onClick={closeWizard} className="grid size-11 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/10 transition hover:scale-105 hover:bg-white/16"><X size={20} /></button>
                                </div>
                            </div>
                            <div className="relative z-10 mt-5 h-2 overflow-hidden rounded-full bg-black/18">
                                <div className="h-full rounded-full bg-black transition-[width] duration-300" style={{ width: `${stepProgress}%` }} />
                            </div>
                        </header>
    );
}
