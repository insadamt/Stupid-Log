import { Archive } from 'lucide-react';
import { useEffect, useState } from 'react';
import VirtualList from '../../../Components/VirtualList';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { SnapshotBestGame, SnapshotDetailsData } from '../../../types';
import { formatDate } from '../formatters';
import { DetailTab } from '../types';
import SnapshotActions from './SnapshotActions';
import SnapshotBestGames from './SnapshotBestGames';
import SnapshotGameRow from './SnapshotGameRow';

function CapturedGamesTable({
    games,
    hasMore,
    loading,
    onNearEnd,
}: {
    games: SnapshotDetailsData['games'];
    hasMore: boolean;
    loading: boolean;
    onNearEnd: () => void;
}) {
    return (
        <div className="grid h-full min-h-0 grid-rows-[auto_1fr] overflow-hidden rounded-[26px] border border-black/10">
            <div className="grid grid-cols-[1fr_150px_150px_110px] bg-black px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
                <span>Game</span>
                <span>Platform</span>
                <span>Status</span>
                <span className="text-right">Hours</span>
            </div>
            <VirtualList
                items={games}
                rowHeight={53}
                hasMore={hasMore}
                loading={loading}
                onNearEnd={onNearEnd}
                className="min-h-0 overflow-y-auto bg-white/55"
                getKey={(game) => `${game.library_game_id}-${game.title}`}
                empty={
                    <div className="grid h-full place-items-center p-8 text-center text-sm font-bold text-black/42">No captured games.</div>
                }
                render={(game) => <SnapshotGameRow game={game} />}
            />
        </div>
    );
}

