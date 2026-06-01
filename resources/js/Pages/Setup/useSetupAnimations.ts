import { router } from '@inertiajs/react';
import { MutableRefObject, RefObject } from 'react';
import {
    clearPageTransition,
    createPageTransitionLayer,
    gsap,
    prefersReducedMotion,
    removePageTransitionLayer,
    storePageTransition,
    useGSAP,
} from '../../animation';
import { SetupForm, Scene } from './types';

export function useSetupAnimations({
    rootRef,
    scene,
    step,
    form,
    launchStartedRef,
    submittingRef,
    setSubmitting,
    setScene,
}: {
    rootRef: RefObject<HTMLElement | null>;
    scene: Scene;
    step: number;
    form: SetupForm;
    launchStartedRef: MutableRefObject<boolean>;
    submittingRef: MutableRefObject<boolean>;
    setSubmitting: (submitting: boolean) => void;
    setScene: (scene: Scene) => void;
}) {
    useGSAP(() => {
        const root = rootRef.current;
        if (!root || scene !== 'intro') return;

        const frame = root.querySelector('[data-intro-frame]');
        const logo = root.querySelector('[data-intro-logo]');
        const rings = root.querySelectorAll('[data-intro-ring]');
        const copy = root.querySelectorAll('[data-intro-copy]');
        const start = root.querySelector('[data-intro-start]');

        if (prefersReducedMotion()) {
            gsap.set([frame, logo, rings, copy, start], { autoAlpha: 1, clearProps: 'transform,visibility,opacity' });
            return;
        }

        gsap.timeline({ defaults: { ease: 'power3.out' } })
            .fromTo(frame, { autoAlpha: 0, scale: 0.96, y: 18 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.58 })
            .fromTo(rings, { autoAlpha: 0, scale: 0.72 }, { autoAlpha: 1, scale: 1, duration: 0.7, stagger: 0.08 }, '-=0.32')
            .fromTo(logo, { autoAlpha: 0, scale: 0.78, rotation: -6 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.62, ease: 'back.out(1.7)' }, '-=0.45')
            .fromTo(copy, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.38, stagger: 0.08 }, '-=0.18')
            .fromTo(start, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.34 }, '-=0.14');

        gsap.to(rings, {
            scale: (index) => 1.06 + index * 0.035,
            autoAlpha: (index) => 0.5 - index * 0.08,
            duration: 2.4,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            stagger: 0.18,
        });
    }, { scope: rootRef, dependencies: [scene, step] });

    useGSAP(() => {
        const root = rootRef.current;
        if (!root || scene !== 'wizard') return;

        const shell = root.querySelector('[data-wizard-shell]');
        const stepRing = root.querySelector('[data-step-ring]');
        const items = root.querySelectorAll('[data-wizard-item]');

        if (prefersReducedMotion()) {
            gsap.set([shell, stepRing, items], { autoAlpha: 1, clearProps: 'transform,visibility,opacity' });
            return;
        }

        gsap.fromTo(shell, { autoAlpha: 0, y: 18, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out', clearProps: 'transform,visibility,opacity' });
        gsap.fromTo(stepRing, { autoAlpha: 0, scale: 0.72, rotation: -8 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.42, ease: 'back.out(1.7)', clearProps: 'transform,visibility,opacity' });
        gsap.fromTo(items, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.34, stagger: 0.055, ease: 'power3.out', clearProps: 'transform,visibility,opacity' });
    }, { scope: rootRef, dependencies: [scene] });

    useGSAP(() => {
        const root = rootRef.current;
        if (!root || scene !== 'launch' || launchStartedRef.current) return;

        launchStartedRef.current = true;
        const frame = root.querySelector<HTMLElement>('[data-launch-frame]');
        const mark = root.querySelector<HTMLElement>('[data-launch-mark]');
        const copy = root.querySelectorAll<HTMLElement>('[data-launch-copy]');
        const loader = root.querySelector<HTMLElement>('[data-launch-loader]');
        const progress = root.querySelector<HTMLElement>('[data-launch-progress]');
        const pulse = root.querySelector<HTMLElement>('[data-launch-pulse]');
        const submitSetup = () => {
            router.post('/setup', form, {
                preserveScroll: false,
                onError: () => {
                    submittingRef.current = false;
                    launchStartedRef.current = false;
                    setSubmitting(false);
                    clearPageTransition();
                    removePageTransitionLayer();
                    setScene('wizard');
                },
            });
        };

        if (prefersReducedMotion()) {
            submitSetup();
            return;
        }

        gsap.killTweensOf([frame, mark, copy, loader, progress, pulse]);
        gsap.set(progress, { width: '18%' });
        gsap.set(pulse, { xPercent: -120, autoAlpha: 1 });

        const pulseTween = pulse
            ? gsap.to(pulse, {
                xPercent: 120,
                duration: 0.92,
                ease: 'power2.inOut',
                repeat: -1,
                paused: true,
            })
            : null;

        gsap.timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
                storePageTransition({
                    from: '/setup',
                    to: '/',
                    enterFrom: 0,
                    exitTo: 0,
                    kind: 'setup-complete',
                });
                createPageTransitionLayer(root);
                pulseTween?.kill();
                submitSetup();
            },
        })
            .fromTo(frame, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0)
            .fromTo(mark, { scale: 0.92, rotation: -3 }, { scale: 1, rotation: 0, duration: 0.34, ease: 'back.out(1.7)' }, 0.08)
            .to(progress, { width: '82%', duration: 0.92, ease: 'power2.out' }, 0.14)
            .call(() => pulseTween?.play(), [], 0.18)
            .to({}, { duration: 0.22 }, 1.08);
    }, { scope: rootRef, dependencies: [scene] });
}
