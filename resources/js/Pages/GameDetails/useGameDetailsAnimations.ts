import { MutableRefObject, RefObject } from 'react';
import { gsap, motion, prefersReducedMotion, useGSAP } from '../../animation';
import { Mode } from './types';

export function useGameDetailsAnimations({
    pageRef,
    stageRef,
    detailsPanelRef,
    previousStageRect,
    firstModeRender,
    libraryGameId,
    mode,
}: {
    pageRef: RefObject<HTMLElement | null>;
    stageRef: RefObject<HTMLElement | null>;
    detailsPanelRef: RefObject<HTMLElement | null>;
    previousStageRect: MutableRefObject<DOMRect | null>;
    firstModeRender: MutableRefObject<boolean>;
    libraryGameId: number;
    mode: Mode;
}) {
    useGSAP(() => {
        const page = pageRef.current;
        if (!page) return;
        const header = page.querySelector('[data-details-header]');
        const stage = page.querySelector('[data-details-stage]');
        const card = page.querySelector('[data-details-card]');
        const panels = page.querySelectorAll('[data-details-panel]');

        if (prefersReducedMotion()) {
            gsap.set([page, header, stage, card, panels], { autoAlpha: 1, clearProps: 'transform,visibility,opacity' });
            return;
        }

        const timeline = gsap.timeline({ defaults: { ease: motion.ease.out } });
        timeline
            .fromTo(page, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.duration.normal, clearProps: 'visibility,opacity' }, 0)
            .fromTo(header, { autoAlpha: 0, y: -motion.distance.medium }, { autoAlpha: 1, y: 0, duration: motion.duration.slow, clearProps: 'transform,visibility,opacity' }, 0.06)
            .fromTo(stage, { autoAlpha: 0, scale: 0.94, y: motion.distance.medium }, { autoAlpha: 1, scale: 1, y: 0, duration: motion.duration.page, clearProps: 'transform,visibility,opacity' }, 0.12)
            .fromTo(card, { autoAlpha: 0, scale: 0.9, rotation: -1.5 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: motion.duration.page, clearProps: 'transform,visibility,opacity' }, 0.16)
            .fromTo(panels, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.duration.normal, stagger: 0.06, clearProps: 'visibility,opacity' }, 0.24);
    }, { scope: pageRef, dependencies: [libraryGameId] });

    useGSAP(() => {
        const stage = stageRef.current;
        const detailsPanel = detailsPanelRef.current;
        if (!stage || firstModeRender.current) {
            firstModeRender.current = false;
            previousStageRect.current = null;
            return;
        }

        if (prefersReducedMotion()) {
            previousStageRect.current = null;
            gsap.set([stage, detailsPanel], { autoAlpha: 1, clearProps: 'transform,visibility,opacity' });
            return;
        }

        const nextRect = stage.getBoundingClientRect();
        const previousRect = previousStageRect.current;
        const timeline = gsap.timeline({
            defaults: { ease: motion.ease.inOut },
            onComplete: () => gsap.set(stage, { zIndex: 20 }),
        });
        gsap.set(stage, { zIndex: 40 });

        if (previousRect) {
            timeline.fromTo(stage, { x: previousRect.left - nextRect.left, y: previousRect.top - nextRect.top }, { x: 0, y: 0, duration: motion.duration.slow, clearProps: 'transform' }, 0);
        }

        if (detailsPanel) {
            timeline.fromTo(
                detailsPanel,
                { autoAlpha: 0, x: mode === 'overview' ? -motion.distance.medium : -motion.distance.large, scale: 0.96, transformOrigin: 'left center' },
                { autoAlpha: 1, x: 0, scale: 1, duration: motion.duration.normal, clearProps: 'transform,visibility,opacity' },
                motion.duration.fast,
            );
        }
        previousStageRect.current = null;
    }, { scope: pageRef, dependencies: [mode] });
}