export default function SnapshotInspector({
    selectedSnapshot,
    detailTab,
    setDetailTab,
    bestGameIds,
    toggleBestGame,
    resnap,
    resnapping,
    confirm,
    confirming,
    destroy,
    deleting,
}: {
    selectedSnapshot: SnapshotDetailsData | null;
    detailTab: DetailTab;
    setDetailTab: (tab: DetailTab) => void;
    bestGameIds: number[];
    toggleBestGame: (libraryGameId: number) => void;
    resnap: (snapshot: SnapshotDetailsData) => void;
    resnapping: boolean;
    confirm: (snapshot: SnapshotDetailsData) => void;
    confirming: boolean;
    destroy: (snapshot: SnapshotDetailsData) => void;
    deleting: boolean;
}) {
    const [bestGameQuery, setBestGameQuery] = useState('');
    const debouncedBestGameQuery = useDebouncedValue(bestGameQuery);
    const [capturedGames, setCapturedGames] = useState<SnapshotDetailsData['games']>(selectedSnapshot?.games ?? []);
    const [capturedGamesCursor, setCapturedGamesCursor] = useState<string | null>(selectedSnapshot?.games_next_cursor ?? null);
    const [capturedGamesLoading, setCapturedGamesLoading] = useState(false);
    const [eligibleBestGames, setEligibleBestGames] = useState<SnapshotBestGame[]>(selectedSnapshot?.eligible_best_games ?? []);
    const [eligibleBestGamesCursor, setEligibleBestGamesCursor] = useState<string | null>(selectedSnapshot?.eligible_best_games_next_cursor ?? null);
    const [eligibleBestGamesLoading, setEligibleBestGamesLoading] = useState(false);
    const selectedSnapshotContentKey = JSON.stringify({
        snapshot_id: selectedSnapshot?.snapshot_id ?? null,
        games: selectedSnapshot?.games ?? [],
        games_next_cursor: selectedSnapshot?.games_next_cursor ?? null,
        eligible_best_games: selectedSnapshot?.eligible_best_games ?? [],
        eligible_best_games_next_cursor: selectedSnapshot?.eligible_best_games_next_cursor ?? null,
    });

    useEffect(() => {
        setCapturedGames(selectedSnapshot?.games ?? []);
        setCapturedGamesCursor(selectedSnapshot?.games_next_cursor ?? null);
        setBestGameQuery('');
        setEligibleBestGames(selectedSnapshot?.eligible_best_games ?? []);
        setEligibleBestGamesCursor(selectedSnapshot?.eligible_best_games_next_cursor ?? null);
    }, [selectedSnapshotContentKey]);

    useEffect(() => {
        if (!selectedSnapshot || selectedSnapshot.status === 'confirmed') return;

        let canceled = false;
        const params = new URLSearchParams({
            query: debouncedBestGameQuery,
            limit: '80',
        });

        setEligibleBestGamesLoading(true);
        fetch(`/snapshots/${selectedSnapshot.snapshot_id}/eligible-best-games?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                if (canceled) return;
                setEligibleBestGames(payload.items ?? []);
                setEligibleBestGamesCursor(payload.next_cursor ?? null);
            })
            .finally(() => {
                if (!canceled) setEligibleBestGamesLoading(false);
            });

        return () => {
            canceled = true;
        };
    }, [debouncedBestGameQuery, selectedSnapshot?.snapshot_id, selectedSnapshot?.status]);

    if (!selectedSnapshot) {
        return (
            <section className="grid h-full min-h-0 place-items-center rounded-[34px] border border-dashed border-black/15 bg-white/45 p-8 text-center">
                <div>
                    <div className="mx-auto grid size-20 place-items-center rounded-[28px] bg-black text-[#b7ff63]">
                        <Archive size={34} strokeWidth={3} />
                    </div>
                    <div className="mt-5 text-4xl font-black tracking-[-0.05em]">Select a snapshot</div>
                </div>
            </section>
        );
    }

    function loadCapturedGames() {
        if (!selectedSnapshot || !capturedGamesCursor || capturedGamesLoading) return;

        const params = new URLSearchParams({
            cursor: capturedGamesCursor,
            limit: '80',
        });

        setCapturedGamesLoading(true);
        fetch(`/snapshots/${selectedSnapshot.snapshot_id}/games?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                setCapturedGames((current) => [...current, ...(payload.items ?? [])]);
                setCapturedGamesCursor(payload.next_cursor ?? null);
            })
            .finally(() => setCapturedGamesLoading(false));
    }

    function loadEligibleBestGames() {
        if (!selectedSnapshot || selectedSnapshot.status === 'confirmed' || !eligibleBestGamesCursor || eligibleBestGamesLoading) return;

        const params = new URLSearchParams({
            query: debouncedBestGameQuery,
            cursor: eligibleBestGamesCursor,
            limit: '80',
        });

        setEligibleBestGamesLoading(true);
        fetch(`/snapshots/${selectedSnapshot.snapshot_id}/eligible-best-games?${params.toString()}`, { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => {
                setEligibleBestGames((current) => [...current, ...(payload.items ?? [])]);
                setEligibleBestGamesCursor(payload.next_cursor ?? null);
            })
            .finally(() => setEligibleBestGamesLoading(false));
    }

    const bestGames = selectedSnapshot.status === 'confirmed'
        ? selectedSnapshot.best_games
        : eligibleBestGames;
    const normalizedBestGameQuery = bestGameQuery.trim().toLowerCase();
    const filteredBestGames = selectedSnapshot.status === 'confirmed' && normalizedBestGameQuery
        ? bestGames.filter((game) => [game.title, game.platform, game.status].some((value) => value.toLowerCase().includes(normalizedBestGameQuery)))
        : bestGames;

    return (
        <section className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-4 rounded-[34px] border border-black/10 bg-white/65 p-5 shadow-[0_20px_44px_rgb(0_0_0/0.07)]">
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/35">Snapshot manager</div>
                    <div className="mt-1 flex items-center gap-3">
                        <h2 className="text-5xl font-black tracking-[-0.06em]">{selectedSnapshot.year}</h2>
                        <span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${selectedSnapshot.status === 'confirmed' ? 'bg-[#b7ff63] text-black' : 'bg-black text-white'}`}>{selectedSnapshot.status}</span>
                    </div>
                    <p className="mt-2 truncate text-xs font-black uppercase tracking-[0.16em] text-black/35">
                        {selectedSnapshot.status === 'confirmed' ? `Confirmed ${formatDate(selectedSnapshot.confirmed_at)}` : `Drafted ${formatDate(selectedSnapshot.created_at)}`}
                    </p>
                </div>
                <SnapshotActions
                    selectedSnapshot={selectedSnapshot}
                    resnap={resnap}
                    resnapping={resnapping}
                    confirm={confirm}
                    confirming={confirming}
                    destroy={destroy}
                    deleting={deleting}
                />
            </header>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-black p-2">
                <div className="flex gap-2">
                    <button type="button" onClick={() => setDetailTab('best-games')} className={`rounded-[18px] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] ${detailTab === 'best-games' ? 'bg-[#b7ff63] text-black' : 'bg-white/8 text-white/45 hover:text-white'}`}>Best Games</button>
                    <button type="button" onClick={() => setDetailTab('captured-games')} className={`rounded-[18px] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] ${detailTab === 'captured-games' ? 'bg-[#b7ff63] text-black' : 'bg-white/8 text-white/45 hover:text-white'}`}>Captured Games</button>
                </div>
            </div>

            <div className="min-h-0 overflow-hidden">
                {detailTab === 'captured-games' ? (
                    <CapturedGamesTable
                        games={capturedGames}
                        hasMore={Boolean(capturedGamesCursor)}
                        loading={capturedGamesLoading}
                        onNearEnd={loadCapturedGames}
                    />
                ) : (
                    <SnapshotBestGames
                        selectedSnapshot={selectedSnapshot}
                        bestGameIds={bestGameIds}
                        bestGameQuery={bestGameQuery}
                        setBestGameQuery={setBestGameQuery}
                        bestGames={bestGames}
                        filteredBestGames={filteredBestGames}
                        eligibleBestGamesCursor={eligibleBestGamesCursor}
                        eligibleBestGamesLoading={eligibleBestGamesLoading}
                        loadEligibleBestGames={loadEligibleBestGames}
                        toggleBestGame={toggleBestGame}
                    />
                )}
            </div>
        </section>
    );
}
