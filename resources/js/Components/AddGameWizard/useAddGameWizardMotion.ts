import { MutableRefObject, RefObject } from "react";
import { gsap, motion, prefersReducedMotion, useGSAP } from "../../animation";

type WizardMotionInput = {
    open: boolean;
    stepKey: string;
    commandMessage: string;
    backdropRef: RefObject<HTMLDivElement | null>;
    panelRef: RefObject<HTMLElement | null>;
    stepShellRef: RefObject<HTMLDivElement | null>;
    stepContentRef: RefObject<HTMLElement | null>;
    stepExitClone: MutableRefObject<HTMLElement | null>;
    stepDirection: MutableRefObject<number>;
};

export function useAddGameWizardMotion({
    open,
    stepKey,
    commandMessage,
    backdropRef,
    panelRef,
    stepShellRef,
    stepContentRef,
    stepExitClone,
    stepDirection,
}: WizardMotionInput) {
    useGSAP(() => {
        if (!open) return;

        const backdrop = backdropRef.current;
        const panel = panelRef.current;
        if (!backdrop || !panel) return;

        const animatedRegions = panel.querySelectorAll("[data-wizard-enter]");

        if (prefersReducedMotion()) {
            gsap.set([backdrop, panel, animatedRegions], { autoAlpha: 1, clearProps: "transform,visibility,opacity" });
            return;
        }

        gsap.killTweensOf([backdrop, panel, animatedRegions]);

        gsap.timeline({ defaults: { ease: motion.ease.out } })
            .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.duration.fast, clearProps: "visibility,opacity" }, 0)
            .fromTo(
                panel,
                { autoAlpha: 0, y: 28, scale: 0.965 },
                { autoAlpha: 1, y: 0, scale: 1, duration: motion.duration.slow, clearProps: "transform,visibility,opacity" },
                0.04,
            )
            .fromTo(
                animatedRegions,
                { autoAlpha: 0, y: 18, scale: 0.985 },
                { autoAlpha: 1, y: 0, scale: 1, duration: motion.duration.normal, stagger: 0.045, clearProps: "transform,visibility,opacity" },
                0.16,
            );
    }, { scope: backdropRef, dependencies: [open] });

    useGSAP(() => {
        if (!open) return;

        const stepNode = stepContentRef.current;
        if (!stepNode) return;

        if (prefersReducedMotion()) {
            stepExitClone.current?.remove();
            stepExitClone.current = null;
            gsap.set(stepNode, { autoAlpha: 1, clearProps: "transform,visibility,opacity" });
            return;
        }

        const children = Array.from(stepNode.firstElementChild?.children ?? []);
        const direction = stepDirection.current >= 0 ? 1 : -1;
        const exitClone = stepExitClone.current;

        gsap.killTweensOf([stepNode, children, exitClone].filter(Boolean));

        const timeline = gsap.timeline({
            defaults: { ease: motion.ease.inOut },
            onComplete: () => {
                exitClone?.remove();
                if (stepExitClone.current === exitClone) stepExitClone.current = null;
                stepShellRef.current?.style.removeProperty("min-height");
            },
        });

        if (exitClone) {
            timeline.to(
                exitClone,
                {
                    autoAlpha: 0,
                    x: -motion.distance.large * direction,
                    scale: 0.975,
                    filter: "blur(3px)",
                    duration: motion.duration.normal,
                },
                0,
            );
        }

        timeline.fromTo(
            stepNode,
            {
                autoAlpha: exitClone ? 0.24 : 0,
                x: exitClone ? motion.distance.large * direction : 0,
                y: exitClone ? 0 : motion.distance.small,
                scale: exitClone ? 0.985 : 0.99,
                filter: exitClone ? "blur(3px)" : "blur(0px)",
            },
            {
                autoAlpha: 1,
                x: 0,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                duration: exitClone ? motion.duration.normal : motion.duration.fast,
                clearProps: "transform,visibility,opacity,filter",
            },
            0,
        );

        if (children.length) {
            timeline.fromTo(
                children,
                { autoAlpha: 0, y: 14, scale: 0.99 },
                { autoAlpha: 1, y: 0, scale: 1, duration: motion.duration.fast, stagger: 0.035, clearProps: "transform,visibility,opacity" },
                exitClone ? 0.14 : 0.06,
            );
        }
    }, { scope: stepContentRef, dependencies: [open, stepKey] });

    useGSAP(() => {
        if (!open || prefersReducedMotion()) return;

        const panel = panelRef.current;
        const commandText = panel?.querySelector("[data-wizard-command-message]");
        if (!commandText) return;

        gsap.killTweensOf(commandText);
        gsap.fromTo(
            commandText,
            { autoAlpha: 0, y: 6 },
            { autoAlpha: 1, y: 0, duration: motion.duration.fast, ease: motion.ease.out, clearProps: "transform,visibility,opacity" },
        );
    }, { scope: panelRef, dependencies: [open, commandMessage] });

    function closeWithMotion(onComplete: () => void) {
        const backdrop = backdropRef.current;
        const panel = panelRef.current;

        if (!backdrop || !panel || prefersReducedMotion()) {
            onComplete();
            return;
        }

        gsap.killTweensOf([backdrop, panel]);
        gsap.timeline({
            defaults: { ease: motion.ease.sharp },
            onComplete,
        })
            .to(panel, { autoAlpha: 0, y: 18, scale: 0.985, duration: motion.duration.fast }, 0)
            .to(backdrop, { autoAlpha: 0, duration: motion.duration.fast }, 0.04);
    }

    function captureStepExit() {
        const shell = stepShellRef.current;
        const currentStep = stepContentRef.current;
        if (!open || !shell || !currentStep || prefersReducedMotion()) return;

        stepExitClone.current?.remove();

        const shellRect = shell.getBoundingClientRect();
        const stepRect = currentStep.getBoundingClientRect();
        const clone = currentStep.cloneNode(true) as HTMLElement;

        clone.style.position = "absolute";
        clone.style.left = `${stepRect.left - shellRect.left}px`;
        clone.style.top = `${stepRect.top - shellRect.top}px`;
        clone.style.width = `${stepRect.width}px`;
        clone.style.minHeight = `${stepRect.height}px`;
        clone.style.margin = "0";
        clone.style.pointerEvents = "none";
        clone.style.zIndex = "20";
        clone.setAttribute("aria-hidden", "true");

        shell.style.minHeight = `${stepRect.height}px`;
        shell.appendChild(clone);
        stepExitClone.current = clone;
    }

    return { closeWithMotion, captureStepExit };
}
