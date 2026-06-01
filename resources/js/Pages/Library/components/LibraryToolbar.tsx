import { Filter, Plus, Search, X } from 'lucide-react';
import AddGameWizard from '../../../Components/AddGameWizard';
import { ReferenceData } from '../../../types';
import { SortMode, SortOption } from '../types';

export default function LibraryToolbar({
    query,
    sort,
    filtersOpen,
    references,
    sortOptions,
    onQueryChange,
    onSortChange,
    onToggleFilters,
}: {
    query: string;
    sort: SortMode;
    filtersOpen: boolean;
    references: ReferenceData;
    sortOptions: SortOption[];
    onQueryChange: (query: string) => void;
    onSortChange: (sort: SortMode) => void;
    onToggleFilters: () => void;
}) {
    return (
        <section className="grid gap-3 rounded-[26px] border border-black/8 bg-[#e9eee9] p-2 shadow-[0_18px_44px_rgb(0_0_0/0.06)] xl:grid-cols-[minmax(360px,1fr)_auto]">
            <label className="flex h-[50px] min-w-0 items-center gap-3 rounded-[20px] bg-white px-5 text-black shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]">
                <Search size={24} strokeWidth={3} className="shrink-0 text-black/35" />
                <input
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder="Search title, platform, device, ownership"
                    className="min-w-0 flex-1 bg-transparent text-base font-black outline-none placeholder:text-black/28"
                />
            </label>

            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                {sortOptions.map((option) => {
                    const Icon = option.icon;
                    const active = sort === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onSortChange(option.value)}
                            className={[
                                'inline-flex h-[46px] items-center gap-2 rounded-[17px] px-4 text-sm font-black transition',
                                active ? 'bg-black text-[#b7ff63]' : 'bg-white text-black/50 hover:text-black',
                            ].join(' ')}
                        >
                            <Icon size={17} strokeWidth={3} />
                            {option.label}
                        </button>
                    );
                })}

                <button
                    type="button"
                    onClick={onToggleFilters}
                    className={[
                        'inline-flex h-[46px] items-center gap-2 rounded-[17px] px-4 text-sm font-black transition',
                        filtersOpen ? 'bg-[#b7ff63] text-black' : 'bg-black text-white',
                    ].join(' ')}
                >
                    {filtersOpen ? <X size={18} strokeWidth={3} /> : <Filter size={18} strokeWidth={3} />}
                    Filter
                </button>

                <AddGameWizard
                    references={references}
                    buttonClassName="group h-[46px] rounded-[17px] bg-[#b7ff63] px-5 text-sm font-black text-black shadow-[0_14px_28px_rgb(0_0_0/0.12)] transition hover:-translate-y-0.5"
                    buttonContent={
                        <span className="flex items-center gap-2">
                            <Plus size={18} strokeWidth={4} />
                            Add Game
                        </span>
                    }
                />
            </div>
        </section>
    );
}
