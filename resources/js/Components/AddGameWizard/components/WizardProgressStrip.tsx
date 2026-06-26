import { Check } from "lucide-react";
import { StepKey } from "../types";

export default function WizardProgressStrip({
    steps,
    stepIndex,
    canOpenStep,
    setWizardStep,
}: {
    steps: Array<{ key: StepKey; label: string }>;
    stepIndex: number;
    canOpenStep: (index: number) => boolean;
    setWizardStep: (index: number) => void;
}) {
    return (
        <nav className="sl-wizard-progress" aria-label="Add game progress" data-wizard-enter>
            <div className="sl-wizard-progress-track" />
            <div className="sl-wizard-progress-scroll">
                {steps.map((item, index) => {
                    const completed = index < stepIndex;
                    const active = index === stepIndex;
                    const locked = !canOpenStep(index);

                    return (
                        <button
                            key={item.key}
                            type="button"
                            disabled={locked}
                            aria-current={active ? "step" : undefined}
                            onClick={() => canOpenStep(index) && setWizardStep(index)}
                            className={`sl-wizard-progress-step ${active ? "is-active" : ""} ${completed ? "is-complete" : ""} ${locked ? "is-locked" : ""}`}
                        >
                            <span className="sl-wizard-progress-index">
                                {completed ? <Check size={13} strokeWidth={4} /> : index + 1}
                            </span>
                            <span className="sl-wizard-progress-copy">
                                <strong>{item.label}</strong>
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
