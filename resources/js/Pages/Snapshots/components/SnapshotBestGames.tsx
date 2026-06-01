import { Search } from 'lucide-react';
import PlatformIcon from '../../../Components/PlatformIcon';
import VirtualList from '../../../Components/VirtualList';
import { statusPillStyle } from '../../../statusColors';
import { SnapshotBestGame, SnapshotDetailsData } from '../../../types';
import { formatNumber } from '../formatters';

function BestGameTile({
    game,
    selected = false,
    rank,
    disabled = false,
    onClick,
}: {
    game: SnapshotBestGame;
    selected?: boolean;
    rank?: number;
    disabled?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                'grid h-[86px] w-full grid-cols-[62px_1fr_auto] items-center gap-3 rounded-[22px] border p-3 text-left transition',
                selected ? 'border-[#b7ff63] bg-[#b7ff63] text-black' : 'border-black/10 bg-[#f6faf4] hover:border-black/25',
                disabled ? 'cursor-default' : '',
            ].join(' ')}
        >
            <div className="grid size-[62px] place-items-center overflow-hidden rounded-2xl bg-black text-xl font-black text-[#b7ff63]">
                {game.cover_url ? <img src={game.cover_url} alt="" className="size-full object-cover" /> : rank ?? '+'}
            </div>
            <div className="min-w-0">
                <div className="truncate text-sm font-black">{game.title}</div>
                <div className="mt-1 flex min-w-0 items-center gap-2 text-xs font-bold text-black/45">
                    <PlatformIcon platform={game.platform} surface="light" size="xs" />
                    <span className="truncate">{game.platform}</span>
                    <span className="shrink-0">·</span>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em]" style={statusPillStyle(game)}>{game.status}</span>
                </div>
            </div>
            <div className="text-right">
                {rank && <div className="text-2xl font-black">#{rank}</div>}
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-black/35">{formatNumber(game.playtime_hours, 1)}h</div>
            </div>
        </button>
    );
}

export default function SnapshotBestGames({
    selectedSnapshot,
    bestGameIds,
    bestGameQuery,
    setBestGameQuery,
    bestGames,
    filteredBestGames,
    eligibleBestGamesCursor,
    eligibleBestGamesLoading,
    loadEligibleBestGames,
    toggleBestGame,
}: {
    selectedSnapshot: SnapshotDetailsData;
    bestGameIds: number[];
    bestGameQuery: string;
    setBestGameQuery: (query: string) => void;
    bestGames: SnapshotBestGame[];
    filteredBestGames: SnapshotBestGame[];
    eligibleBestGamesCursor: string | null;
    eligibleBestGamesLoading: boolean;
    loadEligibleBestGames: () => void;
    toggleBestGame: (libraryGameId: number) => void;
}) {
    return (
        <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-3">
            <div className="rounded-[24px] bg-[#f6faf4] p-4 ring-1 ring-black/8">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-black/35">Best games played</div>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                    <h3 className="text-2xl font-black tracking-[-0.04em]">Top 5 of {selectedSnapshot.year}</h3>
                    <span className="rounded-full bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#b7ff63]">{selectedSnapshot.status === 'confirmed' ? selectedSnapshot.best_games.length : bestGameIds.length}/5 selected</span>
                </div>
                <p className="mt-1 text-sm font-bold text-black/45">
                    {selectedSnapshot.status === 'confirmed' ? 'Confirmed years are locked.' : 'Pick up to five games. Save Year stores these picks and locks the snapshot.'}
                </p>
            </div>
            <label className="flex h-12 items-center gap-3 rounded-[18px] bg-white px-4 text-black ring-1 ring-black/10">
                <Search size={18} strokeWidth={3} className="text-black/35" />
                <input
                    value={bestGameQuery}
                    onChange={(event) => setBestGameQuery(event.target.value)}
                    placeholder="Search favorites..."
                    className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none placeholder:text-black/30"
                />
            </label>
            <VirtualList
                items={filteredBestGames}
                rowHeight={86}
                gap={12}
                hasMore={selectedSnapshot.status === 'draft' && Boolean(eligibleBestGamesCursor)}
                loading={eligibleBestGamesLoading}
                onNearEnd={loadEligibleBestGames}
                className="min-h-0 overflow-y-auto pr-1"
                getKey={(game) => game.library_game_id}
                empty={
                    <div className="rounded-2xl border border-dashed border-black/15 bg-white/70 p-5 text-sm font-bold text-black/45">
                        {bestGames.length === 0
                            ? selectedSnapshot.status === 'confirmed' ? 'No best games were selected before this snapshot was confirmed.' : 'No eligible completed games for this year.'
                            : 'No favorite games match this search.'}
                    </div>
                }
                render={(game) => {
                    if (selectedSnapshot.status === 'confirmed') {
                        return <BestGameTile game={game} selected rank={game.rank} disabled />;
                    }

                    const rank = bestGameIds.indexOf(game.library_game_id) + 1;

                    return (
                        <BestGameTile
                            game={game}
                            selected={rank > 0}
                            rank={rank > 0 ? rank : undefined}
                            onClick={() => toggleBestGame(game.library_game_id)}
                        />
                    );
                }}
            />
        </div>
    );
}
