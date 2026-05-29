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
    kind?: 'nav' | 'setup-complete';
};

export const pageTransition = {
    duration: 0.62,
    ease: 'power3.inOut',
    firstLoadDuration: 0.52,
    firstLoadEase: 'power3.out',
};

const layerId = 'stupid-log-page-transition-layer';
const addGameWizardUxStyleId = 'sl-add-game-wizard-ux-patch';
const unknownSearchMetaPattern = /^unknown publisher\s*·\s*unknown (date|year)$/i;

export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function injectAddGameWizardUxStyles() {
    if (document.getElementById(addGameWizardUxStyleId)) return;

    const style = document.createElement('style');
    style.id = addGameWizardUxStyleId;
    style.textContent = `
        .sl-wizard-modal [data-sl-search-title='true'] {
            max-width: 560px !important;
            font-size: clamp(34px, 3.6vw, 46px) !important;
            line-height: 0.92 !important;
            letter-spacing: -0.05em !important;
        }

        .sl-wizard-modal section.relative.overflow-hidden.rounded-\[38px\].bg-black {
            border-radius: 36px !important;
        }

        .sl-wizard-modal section.relative.overflow-hidden.rounded-\[38px\].bg-black label {
            border-radius: 14px !important;
            min-height: 72px !important;
        }

        .sl-wizard-modal section.relative.overflow-hidden.rounded-\[38px\].bg-black input {
            font-size: clamp(22px, 2.1vw, 28px) !important;
            letter-spacing: -0.045em !important;
        }

        .sl-wizard-modal section.relative.overflow-hidden.rounded-\[38px\].bg-black button.bg-\[\#b7ff63\] {
            border-radius: 18px !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] {
            border-radius: 32px !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] > div:last-child {
            max-height: 420px !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group {
            min-height: 126px !important;
            grid-template-columns: 86px minmax(0, 1fr) auto !important;
            gap: 18px !important;
            border-radius: 22px !important;
            border-color: rgb(0 0 0 / 0.08) !important;
            background: rgb(246 249 244 / 0.82) !important;
            box-shadow:
                inset 0 0 0 1px rgb(255 255 255 / 0.4),
                0 12px 26px rgb(0 0 0 / 0.055) !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group:hover,
        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group:focus-visible {
            border-color: rgb(0 0 0 / 0.14) !important;
            background: #ffffff !important;
            transform: translateY(-2px) !important;
            box-shadow:
                inset 0 0 0 1px rgb(255 255 255 / 0.64),
                0 18px 34px rgb(0 0 0 / 0.1) !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group.bg-black {
            border-color: rgb(0 0 0 / 0.88) !important;
            background: #050909 !important;
            color: #ffffff !important;
            box-shadow:
                inset 0 0 0 1px rgb(255 255 255 / 0.1),
                0 20px 44px rgb(0 0 0 / 0.24) !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group > div:first-child {
            border-radius: 16px !important;
            padding: 0 !important;
            background: transparent !important;
            box-shadow: 0 10px 20px rgb(0 0 0 / 0.1) !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group img,
        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group [class*='No Cover'] {
            width: 80px !important;
            height: 110px !important;
            border-radius: 15px !important;
            object-fit: cover !important;
            object-position: top center !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group h4 {
            font-size: clamp(21px, 2vw, 26px) !important;
            line-height: 0.94 !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group p {
            margin-top: 10px !important;
            font-size: 11px !important;
            letter-spacing: 0.14em !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group > span:last-child {
            width: 46px !important;
            height: 46px !important;
            border-radius: 16px !important;
            transform: none !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group:hover > span:last-child,
        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group:focus-visible > span:last-child {
            transform: none !important;
        }

        .sl-wizard-modal .rounded-\[38px\].bg-\[\#dfe5df\] button.group > span:last-child svg {
            width: 21px !important;
            height: 21px !important;
            transform: none !important;
        }

        .sl-card-hover .sl-card-panel {
            border-radius: 26px !important;
            border: 1px solid rgb(255 255 255 / 0.08) !important;
            background:
                radial-gradient(circle at 18% 0%, rgb(183 255 99 / 0.12), transparent 28%),
                linear-gradient(145deg, #070d0b 0%, #0d1713 100%) !important;
            box-shadow:
                0 26px 56px rgb(0 0 0 / 0.34),
                inset 0 0 0 1px rgb(255 255 255 / 0.06) !important;
            transition-delay: 120ms !important;
        }

        .sl-card-hover:hover .sl-card-panel,
        .sl-card-hover:focus-within .sl-card-panel {
            transition-delay: 80ms !important;
        }
    `;
    document.head.appendChild(style);
}

function applyAddGameWizardDomPatch() {
    document.querySelectorAll<HTMLElement>('.sl-wizard-modal h3').forEach((node) => {
        if (node.textContent?.trim() === 'Find the game file.') {
            node.dataset.slSearchTitle = 'true';
        }
    });

    document.querySelectorAll<HTMLElement>('.sl-wizard-modal p, .sl-wizard-modal div').forEach((node) => {
        const text = node.textContent?.trim();
        if (!text) return;

        if (text === 'Archive Builder') {
            node.style.display = 'none';
            return;
        }

        if (unknownSearchMetaPattern.test(text)) {
            node.style.display = 'none';
        }
    });
}

function installAddGameWizardUxPatch() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    injectAddGameWizardUxStyles();
    applyAddGameWizardDomPatch();

    const observer = new MutationObserver(() => applyAddGameWizardDomPatch());
    observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
    });
}

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installAddGameWizardUxPatch, { once: true });
    } else {
        installAddGameWizardUxPatch();
    }
}

export function storePageTransition(transition: PageTransition) {
    window.sessionStorage.setItem(transitionKey, JSON.stringify(transition));
}

export function clearPageTransition() {
    window.sessionStorage.removeItem(transitionKey);
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

export function removePageTransitionLayer() {
    document.getElementById(layerId)?.remove();
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
