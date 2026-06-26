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

export const motion = {
    duration: {
        fast: 0.18,
        normal: 0.32,
        slow: 0.52,
        page: 0.62,
    },
    ease: {
        out: 'power3.out',
        inOut: 'power3.inOut',
        soft: 'power2.out',
        sharp: 'power2.in',
    },
    distance: {
        small: 10,
        medium: 24,
        large: 56,
    },
} as const;

export const pageTransition = {
    duration: motion.duration.page,
    ease: motion.ease.inOut,
    firstLoadDuration: motion.duration.slow,
    firstLoadEase: motion.ease.out,
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

        .sl-wizard-modal .sl-search-results {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 14px !important;
        }

        .sl-wizard-modal .sl-search-result-card {
            min-height: 132px !important;
            grid-template-columns: 86px minmax(0, 1fr) 40px !important;
            gap: 16px !important;
            border-radius: 24px !important;
            border-color: rgb(5 9 9 / 0.12) !important;
            background:
                linear-gradient(110deg, rgb(255 255 255 / 0.92), rgb(235 241 233 / 0.9) 52%, rgb(5 9 9 / 0.1)),
                #f7faf5 !important;
            box-shadow:
                inset 0 1px 0 rgb(255 255 255 / 0.72),
                inset 0 -3px 0 rgb(5 9 9 / 0.045),
                0 14px 26px rgb(0 0 0 / 0.09) !important;
        }

        .sl-wizard-modal .sl-search-result-card:hover,
        .sl-wizard-modal .sl-search-result-card:focus-visible {
            border-color: rgb(5 9 9 / 0.2) !important;
            transform: translateY(-2px) !important;
            box-shadow:
                inset 0 1px 0 rgb(255 255 255 / 0.8),
                inset 0 -3px 0 rgb(5 9 9 / 0.06),
                0 20px 38px rgb(0 0 0 / 0.14) !important;
        }

        .sl-wizard-modal .sl-search-result-card.bg-black {
            border-color: rgb(0 0 0 / 0.88) !important;
            background:
                radial-gradient(circle at 0% 0%, rgb(183 255 99 / 0.18), transparent 36%),
                linear-gradient(135deg, #050909, #101916) !important;
            color: #ffffff !important;
            box-shadow:
                inset 0 0 0 1px rgb(255 255 255 / 0.1),
                inset 0 -3px 0 rgb(183 255 99 / 0.18),
                0 22px 42px rgb(0 0 0 / 0.24) !important;
        }

        .sl-wizard-modal .sl-search-result-card > div:first-child {
            width: 86px !important;
            height: 114px !important;
            border-radius: 16px !important;
            padding: 4px !important;
            background: #b7ff63 !important;
            box-shadow:
                0 13px 24px rgb(0 0 0 / 0.18),
                inset 0 0 0 1px rgb(255 255 255 / 0.5) !important;
        }

        .sl-wizard-modal .sl-search-result-card img,
        .sl-wizard-modal .sl-search-result-card [class*='No Cover'] {
            width: 100% !important;
            height: 100% !important;
            border-radius: 15px !important;
            object-fit: cover !important;
            object-position: top center !important;
        }

        .sl-wizard-modal .sl-search-result-card h4 {
            font-size: clamp(20px, 1.55vw, 24px) !important;
            line-height: 1.02 !important;
            letter-spacing: 0 !important;
        }

        .sl-wizard-modal .sl-search-result-card.bg-black h4 {
            color: white !important;
        }

        .sl-wizard-modal .sl-search-result-card-icon {
            box-shadow:
                inset 0 1px 0 rgb(255 255 255 / 0.42),
                0 10px 20px rgb(0 0 0 / 0.1);
        }

        @media (max-width: 900px) {
            .sl-wizard-modal .sl-search-results {
                grid-template-columns: 1fr !important;
            }
        }

        .sl-card-hover .sl-card-panel {
            border: 1px solid rgb(255 255 255 / 0.08) !important;
            background:
                radial-gradient(circle at 18% 0%, rgb(183 255 99 / 0.12), transparent 28%),
                linear-gradient(145deg, #070d0b 0%, #0d1713 100%) !important;
            box-shadow:
                0 26px 56px rgb(0 0 0 / 0.34),
                inset 0 0 0 1px rgb(255 255 255 / 0.06) !important;
            transition-delay: 120ms !important;
        }

        .sl-card-hover.sl-panel-right .sl-card-panel {
            border-radius: 0 26px 26px 0 !important;
        }

        .sl-card-hover.sl-panel-left .sl-card-panel {
            border-radius: 26px 0 0 26px !important;
        }

        .sl-card-hover:hover .sl-card-panel,
        .sl-card-hover:focus-within .sl-card-panel {
            transition-delay: 80ms !important;
        }
    `;
    document.head.appendChild(style);
}

function applyAddGameWizardDomPatch() {
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
                duration: motion.duration.normal,
                ease: motion.ease.out,
                stagger: 0.03,
                overwrite: 'auto',
                clearProps: 'visibility,opacity',
            },
        );
    }, { scope: ref, dependencies: [triggerKey] });
}

export { gsap, useGSAP };
