import { router } from '@inertiajs/react';
import {
    CalendarClock,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLayout from '../../Components/AppLayout';
import { SnapshotDetailsData } from '../../types';
import ManagerButton from './components/ManagerButton';
import SnapshotInspector from './components/SnapshotInspector';
import SnapshotManager from './components/SnapshotManager';
import { DetailTab, Snapshot } from './types';

export default function Snapshots({
    snapshots,
    snapshotsNextCursor = null,
    currentYear,
    confirmedCurrentYear,
    closedFinancialYear,
    selectedSnapshot = null,
}: {
    snapshots: Snapshot[];
    snapshotsNextCursor?: string | null;
    currentYear: number;
    confirmedCurrentYear: Snapshot | null;
    closedFinancialYear: number | null;
    liveStats: unknown;
    selectedSnapshot?: SnapshotDetailsData | null;
}) {
    const [snapshotItems, setSnapshotItems] = useState<Snapshot[]>(snapshots);
    const [snapshotCursor, setSnapshotCursor] = useState<string | null>(snapshotsNextCursor);
    const [snapshotsLoading, setSnapshotsLoading] = useState(false);
    const [snapshotYear, setSnapshotYear] = useState(String(currentYear));
    const [creating, setCreating] = useState(false);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [resnappingId, setResnappingId] = useState<number | null>(null);
    const [bestGameIds, setBestGameIds] = useState<number[]>([]);
    const [detailTab, setDetailTab] = useState<DetailTab>('best-games');

    useEffect(() => {
        setSnapshotItems(snapshots);
        setSnapshotCursor(snapshotsNextCursor);
    }, [snapshots, snapshotsNextCursor]);

    const sortedSnapshots = [...snapshotItems].sort((a, b) => b.year - a.year || b.snapshot_id - a.snapshot_id);
    const drafts = snapshotItems.filter((snapshot) => snapshot.status === 'draft');
    const confirmed = snapshotItems.filter((snapshot) => snapshot.status === 'confirmed');
    const selectedYear = Number(snapshotYear);
    const selectedYearIsValid = Number.isInteger(selectedYear) && selectedYear >= 1970 && selectedYear <= 2100;
    const selectedYearIsClosed = closedFinancialYear !== null && selectedYear <= closedFinancialYear;
    const selectedYearExisting = snapshotItems.find((snapshot) => snapshot.year === selectedYear) ?? null;
    const selectedYearConfirmed = selectedYearExisting?.status === 'confirmed' || confirmedCurrentYear?.year === selectedYear;
    const selectedSnapshotId = selectedSnapshot?.snapshot_id ?? null;
    const selectedSnapshotBestGamesKey = selectedSnapshot?.best_games.map((game) => game.library_game_id).join(',') ?? '';

    useEffect(() => {
        setBestGameIds(selectedSnapshot?.best_games.map((game) => game.library_game_id) ?? []);
        setDetailTab('best-games');
    }, [selectedSnapshot?.snapshot_id, selectedSnapshotBestGamesKey]);

    function createDraft() {
        if (!selectedYearIsValid || selectedYearExisting || selectedYearIsClosed) return;

        setCreating(true);
        router.post('/snapshots', { year: selectedYear }, {
            preserveScroll: true,
            onFinish: () => setCreating(false),
        });
    }

    function confirm(snapshot: Snapshot | SnapshotDetailsData) {
        if (!window.confirm(`Confirming ${snapshot.year} will close ${snapshot.year} and all previous years. You will not be able to add IAPs, subscriptions, or snapshots for ${snapshot.year} or earlier.`)) {
            return;
        }

        setConfirmingId(snapshot.snapshot_id);

        if (selectedSnapshot && snapshot.snapshot_id === selectedSnapshot.snapshot_id && snapshot.status === 'draft') {
            router.patch(`/snapshots/${snapshot.snapshot_id}/best-games`, {
                library_game_ids: bestGameIds,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    router.patch(`/snapshots/${snapshot.snapshot_id}/confirm`, {}, {
                        preserveScroll: true,
                        onFinish: () => setConfirmingId(null),
                    });
                },
                onError: () => setConfirmingId(null),
            });

            return;
        }

        router.patch(`/snapshots/${snapshot.snapshot_id}/confirm`, {}, {
            preserveScroll: true,
            onFinish: () => setConfirmingId(null),
        });
    }

    function destroy(snapshot: Snapshot | SnapshotDetailsData) {
        if (!window.confirm(`Delete the ${snapshot.year} ${snapshot.status} snapshot?`)) return;

        setDeletingId(snapshot.snapshot_id);
        router.delete(`/snapshots/${snapshot.snapshot_id}`, {
            preserveScroll: false,
            onFinish: () => setDeletingId(null),
        });
    }

    function shiftYear(delta: number) {
        const next = Number(snapshotYear) + delta;
        if (Number.isInteger(next) && next >= 1970 && next <= 2100) {
            setSnapshotYear(String(next));
        }
    }

    function resnap(snapshot: SnapshotDetailsData) {
        if (!window.confirm(`Replace the ${snapshot.year} draft with the current library capture? Best games selected on this draft will be cleared.`)) return;

        setResnappingId(snapshot.snapshot_id);
        router.patch(`/snapshots/${snapshot.snapshot_id}/resnap`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.visit(`/snapshots/${snapshot.snapshot_id}`, {
                    preserveScroll: true,
                    preserveState: false,
                    replace: true,
                });
            },
            onFinish: () => setResnappingId(null),
        });
    }

    function toggleBestGame(libraryGameId: number) {
        setBestGameIds((current) => {
            if (current.includes(libraryGameId)) return current.filter((id) => id !== libraryGameId);
            if (current.length >= 5) return current;
            return [...current, libraryGameId];
        });
    }

    function loadMoreSnapshots() {
        if (!snapshotCursor || snapshotsLoading) return;

        const params = new URLSearchParams({
            cursor: snapshotCursor,
            limit: '30',
        });

        setSnapshotsLoading(true);
        fetch(`/snapshots-feed?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                setSnapshotItems((current) => [...current, ...(payload.items ?? [])]);
                setSnapshotCursor(payload.next_cursor ?? null);
            })
            .finally(() => setSnapshotsLoading(false));
    }

    const yearMessage = selectedYearExisting
        ? `${selectedYear} ${selectedYearExisting.status} exists`
        : selectedYearIsClosed
            ? `${selectedYear} is closed by the ${closedFinancialYear} snapshot`
        : selectedYearIsValid
            ? 'Ready for draft capture'
            : 'Year must be 1970-2100';

    return (
        <AppLayout title="Snapshots" lockViewport>
            <section className="h-full overflow-hidden px-4 py-3 md:pl-[88px] md:pr-6">
                <div className="mx-auto grid h-full max-w-[1540px] grid-rows-[minmax(120px,auto)_minmax(0,1fr)] gap-4 overflow-hidden">
                    <header className="min-w-0 rounded-[34px] bg-black px-6 py-5 text-white shadow-[0_24px_80px_rgb(0_0_0/0.20)]">
                        <div className="grid h-full min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,auto)] xl:items-center">
                            <div className="min-w-0">
                                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]/70">Snapshot manager</div>
                                <div className="mt-1 flex items-end gap-4">
                                    <h1 className="text-6xl font-black leading-none tracking-[-0.06em]">Snapshots</h1>
                                    <p className="mb-2 hidden max-w-2xl truncate text-sm font-bold text-white/38 xl:block">Create, inspect, resnap, confirm, and delete yearly captures. No stats dashboard here.</p>
                                </div>
                            </div>
                            <div className="grid min-w-0 gap-2">
                                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 rounded-[24px] bg-white/8 p-2">
                                    <button type="button" onClick={() => shiftYear(-1)} className="grid size-11 place-items-center rounded-[18px] bg-black text-white ring-1 ring-white/10 transition hover:text-[#b7ff63]"><ChevronLeft size={18} /></button>
                                    <input
                                        type="number"
                                        min={1970}
                                        max={2100}
                                        value={snapshotYear}
                                        onChange={(event) => setSnapshotYear(event.target.value)}
                                        className="h-11 w-[110px] rounded-[18px] border border-white/10 bg-white/8 px-4 text-center text-lg font-black text-white outline-none focus:border-[#b7ff63]"
                                    />
                                    <button type="button" onClick={() => shiftYear(1)} className="grid size-11 place-items-center rounded-[18px] bg-black text-white ring-1 ring-white/10 transition hover:text-[#b7ff63]"><ChevronRight size={18} /></button>
                                    <ManagerButton onClick={createDraft} disabled={creating || !!selectedYearExisting || selectedYearConfirmed || selectedYearIsClosed || !selectedYearIsValid} tone="green">
                                        <CalendarClock size={16} strokeWidth={3} />
                                        {creating ? 'Creating' : 'Create Draft'}
                                    </ManagerButton>
                                </div>
                                <div className="text-right text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{yearMessage}</div>
                            </div>
                        </div>
                    </header>

                    <main className="grid min-h-0 min-w-0 gap-4 overflow-hidden rounded-[34px] border border-black/8 bg-white/35 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.58)] xl:grid-cols-[minmax(340px,430px)_minmax(0,1fr)]">
                        <SnapshotManager
                            sortedSnapshots={sortedSnapshots}
                            confirmedCount={confirmed.length}
                            draftCount={drafts.length}
                            snapshotCursor={snapshotCursor}
                            snapshotsLoading={snapshotsLoading}
                            selectedSnapshotId={selectedSnapshotId}
                            confirmingId={confirmingId}
                            deletingId={deletingId}
                            loadMoreSnapshots={loadMoreSnapshots}
                            confirm={confirm}
                            destroy={destroy}
                        />

                        <SnapshotInspector
                            selectedSnapshot={selectedSnapshot}
                            detailTab={detailTab}
                            setDetailTab={setDetailTab}
                            bestGameIds={bestGameIds}
                            toggleBestGame={toggleBestGame}
                            resnap={resnap}
                            resnapping={selectedSnapshot ? resnappingId === selectedSnapshot.snapshot_id : false}
                            confirm={confirm}
                            confirming={selectedSnapshot ? confirmingId === selectedSnapshot.snapshot_id : false}
                            destroy={destroy}
                            deleting={selectedSnapshot ? deletingId === selectedSnapshot.snapshot_id : false}
                        />
                    </main>
                </div>
            </section>
        </AppLayout>
    );
}
