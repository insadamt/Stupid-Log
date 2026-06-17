import { Archive, CalendarDays, Layers3, ShieldCheck } from 'lucide-react';
import { GameCardData } from '../../../types';
import { Details } from '../types';
import { BlackTile } from './SharedUi';

export default function OverviewPanel({
    libraryGame,
    details,
}: {
    libraryGame: GameCardData;
    details: Details;
}) {
    return (
        <article className="overflow-hidden rounded-[40px] bg-black text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
            <div className="p-7">
                <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Game Page</div>
                        <h2 className="mt-2 text-[46px] font-black leading-[0.9] tracking-[-0.065em]">Description</h2>
                    </div>
                    <div className="grid size-[72px] shrink-0 place-items-center rounded-[25px] bg-[#b7ff63] text-black">
                        <ShieldCheck size={32} strokeWidth={3} />
                    </div>
                </div>

                <p className="mt-7 min-h-[210px] max-w-[780px] text-[21px] font-black leading-tight tracking-[-0.025em] text-white/84">
                    {libraryGame.description || 'No description.'}
                </p>
            </div>

            <div className="grid gap-3 border-t border-white/10 p-5 md:grid-cols-2">
                <BlackTile label="Publisher" value={libraryGame.publisher || 'Unknown'} icon={<Archive size={20} />} />
                <BlackTile label="Copies" value={details.ownership_copies.length} icon={<Layers3 size={20} />} />
                <BlackTile label="First Played" value={libraryGame.first_played_at || 'Not recorded'} icon={<CalendarDays size={20} />} />
                <BlackTile label="Last Played" value={libraryGame.last_played_at || 'Not recorded'} icon={<CalendarDays size={20} />} />
            </div>
        </article>
    );
}
