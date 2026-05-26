import { Link, router } from '@inertiajs/react';
import {
    Archive,
    BarChart3,
    BookOpen,
    Home as HomeIcon,
    Settings,
} from 'lucide-react';
import { ComponentType, MouseEvent, PropsWithChildren, useRef } from 'react';
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
    { label: 'Snapshots', href: '/snapshots', icon: Archive },
    { label: 'Settings', href: '/settings', icon: Settings },
];

export default function AppLayout({
    title,
    children,
    lockViewport = false,
}: PropsWithChildren<{ title: string; lockViewport?: boolean }>) {
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
            { autoAlpha: 0, y: 18, scale: 0.992 },
            {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: pageTransition.firstLoadDuration,
                ease: pageTransition.firstLoadEase,
                clearProps: 'transform,visibility,opacity',
            },
        );
    }, { scope: pageRef, dependencies: [title] });

    function navigateMainPage(event: MouseEvent<HTMLAnchorElement>, item: NavItem) {
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

        const targetIndex = nav.findIndex((candidate) => candidate.href === item.href);
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
            to: item.href,
            enterFrom,
            exitTo,
        });

        if (page) {
            createPageTransitionLayer(page);
        }

        router.visit(item.href);
    }

    return (
        <main
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

            <div
                ref={pageRef}
                className={[
                    'mx-auto max-w-[1680px] px-8',
                    lockViewport ? 'h-screen py-8' : 'py-8 pb-10',
                ].join(' ')}
            >
                {children}
            </div>
        </main>
    );
}
