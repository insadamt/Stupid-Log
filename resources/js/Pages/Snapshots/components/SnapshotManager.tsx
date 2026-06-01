import { Link } from '@inertiajs/react';
import { Check, Clock3, Eye, Trash2 } from 'lucide-react';
import VirtualList from '../../../Components/VirtualList';
import { formatDate } from '../formatters';
import { Snapshot } from '../types';

function SnapshotCard({
    snapshot,
    active,
    confirming,
    deleting,
    onConfirm,
    onDelete,
}: {
    snapshot: Snapshot;
    active: boolean;
    confirming: boolean;
    deleting: boolean;
    onConfirm: () => void;
    onDelete: () => void;
}) {
    return (
        <article className={`min-w-0 overflow-hidden rounded-[26px] border p-4 transition ${active ? 'border-[#b7ff63] bg-black text-white shadow-[0_18px_42px_rgb(0_0_0/0.16)]' : 'border-black/10 bg-white/70 text-black hover:border-black/25'}`}>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0 overflow-hidden">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="shrink-0 text-4xl font-black tracking-[-0.05em]">{snapshot.year}</div>
                        <span className={`inline-flex min-w-0 shrink rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${snapshot.status === 'confirmed' ? 'bg-[#b7ff63] text-black' : active ? 'bg-white/10 text-white' : 'bg-black text-white'}`}>{snapshot.status}</span>
                    </div>
                    <div className={`mt-2 truncate text-[11px] font-black uppercase tracking-[0.16em] ${active ? 'text-white/35' : 'text-black/35'}`}>
                        {snapshot.status === 'confirmed' ? formatDate(snapshot.confirmed_at) : `Drafted ${formatDate(snapshot.created_at)}`}
                    </div>
                </div>
                <div className={`grid shrink-0 gap-1.5 ${snapshot.status === 'draft' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <Link href={`/snapshots/${snapshot.snapshot_id}`} preserveScroll className={`grid size-9 place-items-center rounded-[14px] ${active ? 'bg-[#b7ff63] text-black' : 'bg-black text-white'}`}>
                        <Eye size={18} strokeWidth={3} />
                    </Link>
                    {snapshot.status === 'draft' && (
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={confirming}
                            className="grid size-9 place-items-center rounded-[14px] bg-[#b7ff63] text-black transition disabled:opacity-40"
                        >
                            <Check size={18} strokeWidth={3} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={deleting}
                        className={`grid size-9 place-items-center rounded-[14px] transition disabled:opacity-40 ${active ? 'bg-white/10 text-red-200 ring-1 ring-white/10' : 'bg-[#fff0f0] text-[#d92d20] ring-1 ring-red-500/15'}`}
                    >
                        <Trash2 size={18} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </article>
    );
}

export default function SnapshotManager({
    sortedSnapshots,
    confirmedCount,
    draftCount,
    snapshotCursor,
    snapshotsLoading,
    selectedSnapshotId,
    confirmingId,
    deletingId,
    loadMoreSnapshots,
    confirm,
    destroy,
}: {
    sortedSnapshots: Snapshot[];
    confirmedCount: number;
    draftCount: number;
    snapshotCursor: string | null;
    snapshotsLoading: boolean;
    selectedSnapshotId: number | null;
    confirmingId: number | null;
    deletingId: number | null;
    loadMoreSnapshots: () => void;
    confirm: (snapshot: Snapshot) => void;
    destroy: (snapshot: Snapshot) => void;
}) {
    return (
        <aside className="grid min-h-0 grid-rows-[auto_1fr] rounded-[34px] bg-black p-5 text-white shadow-[0_24px_70px_rgb(0_0_0/0.18)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Archive runs</div>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">Snapshot List</h2>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-2xl bg-white/8 px-3 py-2 ring-1 ring-white/8">
                        <div className="text-lg font-black text-[#b7ff63]">{confirmedCount}</div>
                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Locked</div>
                    </div>
                    <div className="rounded-2xl bg-white/8 px-3 py-2 ring-1 ring-white/8">
                        <div className="text-lg font-black text-white">{draftCount}</div>
                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Drafts</div>
                    </div>
                </div>
            </div>
            <VirtualList
                items={sortedSnapshots}
                rowHeight={126}
                gap={12}
                hasMore={Boolean(snapshotCursor)}
                loading={snapshotsLoading}
                onNearEnd={loadMoreSnapshots}
                className="mt-5 min-h-0 overflow-y-auto pr-1"
                getKey={(snapshot) => snapshot.snapshot_id}
                empty={
                    <div className="grid min-h-[320px] place-items-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.04] p-6 text-center">
                        <div>
                            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#b7ff63] text-black"><Clock3 size={26} strokeWidth={3} /></div>
                            <div className="mt-4 text-2xl font-black">No snapshots yet</div>
                            <p className="mt-2 text-sm font-bold text-white/38">Create a draft capture for a year to start the archive.</p>
                        </div>
                    </div>
                }
                render={(snapshot) => (
                        <SnapshotCard
                            key={snapshot.snapshot_id}
                            snapshot={snapshot}
                            active={snapshot.snapshot_id === selectedSnapshotId}
                            confirming={confirmingId === snapshot.snapshot_id}
                            deleting={deletingId === snapshot.snapshot_id}
                            onConfirm={() => confirm(snapshot)}
                            onDelete={() => destroy(snapshot)}
                        />
                )}
            />
        </aside>
    );
}
