import {
    Activity,
    CheckCircle2,
    Clock3,
    Gamepad2,
    Plus,
    Trophy,
    WalletCards,
} from 'lucide-react';
import AddGameWizard from '../../../Components/AddGameWizard';
import { ReferenceData, StatsData } from '../../../types';
import { moneyFormat, numberFormat } from '../formatters';
import StatTile from './StatTile';

export default function BriefPanel({
    stats,
    references,
}: {
    stats: StatsData;
    references: ReferenceData;
}) {
    const playtime = numberFormat(stats.playtime_hours, 1);
    const achievementProgress = Math.min(
        Math.max(Number(stats.achievement_progress ?? 0), 0),
        100,
    );
    const topPlatform = stats.breakdowns.platforms[0];

    return (
        <aside className="flex h-full min-h-0 w-full flex-col gap-5 self-stretch">
            <section className="relative overflow-hidden rounded-[44px] bg-[#b7ff63] p-7 shadow-[0_24px_42px_rgb(0_0_0/0.1)]">
                <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/20 blur-2xl" />
                <div className="relative flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[12px] font-black uppercase tracking-[0.28em] text-black/45">
                            Live Brief
                        </p>
                        <h2 className="mt-2 text-[47px] font-black leading-none tracking-[0.06em]">
                            Brief
                        </h2>
                    </div>
                    <div className="grid size-14 place-items-center rounded-[22px] bg-black text-[#b7ff63]">
                        <Activity size={30} strokeWidth={3} />
                    </div>
                </div>

                <div className="relative mt-7 grid grid-cols-2 gap-3">
                    <StatTile
                        label="Games"
                        value={stats.library_games ?? 0}
                        icon={Gamepad2}
                    />
                    <StatTile
                        label="Complete"
                        value={stats.completed ?? 0}
                        icon={CheckCircle2}
                    />
                    <StatTile
                        label="Hours"
                        value={`${playtime}H`}
                        icon={Clock3}
                        dark
                    />
                    <StatTile
                        label="Value"
                        value={moneyFormat(stats.base_value)}
                        icon={WalletCards}
                        dark
                    />
                </div>

                <div className="relative mt-5 rounded-[28px] bg-black p-5 text-white">
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#b7ff63]">
                                Achievement Sync
                            </p>
                            <div className="mt-2 text-[25px] font-black leading-none">
                                {stats.earned_achievements ?? 0} /{" "}
                                {stats.total_achievements ?? 0}
                            </div>
                        </div>
                        <Trophy size={36} strokeWidth={3} />
                    </div>
                    <div className="h-4 overflow-hidden rounded-full bg-white/14">
                        <div
                            className="h-full rounded-full bg-[#b7ff63]"
                            style={{ width: `${achievementProgress}%` }}
                        />
                    </div>
                </div>
            </section>

            <section className="grid flex-1 min-h-0 content-between rounded-[36px] bg-black p-5 text-white shadow-[0_18px_36px_rgb(0_0_0/0.16)]">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">
                        Archive Pulse
                    </p>
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between rounded-[22px] bg-white/10 px-4 py-3">
                            <span className="text-sm font-black text-white/48">
                                Top platform
                            </span>
                            <span className="font-black">
                                {topPlatform?.label ?? "No data"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded-[22px] bg-white/10 px-4 py-3">
                            <span className="text-sm font-black text-white/48">
                                Unique titles
                            </span>
                            <span className="font-black">
                                {stats.unique_titles ?? 0}
                            </span>
                        </div>
                        <div className="flex items-center justify-between rounded-[22px] bg-white/10 px-4 py-3">
                            <span className="text-sm font-black text-white/48">
                                Ownership copies
                            </span>
                            <span className="font-black">
                                {stats.ownership_copies ?? 0}
                            </span>
                        </div>
                    </div>
                </div>

                <AddGameWizard
                    references={references}
                    buttonClassName="group mt-5 h-[72px] w-full rounded-[999px] bg-[#b7ff63] px-5 text-left shadow-[0_18px_30px_rgb(0_0_0/0.18)] transition hover:-translate-y-1 hover:scale-[1.01]"
                    buttonContent={
                        <span className="flex h-full w-full items-center justify-center gap-4">
                            <span className="grid size-[44px] place-items-center rounded-full bg-black text-[#b7ff63] transition group-hover:rotate-90">
                                <Plus size={30} strokeWidth={4} />
                            </span>
                            <span className="text-[24px] font-black text-black">
                                Add Game
                            </span>
                        </span>
                    }
                />
            </section>
        </aside>
    );
}
