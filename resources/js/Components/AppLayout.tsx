import { Link } from '@inertiajs/react';
import { CircleUserRound } from 'lucide-react';
import { PropsWithChildren } from 'react';

const nav = [
    ['Home', '/'],
    ['Library', '/library'],
    ['Stats', '/stats'],
    ['Snapshots', '/snapshots'],
    ['Settings', '/settings'],
];

export default function AppLayout({ title, children }: PropsWithChildren<{ title: string }>) {
    return (
        <main className="min-h-screen bg-[#f2f2f2] px-5 py-7">
            <header className="mx-auto flex h-[70px] max-w-[1280px] items-center rounded-full bg-[#b7ff63]">
                <Link href="/" className="flex w-32 items-center justify-center text-6xl font-black tracking-normal">
                    S
                </Link>
                <div className="flex-1 border-x-4 border-white/75 text-center text-[40px] font-black leading-none">{title}</div>
                <Link href="/settings" className="flex w-32 items-center justify-center" aria-label="Settings">
                    <CircleUserRound size={54} strokeWidth={3} />
                </Link>
            </header>
            <nav className="fixed left-5 top-1/2 z-30 flex w-[210px] -translate-y-1/2 flex-col gap-4 text-[36px] font-black leading-tight">
                {nav.map(([label, href]) => (
                    <Link key={href} href={href} className="w-fit transition hover:translate-x-2">
                        {label}
                    </Link>
                ))}
            </nav>
            <div className="mx-auto max-w-[1660px] pl-[250px] pr-8 pt-12">
                {children}
            </div>
        </main>
    );
}
