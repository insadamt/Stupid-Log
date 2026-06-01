import { SlidersHorizontal } from 'lucide-react';
import PlatformIcon from '../../../Components/PlatformIcon';
import { statusDotStyle, statusPillStyle } from '../../../statusColors';
import { SortMode } from '../types';

function sameStatus(a: string, b: string) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export default function LibraryFilters({
    filtersOpen,
    status,
    platform,
    sort,
    statusCounts,
    platformCounts,
    onStatusChange,
    onPlatformChange,
}: {
    filtersOpen: boolean;
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
    onStatusChange: (status: string) => void;
    onPlatformChange: (platform: string) => void;
}) {
    return (
        <aside
            className={[
                'min-w-0 overflow-hidden rounded-[34px] bg-black text-white shadow-[0_24px_70px_rgb(0_0_0/0.22)] transition-all duration-300',
                filtersOpen ? 'p-0 opacity-100' : 'pointer-events-none p-0 opacity-0',
            ].join(' ')}
        >
            <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/65">Control Deck</p>
                        <h2 className="mt-1 text-2xl font-black">Filters</h2>
                    </div>
                    <SlidersHorizontal size={24} strokeWidth={3} className="text-[#b7ff63]" />
                </div>

                <div className="sl-scrollbar min-h-0 overflow-y-auto p-5">
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Status</div>

                    <div className="grid gap-2">
                        {statusCounts.map((item) => {
                            const selected = sameStatus(status, item.label);

                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => onStatusChange(item.label)}
                                    className={[
                                        'flex min-h-12 items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-black transition',
                                        selected
                                            ? item.status ? 'text-black' : 'bg-[#b7ff63] text-black'
                                            : 'bg-white/10 text-white/58 hover:bg-white/15 hover:text-white',
                                    ].join(' ')}
                                    style={selected && item.status ? statusPillStyle({ status: item.status.name, status_color_hex: item.status.color_hex }) : undefined}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        {item.status && <span className="size-2.5 shrink-0 rounded-full" style={statusDotStyle({ status: item.status.name, status_color_hex: item.status.color_hex })} />}
                                        <span className="truncate">{item.label}</span>
                                    </span>
                                    <span>{item.count}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mb-3 mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Platform</div>

                    <div className="grid gap-2">
                        {platformCounts.map((item) => {
                            const selected = platform === item.label;

                            return (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => onPlatformChange(item.label)}
                                    className={[
                                        'flex min-h-12 items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-black transition',
                                        selected
                                            ? 'bg-[#b7ff63] text-black'
                                            : 'bg-white/10 text-white/58 hover:bg-white/15 hover:text-white',
                                    ].join(' ')}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <PlatformIcon platform={item.label} surface={selected ? 'lime' : 'dark'} size="sm" />
                                        <span className="truncate">{item.label}</span>
                                    </span>
                                    <span>{item.count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="border-t border-white/10 p-5">
                    <div className="rounded-[24px] bg-[#b7ff63] p-4 text-black">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">Active View</p>
                        <p className="mt-1 truncate text-xl font-black">{status} / {platform} / {sort}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
