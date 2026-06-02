import { Link, router } from '@inertiajs/react';
import {
    Archive,
    BarChart3,
    BookOpen,
    Home as HomeIcon,
    ReceiptText,
    Settings,
} from 'lucide-react';
import {
    ComponentType,
    createContext,
    MouseEvent,
    PropsWithChildren,
    useContext,
    useRef,
} from 'react';
import {
    createPageTransitionLayer,
    gsap,
    pageTransition,
    prefersReducedMotion,
    storePageTransition,
    takePageTransitionLayer,
    takePageTransition,
    useGSAP,
} from '../animation';

type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

const nav: NavItem[] = [
    { label: 'Home', href: '/', icon: HomeIcon },
    { label: 'Library', href: '/library', icon: BookOpen },
    { label: 'Stats', href: '/stats', icon: BarChart3 },
    { label: 'Subscriptions', href: '/subscriptions', icon: ReceiptText },
    { label: 'Snapshots', href: '/snapshots', icon: Archive },
    { label: 'Settings', href: '/settings', icon: Settings },
];

type MainPageTransitionContextValue = {
    navigateWithTransition: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
};

const MainPageTransitionContext = createContext<MainPageTransitionContextValue>({
    navigateWithTransition: () => undefined,
});

export function useMainPageTransition() {
    return useContext(MainPageTransitionContext);
}

