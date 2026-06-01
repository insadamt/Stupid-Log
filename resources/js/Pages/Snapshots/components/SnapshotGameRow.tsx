import { statusPillStyle } from '../../../statusColors';
import { SnapshotDetailsData } from '../../../types';
import { formatNumber } from '../formatters';

export default function SnapshotGameRow({ game }: { game: SnapshotDetailsData['games'][number] }) {
    return (
        <div className="grid h-full grid-cols-[1fr_150px_150px_110px] items-center border-t border-black/10 px-5 text-sm font-black">
            <span className="truncate">{game.title}</span>
            <span className="truncate text-black/50">{game.platform}</span>
            <span className="min-w-0">
                <span className="inline-flex max-w-full rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]" style={statusPillStyle(game)}>{game.status}</span>
            </span>
            <span className="text-right">{formatNumber(game.playtime_hours, 1)}</span>
        </div>
    );
}
