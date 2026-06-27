import { Check, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { ReactNode, useEffect, useRef } from 'react';
import { gsap, motion, prefersReducedMotion } from '../../../animation';
import { statusDotStyle, statusPillStyle } from '../../../statusColors';
import { LibraryFilters, SortMode, SortOption } from '../types';

type ControlsTab = 'filter' | 'sort';

function sameStatus(a: string, b: string) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function activeFilterCount(filters: LibraryFilters) {
    return [
        filters.status !== 'All',
        filters.platform !== 'All',
        filters.ownershipType !== 'All',
        filters.device !== 'All',
        filters.achievements !== 'all',
        filters.cover !== 'all',
        filters.firstPlayedYear !== 'All',
        filters.completedYear !== 'All',
    ].filter(Boolean).length;
}

export default function LibraryControlsDrawer({
    filters,
    sort,
    statusCounts,
    platformCounts,
    ownershipOptions,
    deviceOptions,
    firstPlayedYearOptions,
    completedYearOptions,
    sortOptions,
    onFiltersChange,
    onSortChange,
    onClearFilters,
    loading,
    close,
    activeTab,
    onActiveTabChange,
}: {
    filters: LibraryFilters;
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
    ownershipOptions: string[];
    deviceOptions: string[];
    firstPlayedYearOptions: string[];
    completedYearOptions: string[];
    sortOptions: SortOption[];
    onFiltersChange: (filters: Partial<LibraryFilters>) => void;
    onSortChange: (sort: SortMode) => void;
    onClearFilters: () => void;
    loading: boolean;
    close: () => void;
    activeTab: ControlsTab;
    onActiveTabChange: (tab: ControlsTab) => void;
}) {
    const backdropRef = useRef<HTMLDivElement>(null);
    const drawerRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const closingRef = useRef(false);
    const filterCount = activeFilterCount(filters);

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
    }, []);

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
                            onClick={() => onActiveTabChange(tab)}
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
                        <div className="grid gap-7">
                            <FilterSection title="Status">
                                <div className="grid grid-cols-2 gap-2">
                                    {statusCounts.map((item) => {
                                        const selected = sameStatus(filters.status, item.label);

                                        return (
                                            <button
                                                key={item.label}
                                                type="button"
                                                onClick={() => onFiltersChange({ status: item.label })}
                                                disabled={loading}
                                                className={[
                                                    'flex min-h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden rounded-[16px] px-3 py-2 text-left text-sm font-black transition disabled:cursor-wait disabled:opacity-55',
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
                                </div>
                            </FilterSection>

                            <FilterSection title="Library Details">
                                <div className="grid gap-3">
                                    <SelectField
                                        label="Platform"
                                        options={platformCounts.map((item) => ({
                                            value: item.label,
                                            label: item.label === 'All' ? `All platforms (${item.count})` : `${item.label} (${item.count})`,
                                        }))}
                                        value={filters.platform}
                                        onChange={(platform) => onFiltersChange({ platform })}
                                        disabled={loading}
                                    />
                                    <SelectField
                                        label="Ownership"
                                        options={ownershipOptions}
                                        value={filters.ownershipType}
                                        onChange={(ownershipType) => onFiltersChange({ ownershipType })}
                                        disabled={loading}
                                    />
                                    <SelectField
                                        label="Device"
                                        options={deviceOptions}
                                        value={filters.device}
                                        onChange={(device) => onFiltersChange({ device })}
                                        disabled={loading}
                                    />
                                </div>
                            </FilterSection>

                            <FilterSection title="Availability">
                                <div className="grid gap-3">
                                    <SegmentedControl
                                        label="Achievements"
                                        options={[
                                            { value: 'all', label: 'All' },
                                            { value: 'has', label: 'Has' },
                                            { value: 'none', label: 'None' },
                                        ]}
                                        value={filters.achievements}
                                        onChange={(achievements) => onFiltersChange({ achievements: achievements as LibraryFilters['achievements'] })}
                                        disabled={loading}
                                    />
                                    <SegmentedControl
                                        label="Cover"
                                        options={[
                                            { value: 'all', label: 'All' },
                                            { value: 'has', label: 'Has' },
                                            { value: 'missing', label: 'Missing' },
                                        ]}
                                        value={filters.cover}
                                        onChange={(cover) => onFiltersChange({ cover: cover as LibraryFilters['cover'] })}
                                        disabled={loading}
                                    />
                                </div>
                            </FilterSection>

                            <FilterSection title="Years">
                                <div className="grid grid-cols-2 gap-3">
                                    <SelectField
                                        label="First played"
                                        options={firstPlayedYearOptions}
                                        value={filters.firstPlayedYear}
                                        onChange={(firstPlayedYear) => onFiltersChange({ firstPlayedYear })}
                                        disabled={loading}
                                    />
                                    <SelectField
                                        label="Completed"
                                        options={completedYearOptions}
                                        value={filters.completedYear}
                                        onChange={(completedYear) => onFiltersChange({ completedYear })}
                                        disabled={loading}
                                    />
                                </div>
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
                                        disabled={loading}
                                        className={[
                                            'flex min-h-12 w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-black transition disabled:cursor-wait disabled:opacity-55',
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
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={onClearFilters}
                            disabled={filterCount === 0 || loading}
                            className="inline-flex h-11 items-center gap-2 rounded-[16px] bg-white/10 px-4 text-sm font-black text-white/65 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                        >
                            <RotateCcw size={17} strokeWidth={3} />
                            {loading ? 'Updating' : 'Clear All'}
                        </button>
                        <button
                            type="button"
                            onClick={requestClose}
                            className="inline-flex h-11 items-center gap-2 rounded-[16px] bg-[#b7ff63] px-5 text-sm font-black text-black"
                        >
                            <Check size={17} strokeWidth={4} />
                            Done
                        </button>
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

function SelectField({
    label,
    options,
    value,
    onChange,
    disabled = false,
}: {
    label: string;
    options: Array<string | { value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    return (
        <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                className="h-12 min-w-0 rounded-[16px] border border-white/10 bg-white/10 px-3 text-sm font-black text-white outline-none transition hover:bg-white/15 focus:border-[#b7ff63] focus:bg-white/15 disabled:cursor-wait disabled:opacity-55"
            >
                {options.map((option) => {
                    const optionValue = typeof option === 'string' ? option : option.value;
                    const optionLabel = typeof option === 'string' ? option : option.label;

                    return (
                        <option
                            key={optionValue}
                            value={optionValue}
                            className="bg-black text-white"
                        >
                            {optionLabel}
                        </option>
                    );
                })}
            </select>
        </label>
    );
}

function SegmentedControl({
    label,
    options,
    value,
    onChange,
    disabled = false,
}: {
    label: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    return (
        <div className="grid gap-1.5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{label}</div>
            <div className="grid grid-cols-3 gap-1 rounded-[17px] bg-white/10 p-1">
                {options.map((option) => {
                    const selected = value === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            disabled={disabled}
                            className={[
                                'h-10 min-w-0 rounded-[13px] px-2 text-sm font-black transition disabled:cursor-wait disabled:opacity-55',
                                selected ? 'bg-[#b7ff63] text-black' : 'text-white/55 hover:bg-white/10 hover:text-white',
                            ].join(' ')}
                        >
                            <span className="block truncate">{option.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