export default function AppLayout({
    title,
    children,
    lockViewport = false,
}: PropsWithChildren<{ title: string; lockViewport?: boolean }>) {
    const layoutRef = useRef<HTMLElement>(null);
    const pageRef = useRef<HTMLDivElement>(null);
    const currentIndex = nav.findIndex((item) => item.label === title);

    useGSAP(() => {
        const page = pageRef.current;
        if (!page) return;

        const transition = takePageTransition();

        if (prefersReducedMotion()) {
            gsap.set(page, { autoAlpha: 1, clearProps: 'transform,visibility' });
            return;
        }

        if (transition) {
            const { layer, clone } = takePageTransitionLayer();

            if (transition.kind === 'setup-complete') {
                const layout = layoutRef.current ?? page;
                const timeline = gsap.timeline({
                    defaults: { ease: 'power3.out' },
                    onComplete: () => layer?.remove(),
                });

                timeline.fromTo(
                    layout,
                    { autoAlpha: 0.72, filter: 'blur(10px)' },
                    {
                        autoAlpha: 1,
                        filter: 'blur(0px)',
                        duration: 0.72,
                        clearProps: 'visibility,opacity,filter',
                    },
                    0,
                );

                if (clone) {
                    const mark = clone.querySelector<HTMLElement>('[data-launch-mark]');
                    const copy = clone.querySelectorAll<HTMLElement>('[data-launch-copy]');
                    const loader = clone.querySelector<HTMLElement>('[data-launch-loader]');
                    const progress = clone.querySelector<HTMLElement>('[data-launch-progress]');
                    const pulse = clone.querySelector<HTMLElement>('[data-launch-pulse]');

                    timeline
                        .to(progress, { width: '100%', duration: 0.28, ease: 'power2.out' }, 0)
                        .to(pulse, { autoAlpha: 0, duration: 0.14 }, 0.14)
                        .to(clone, { yPercent: -100, duration: 0.68, ease: 'power3.inOut' }, 0.18)
                        .to(mark, { scale: 0.86, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0.16)
                        .to(copy, { y: -14, autoAlpha: 0, duration: 0.24, stagger: 0.03, ease: 'power2.in' }, 0.14)
                        .to(loader, { y: -10, autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, 0.2)
                        .to(clone, { autoAlpha: 0, duration: 0.12 }, 0.74);
                }

                return;
            }

            const timeline = gsap.timeline({
                defaults: {
                    duration: pageTransition.duration,
                    ease: pageTransition.ease,
                },
                onComplete: () => layer?.remove(),
            });

            timeline.fromTo(
                page,
                { yPercent: transition.enterFrom, autoAlpha: 1 },
                {
                    yPercent: 0,
                    autoAlpha: 1,
                    clearProps: 'transform,visibility,opacity',
                },
                0,
            );

            if (clone) {
                timeline.to(
                    clone,
                    {
                        yPercent: transition.exitTo,
                        autoAlpha: 1,
                    },
                    0,
                );
            }

            return;
        }

        if (currentIndex < 0) {
            gsap.set(page, { autoAlpha: 1, clearProps: 'transform,visibility,opacity' });
            return;
        }

        gsap.fromTo(
            page,
            { autoAlpha: 0 },
            {
                autoAlpha: 1,
                duration: pageTransition.firstLoadDuration,
                ease: pageTransition.firstLoadEase,
                clearProps: 'visibility,opacity',
            },
        );
    }, { scope: pageRef, dependencies: [title] });

    function navigateWithTransition(event: MouseEvent<HTMLAnchorElement>, href: string) {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.altKey ||
            event.ctrlKey ||
            event.shiftKey
        ) {
            return;
        }

        const targetIndex = nav.findIndex((candidate) => candidate.href === href);
        const samePage = targetIndex === currentIndex;

        if (samePage || currentIndex < 0 || targetIndex < 0 || prefersReducedMotion()) {
            return;
        }

        event.preventDefault();

        const page = pageRef.current;
        const targetIsBelow = targetIndex > currentIndex;
        const exitTo = targetIsBelow ? -100 : 100;
        const enterFrom = targetIsBelow ? 100 : -100;

        storePageTransition({
            from: nav[currentIndex].href,
            to: href,
            enterFrom,
            exitTo,
        });

        if (page) {
            createPageTransitionLayer(page);
        }

        router.visit(href);
    }

    function navigateMainPage(event: MouseEvent<HTMLAnchorElement>, item: NavItem) {
        navigateWithTransition(event, item.href);
    }

    return (
        <main
            ref={layoutRef}
            className={[
                'bg-[#fbfcf7] text-[#050505]',
                lockViewport ? 'h-screen overflow-hidden' : 'min-h-screen overflow-x-hidden',
            ].join(' ')}
        >
            <nav className="fixed left-7 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3 rounded-[28px] bg-black p-3 shadow-[0_24px_45px_rgb(0_0_0/0.22)]">
                <Link
                    href="/"
                    onClick={(event) => navigateMainPage(event, nav[0])}
                    aria-label="Stupid Log home"
                    className="grid size-[52px] place-items-center rounded-[18px] bg-white p-1.5 transition hover:bg-[#b7ff63]"
                >
                    <img
                        src="/images/stupid-log/stupid-log.png"
                        alt=""
                        className="size-full object-contain"
                    />
                </Link>

                <div className="mx-auto h-px w-8 bg-white/16" />

                {nav.map((item) => {
                    const Icon = item.icon;
                    const active = item.label === title;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={(event) => navigateMainPage(event, item)}
                            aria-label={item.label}
                            className={[
                                'group relative grid size-[52px] place-items-center rounded-[18px] transition',
                                active
                                    ? 'bg-[#b7ff63] text-black'
                                    : 'bg-white/10 text-white hover:bg-white/20',
                            ].join(' ')}
                        >
                            <Icon size={28} strokeWidth={3} />

                            <span
                                className={[
                                    'pointer-events-none absolute left-[64px] rounded-full px-4 py-2 text-base font-black opacity-0 shadow-[0_12px_26px_rgb(0_0_0/0.16)] transition group-hover:opacity-100',
                                    active
                                        ? 'bg-[#b7ff63] text-black'
                                        : 'bg-black text-white',
                                ].join(' ')}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <MainPageTransitionContext.Provider value={{ navigateWithTransition }}>
                <div
                    ref={pageRef}
                    className={[
                        'mx-auto max-w-[1680px] px-8',
                        lockViewport ? 'h-screen py-8' : 'py-8 pb-10',
                    ].join(' ')}
                >
                    {children}
                </div>
            </MainPageTransitionContext.Provider>
        </main>
    );
}
