import { Link } from '@inertiajs/react';
import {
    Archive,
    BarChart3,
    BookOpen,
    Home as HomeIcon,
    Settings,
} from 'lucide-react';
import { ComponentType, PropsWithChildren } from 'react';

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
    return (
        <main
            className={[
                'bg-[#fbfcf7] text-[#050505]',
                lockViewport ? 'h-screen overflow-hidden' : 'min-h-screen overflow-x-hidden',
            ].join(' ')}
        >
            <nav className="fixed left-7 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3 rounded-[28px] bg-black p-3 shadow-[0_24px_45px_rgb(0_0_0/0.22)]">
                {nav.map((item) => {
                    const Icon = item.icon;
                    const active = item.label === title;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
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
