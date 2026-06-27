import { Link } from '@inertiajs/react';
import { ChevronLeft, Edit3, Gauge, Trash2 } from 'lucide-react';

function libraryHref() {
    if (typeof window === 'undefined') return '/library';

    return `/library${window.location.search}`;
}

export default function DetailsHeader({
    title,
    onQuickEdit,
    onEdit,
    onDelete,
}: {
    title: string;
    onQuickEdit: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <header data-details-header className="mx-auto grid h-[72px] w-full max-w-[1430px] grid-cols-[96px_1fr_auto_auto_auto] overflow-hidden rounded-full bg-[#b7ff63] shadow-[0_18px_52px_rgb(0_0_0/0.12)]">
            <Link href={libraryHref()} className="grid place-items-center border-r border-black/15 transition hover:bg-black hover:text-[#b7ff63]" aria-label="Back to library">
                <ChevronLeft size={36} strokeWidth={4} />
            </Link>
            <div className="flex min-w-0 items-center justify-center px-8 text-center">
                <div className="truncate text-[36px] font-black leading-none tracking-[-0.05em]">{title}</div>
            </div>
            <button type="button" onClick={onQuickEdit} className="flex items-center justify-center gap-3 border-l border-black/15 px-8 text-lg font-black transition hover:bg-black hover:text-[#b7ff63]">
                <Gauge size={22} strokeWidth={3} />
                Quick Edit
            </button>
            <button type="button" onClick={onEdit} className="flex items-center justify-center gap-3 border-l border-black/15 px-8 text-lg font-black transition hover:bg-black hover:text-[#b7ff63]">
                <Edit3 size={22} strokeWidth={3} />
                Edit
            </button>
            <button type="button" onClick={onDelete} className="flex items-center justify-center gap-3 border-l border-black/15 px-8 text-lg font-black text-[#b91c1c] transition hover:bg-[#d72835] hover:text-white">
                <Trash2 size={22} strokeWidth={3} />
                Delete
            </button>
        </header>
    );
}
