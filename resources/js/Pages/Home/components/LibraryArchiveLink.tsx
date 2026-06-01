import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { useMainPageTransition } from '../../../Components/AppLayout';

export default function LibraryArchiveLink() {
    const { navigateWithTransition } = useMainPageTransition();

    return (
        <Link
            href="/library"
            onClick={(event) => navigateWithTransition(event, "/library")}
            className="group flex items-center justify-between rounded-[24px] bg-[#b7ff63] px-5 py-4 text-black transition hover:-translate-y-0.5"
        >
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/45">
                    Open
                </p>
                <p className="text-lg font-black">
                    Library Archive
                </p>
            </div>
            <span className="grid size-11 place-items-center rounded-full bg-black text-[#b7ff63] transition group-hover:rotate-45">
                <ArrowUpRight size={23} strokeWidth={3} />
            </span>
        </Link>
    );
}
