import { Link } from '@inertiajs/react';
import {
    Archive,
    BarChart3,
    BookOpen,
    CircleUserRound,
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
                lockViewport ? 'h-screen overflow-hidden py-7' : 'min-h-screen overflow-x-hidden py-7',
            ].join(' ')}
        >
            <header className="mx-auto flex h-[78px] w-[76vw] max-w-[1340px] min-w-[980px] items-center rounded-full bg-[#b7ff63] shadow-[0_18px_35px_rgb(0_0_0/0.06)] max-lg:w-[calc(100vw-2rem)] max-lg:min-w-0">
                <Link
                    href="/"
                    className="flex h-full w-[150px] items-center justify-center text-[62px] font-black leading-none tracking-[-0.08em]"
                    aria-label="Home"
                >
                    S
                </Link>

                <div className="h-[50px] w-[3px] rounded-full bg-white/60" />

                <div className="flex-1 text-center text-[38px] font-black leading-none tracking-[0.01em]">
                    {title}
                </div>

                <div className="h-[50px] w-[3px] rounded-full bg-white/60" />

                <Link
                    href="/settings"
                    className="flex h-full w-[150px] items-center justify-center"
                    aria-label="Settings"
                >
                    <CircleUserRound size={58} strokeWidth={3.2} />
                </Link>
            </header>

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
                                    'pointer-events-none absolute left-[64px] rounded-full px-4 py-2 text-base font-black shadow-[0_12px_26px_rgb(0_0_0/0.16)] transition',
                                    active
                                        ? 'bg-[#b7ff63] text-black opacity-100'
                                        : 'bg-black text-white opacity-0 group-hover:opacity-100',
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
                    lockViewport ? 'h-[calc(100vh-134px)] pt-8' : 'pt-16 pb-10',
                ].join(' ')}
            >
                {children}
            </div>
        </main>
    );
}