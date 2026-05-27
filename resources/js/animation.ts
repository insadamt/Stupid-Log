import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { RefObject } from 'react';

gsap.registerPlugin(useGSAP);

const transitionKey = 'stupid-log:page-transition';

type PageTransition = {
    from: string;
    to: string;
    enterFrom: number;
    exitTo: number;
};

export const pageTransition = {
    duration: 0.62,
    ease: 'power3.inOut',
    firstLoadDuration: 0.52,
    firstLoadEase: 'power3.out',
};

const layerId = 'stupid-log-page-transition-layer';

export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function storePageTransition(transition: PageTransition) {
    window.sessionStorage.setItem(transitionKey, JSON.stringify(transition));
}

export function createPageTransitionLayer(page: HTMLElement) {
    document.getElementById(layerId)?.remove();

    const bounds = page.getBoundingClientRect();
    const layer = document.createElement('div');
    const clone = page.cloneNode(true) as HTMLElement;

    layer.id = layerId;
    layer.style.position = 'fixed';
    layer.style.inset = '0';
    layer.style.zIndex = '30';
    layer.style.overflow = 'hidden';
    layer.style.pointerEvents = 'none';
    layer.style.background = 'transparent';

    clone.style.position = 'absolute';
    clone.style.left = `${bounds.left}px`;
    clone.style.top = `${bounds.top}px`;
    clone.style.width = `${bounds.width}px`;
    clone.style.height = `${bounds.height}px`;
    clone.style.maxWidth = 'none';
    clone.style.margin = '0';

    layer.appendChild(clone);
    document.body.appendChild(layer);

    return clone;
}

export function takePageTransition(): PageTransition | null {
    const raw = window.sessionStorage.getItem(transitionKey);
    window.sessionStorage.removeItem(transitionKey);

    if (!raw) return null;

    try {
        return JSON.parse(raw) as PageTransition;
    } catch {
        return null;
    }
}

export function takePageTransitionLayer() {
    const layer = document.getElementById(layerId);
    return {
        layer,
        clone: layer?.firstElementChild as HTMLElement | null,
    };
}

export function useStaggerRefresh<T extends HTMLElement>(
    ref: RefObject<T | null>,
    triggerKey: string,
    selector = '[data-refresh-item]',
) {
    useGSAP(() => {
        const container = ref.current;
        if (!container) return;

        const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
        if (!items.length) return;

        if (prefersReducedMotion()) {
            gsap.set(items, { autoAlpha: 1, clearProps: 'transform,visibility,opacity' });
            return;
        }

        gsap.killTweensOf(items);
        gsap.fromTo(
            items,
            { autoAlpha: 0 },
            {
                autoAlpha: 1,
                duration: 0.28,
                ease: 'power3.out',
                stagger: 0.03,
                overwrite: 'auto',
                clearProps: 'visibility,opacity',
            },
        );
    }, { scope: ref, dependencies: [triggerKey] });
}

export { gsap, useGSAP };
