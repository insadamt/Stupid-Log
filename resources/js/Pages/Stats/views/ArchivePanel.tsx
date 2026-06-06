import PlatformIcon from '../../../Components/PlatformIcon';
import { statusPillStyle } from '../../../statusColors';
import { StatsArchiveGame } from '../../../types';
import { Empty } from '../components/Controls';
import { StatView } from '../types';
import { hours, money } from '../utils';

function ArchiveList({ title, sub, games, metric }: { title: string; sub: string; games: StatsArchiveGame[]; metric: 'playtime' | 'base' | 'paid' }) {
    const value = (game: StatsArchiveGame) => metric === 'playtime' ? hours(game.playtime_hours) : metric === 'base' ? money(game.base_value) : money(game.purchased_value);

    return (
        <section className="grid min-h-0 grid-rows-[auto_1fr] rounded-[28px] border border-black/10 bg-white/80 p-5 shadow-[0_22px_65px_rgb(9_14_12/0.07)]">
            <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-black/38">{sub}</div>
                <h3 className="mt-1 text-2xl font-black">{title}</h3>
            </div>
            <div className="mt-4 min-h-0 overflow-y-auto pr-1">
                <div className="grid gap-3">
                    {games.length === 0 && <Empty text="No games match this archive record yet." />}
                    {games.map((game, index) => (
                        <div key={`${game.library_game_id}-${title}`} className="grid grid-cols-[54px_1fr_auto] items-center gap-3 rounded-[22px] bg-[#f6faf4] p-3 ring-1 ring-black/6">
                            <div className="aspect-square overflow-hidden rounded-2xl bg-black/8">{game.cover_url ? <img src={game.cover_url} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-sm font-black text-black/35">#{index + 1}</div>}</div>
                            <div className="min-w-0">
                                <div className="truncate text-base font-black text-black">{game.title}</div>
                                <div className="mt-1 flex min-w-0 items-center gap-2 text-xs font-bold text-black/42">
                                    <PlatformIcon platform={game.platform} surface="light" size="xs" />
                                    <span className="truncate">{game.platform}</span>
                                    <span className="shrink-0">·</span>
                                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em]" style={statusPillStyle(game)}>{game.status}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-black text-black">{value(game)}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-black/35">#{index + 1}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default function ArchivePanel({ stats }: { stats: StatView }) {
    const unallocated = stats.archive?.unallocated_financial;
    const hasUnallocated = Boolean(unallocated && unallocated.total_unallocated_value > 0);
    const archiveLists = (
        <div className="grid min-h-0 gap-4 xl:grid-cols-3">
            <ArchiveList title="Most Played" sub="Playtime record" games={stats.archive?.most_played ?? []} metric="playtime" />
            <ArchiveList title="Biggest Base Price" sub="Base value record" games={stats.archive?.biggest_base_price ?? []} metric="base" />
            <ArchiveList title="Biggest Paid Price" sub="Paid value record" games={stats.archive?.biggest_paid_price ?? []} metric="paid" />
        </div>
    );

    return (
        <div className={hasUnallocated ? 'grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4' : 'h-full min-h-0'}>
            {hasUnallocated && unallocated && (
                <section className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] bg-black px-5 py-4 text-white">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b7ff63]/70">Outside game rows</p>
                        <p className="mt-1 text-lg font-black">Unallocated financial value</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm font-black">
                        <ArchiveFinancialMetric label="Subscriptions" value={unallocated.subscription_unallocated_value} />
                        <ArchiveFinancialMetric label="In-app purchases" value={unallocated.in_app_purchase_unallocated_value} />
                        <ArchiveFinancialMetric label="Total" value={unallocated.total_unallocated_value} highlight />
                    </div>
                </section>
            )}
            {archiveLists}
        </div>
    );
}

function ArchiveFinancialMetric({ label, value, highlight = false }: {
    label: string;
    value: number;
    highlight?: boolean;
}) {
    return (
        <div className={`rounded-[18px] px-4 py-2 ${highlight ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white'}`}>
            <span className="text-[10px] uppercase tracking-[0.14em] opacity-50">{label}</span>
            <span className="ml-2">{money(value)}</span>
        </div>
    );
}
