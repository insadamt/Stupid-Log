import { Filter, Plus, Search } from 'lucide-react';
import AddGameWizard from '../../../Components/AddGameWizard';
import { ReferenceData } from '../../../types';

export default function LibraryToolbar({
    query,
    controlsOpen,
    references,
    onQueryChange,
    onToggleControls,
}: {
    query: string;
    controlsOpen: boolean;
    references: ReferenceData;
    onQueryChange: (query: string) => void;
    onToggleControls: () => void;
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
                <button
                    type="button"
                    onClick={onToggleControls}
                    className={[
                        'inline-flex h-[46px] items-center gap-2 rounded-[17px] px-4 text-sm font-black transition',
                        controlsOpen ? 'bg-[#b7ff63] text-black' : 'bg-black text-white',
                    ].join(' ')}
                >
                    <Filter size={18} strokeWidth={3} />
                    Controls
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
