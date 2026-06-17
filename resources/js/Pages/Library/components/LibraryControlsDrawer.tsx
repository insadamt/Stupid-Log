import { SlidersHorizontal, X } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { gsap, motion, prefersReducedMotion } from '../../../animation';
import PlatformIcon from '../../../Components/PlatformIcon';
import { statusDotStyle, statusPillStyle } from '../../../statusColors';
import { SortMode, SortOption } from '../types';

type ControlsTab = 'filter' | 'sort';

function sameStatus(a: string, b: string) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export default function LibraryControlsDrawer({
    status,
    platform,
    sort,
    statusCounts,
    platformCounts,
    sortOptions,
    onStatusChange,
    onPlatformChange,
    onSortChange,
    close,
}: {
    status: string;
    platform: string;
    sort: SortMode;
    statusCounts: Array<{
        label: string;
        count: number;
        status?: { name: string; color_hex: string | null };
    }>;
    platformCounts: Array<{
        label: string;
        count: number;
    }>;
    sortOptions: SortOption[];
    onStatusChange: (status: string) => void;
    onPlatformChange: (platform: string) => void;
    onSortChange: (sort: SortMode) => void;
    close: () => void;
}) {
    const [activeTab, setActiveTab] = useState<ControlsTab>('filter');
    const backdropRef = useRef<HTMLDivElement>(null);
    const drawerRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const closingRef = useRef(false);

    useEffect(() => {
        const backdrop = backdropRef.current;
        const drawer = drawerRef.current;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        if (!backdrop || !drawer) return;

        if (prefersReducedMotion()) {
            gsap.set([backdrop, drawer], { autoAlpha: 1, x: 0 });
        } else {
            gsap.timeline({ defaults: { ease: motion.ease.out } })
                .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.duration.fast }, 0)
                .fromTo(drawer, { xPercent: 100 }, { xPercent: 0, duration: motion.duration.normal }, 0);
        }

        closeButtonRef.current?.focus();

        return () => {
            gsap.killTweensOf([backdrop, drawer]);
            previouslyFocused?.focus();
        };
    }, []);

    useEffect(() => {
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') requestClose();
        }

        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    });

    function requestClose() {
        if (closingRef.current) return;
        closingRef.current = true;

        const backdrop = backdropRef.current;
        const drawer = drawerRef.current;
        if (!backdrop || !drawer || prefersReducedMotion()) {
            close();
            return;
        }

        gsap.timeline({ defaults: { ease: motion.ease.sharp }, onComplete: close })
            .to(drawer, { xPercent: 100, duration: motion.duration.fast }, 0)
            .to(backdrop, { autoAlpha: 0, duration: motion.duration.fast }, 0);
    }

    return (
        <div
            ref={backdropRef}
            className="fixed inset-0 z-[70] flex justify-end bg-black/60 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) requestClose();
            }}
        >
            <section
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="library-controls-title"
                className="grid h-full w-full max-w-[520px] grid-rows-[auto_auto_minmax(0,1fr)_auto] border-l border-white/10 bg-black text-white shadow-[-30px_0_90px_rgb(0_0_0/0.42)]"
            >
                <header className="flex items-start justify-between gap-4 border-b border-white/10 px-7 py-6">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.26em] text-[#b7ff63]">Library Controls</div>
                        <h2 id="library-controls-title" className="mt-2 text-4xl font-black leading-none tracking-[-0.055em]">Filter & Sort</h2>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={requestClose}
                        aria-label="Close library controls"
                        className="grid size-11 place-items-center rounded-full bg-white/10 text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b7ff63]"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="grid grid-cols-2 gap-2 border-b border-white/10 px-7 py-4">
                    {(['filter', 'sort'] as ControlsTab[]).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={[
                                'h-11 rounded-[16px] text-sm font-black capitalize transition',
                                activeTab === tab ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/55 hover:text-white',
                            ].join(' ')}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="sl-scrollbar min-h-0 overflow-y-auto overflow-x-hidden px-7 py-6">
                    {activeTab === 'filter' ? (
                        <div className="grid gap-6">
                            <FilterSection title="Status">
                                {statusCounts.map((item) => {
                                    const selected = sameStatus(status, item.label);

                                    return (
                                        <button
                                            key={item.label}
                                            type="button"
                                            onClick={() => onStatusChange(item.label)}
                                            className={[
                                                'flex min-h-12 w-full min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden rounded-[18px] px-4 py-3 text-left text-sm font-black transition',
                                                selected
                                                    ? item.status ? 'text-black' : 'bg-[#b7ff63] text-black'
                                                    : 'bg-white/10 text-white/58 hover:bg-white/15 hover:text-white',
                                            ].join(' ')}
                                            style={selected && item.status ? statusPillStyle({ status: item.status.name, status_color_hex: item.status.color_hex }) : undefined}
                                        >
                                            <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                                                {item.status && <span className="size-2.5 shrink-0 rounded-full" style={statusDotStyle({ status: item.status.name, status_color_hex: item.status.color_hex })} />}
                                                <span className="truncate">{item.label}</span>
                                            </span>
                                            <span className="shrink-0">{item.count}</span>
                                        </button>
                                    );
                                })}
                            </FilterSection>

                            <FilterSection title="Platform">
                                {platformCounts.map((item) => {
                                    const selected = platform === item.label;

                                    return (
                                        <button
                                            key={item.label}
                                            type="button"
                                            onClick={() => onPlatformChange(item.label)}
                                            className={[
                                                'flex min-h-12 w-full min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden rounded-[18px] px-4 py-3 text-left text-sm font-black transition',
                                                selected
                                                    ? 'bg-[#b7ff63] text-black'
                                                    : 'bg-white/10 text-white/58 hover:bg-white/15 hover:text-white',
                                            ].join(' ')}
                                        >
                                            <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                                                <PlatformIcon platform={item.label} surface={selected ? 'lime' : 'dark'} size="sm" />
                                                <span className="truncate">{item.label}</span>
                                            </span>
                                            <span className="shrink-0">{item.count}</span>
                                        </button>
                                    );
                                })}
                            </FilterSection>
                        </div>
                    ) : (
                        <FilterSection title="Sort By">
                            {sortOptions.map((option) => {
                                const Icon = option.icon;
                                const selected = sort === option.value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => onSortChange(option.value)}
                                        className={[
                                            'flex min-h-12 w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-black transition',
                                            selected ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/58 hover:bg-white/15 hover:text-white',
                                        ].join(' ')}
                                    >
                                        <Icon size={18} strokeWidth={3} />
                                        {option.label}
                                    </button>
                                );
                            })}
                        </FilterSection>
                    )}
                </div>

                <footer className="border-t border-white/10 px-7 py-5">
                    <div className="rounded-[24px] bg-[#b7ff63] p-4 text-black">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">Active View</p>
                        <p className="mt-1 break-words text-xl font-black leading-tight">{status} / {platform} / {sort}</p>
                    </div>
                </footer>
            </section>
        </div>
    );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
                <SlidersHorizontal size={14} strokeWidth={3} />
                {title}
            </div>
            <div className="grid gap-2">{children}</div>
        </section>
    );
}
