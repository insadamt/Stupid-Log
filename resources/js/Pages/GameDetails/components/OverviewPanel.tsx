import { Archive, CalendarDays, Layers3, Link2, RadioTower, ShieldCheck } from 'lucide-react';
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
    const linkedFields = syncedFieldLabels(details.linked_progress);
    const sourceCount = libraryGame.linked_progress_summary?.source_count ?? 0;

    return (
        <article className="grid max-h-[min(690px,calc(100vh-218px))] min-h-[560px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[40px] bg-black text-white shadow-[0_34px_90px_rgb(0_0_0/0.24)]">
            <div className="px-7 pb-4 pt-7">
                <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Game Page</div>
                        <h2 className="mt-2 text-[46px] font-black leading-[0.9] tracking-[-0.065em]">Description</h2>
                    </div>
                    <div className="grid size-[72px] shrink-0 place-items-center rounded-[25px] bg-[#b7ff63] text-black">
                        <ShieldCheck size={32} strokeWidth={3} />
                    </div>
                </div>
            </div>

            <div className="sl-scrollbar min-h-0 overflow-y-auto px-7 pb-5 pr-5">
                <p className="max-w-[780px] text-[18px] font-black leading-snug text-white/82">
                    {libraryGame.description || 'No description.'}
                </p>

                {(details.linked_progress || sourceCount > 0) && (
                    <div className="mt-5 grid gap-2 pr-2">
                        {details.linked_progress && (
                            <div className="rounded-[20px] border border-[#b7ff63]/24 bg-[#b7ff63]/10 p-3.5">
                                <div className="grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
                                    <span className="inline-flex h-7 w-fit items-center gap-1.5 rounded-full bg-[#b7ff63] px-3 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                                        <Link2 size={13} strokeWidth={3} />
                                        Progress Linked
                                    </span>
                                    <span className="min-w-0 truncate text-sm font-black text-white/90" title={`${details.linked_progress.source.title} · ${details.linked_progress.source.platform}`}>
                                        {details.linked_progress.source.title} · {details.linked_progress.source.platform}
                                    </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {linkedFields.map((field) => (
                                        <span key={field} className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#b7ff63]">
                                            {field}
                                        </span>
                                    ))}
                                </div>
                                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/42">
                                    Local values stay separate; synced fields are copied from the source.
                                </p>
                            </div>
                        )}

                        {sourceCount > 0 && (
                            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#b7ff63]">
                                <RadioTower size={14} strokeWidth={3} />
                                Sync Source · {sourceCount} linked {sourceCount === 1 ? 'game' : 'games'}
                            </div>
                        )}
                    </div>
                )}
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

function syncedFieldLabels(link: Details['linked_progress']) {
    if (!link) return [];

    return [
        link.sync_playtime ? 'Playtime' : null,
        link.sync_achievements ? 'Achievements' : null,
        link.sync_dates ? 'Dates' : null,
        link.sync_status ? 'Status' : null,
    ].filter((field): field is string => field !== null);
}
