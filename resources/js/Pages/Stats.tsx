import { BarChart3, Clock3, Copy, Gamepad2, Sparkles, Trophy, Wallet } from 'lucide-react';
import AppLayout from '../Components/AppLayout';
import { StatsData } from '../types';

const cards = [
    { key: 'library_games', label: 'Library Games', icon: Gamepad2, note: 'Tracked platform entries' },
    { key: 'unique_titles', label: 'Unique Titles', icon: Sparkles, note: 'Distinct games' },
    { key: 'ownership_copies', label: 'Ownership Copies', icon: Copy, note: 'Digital, physical, subscriptions' },
    { key: 'completed', label: 'Completed', icon: Trophy, note: 'Completed or 100%' },
    { key: 'playtime_hours', label: 'Playtime', icon: Clock3, note: 'Total hours' },
    { key: 'earned_achievements', label: 'Achievements', icon: BarChart3, note: 'Earned achievements' },
    { key: 'base_value', label: 'Base Value', icon: Wallet, note: 'Collection base value' },
    { key: 'purchased_value', label: 'Paid Value', icon: Wallet, note: 'Real purchase value' },
] as const;

function formatValue(value: unknown) {
    const number = Number(value ?? 0);
    if (!Number.isFinite(number)) return '0';
    return number.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export default function Stats({ stats }: { stats: StatsData }) {
    return (
        <AppLayout title="Stats">
            <section className="pl-[88px]">
                <div className="mb-8 rounded-[42px] bg-black p-8 text-[#b7ff63] shadow-2xl">
                    <div className="text-sm font-black uppercase tracking-[0.32em] text-[#b7ff63]/55">Archive intelligence</div>
                    <h1 className="mt-3 text-[56px] font-black leading-none">Collection Stats</h1>
                    <p className="mt-4 max-w-3xl text-xl font-black text-white/60">A quick inspection panel for progress, value, completion, and library growth.</p>
                </div>

                <div className="grid grid-cols-4 gap-6">
                    {cards.map((card) => {
                        const Icon = card.icon;
                        const value = stats[card.key as keyof StatsData];
                        const width = Math.min(Number(value) || 0, 100);

                        return (
                            <article key={card.key} className="rounded-[34px] bg-[#b7ff63] p-6 shadow-[0_20px_36px_rgb(0_0_0/0.08)] transition hover:-translate-y-1">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="text-sm font-black uppercase tracking-[0.2em] text-black/45">{card.label}</div>
                                        <div className="mt-3 text-[42px] font-black leading-none">{formatValue(value)}</div>
                                    </div>
                                    <div className="grid size-14 place-items-center rounded-[20px] bg-black text-[#b7ff63]">
                                        <Icon size={30} strokeWidth={3} />
                                    </div>
                                </div>
                                <p className="mt-5 min-h-12 text-lg font-black leading-tight text-black/55">{card.note}</p>
                                <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/70">
                                    <div className="h-full rounded-full bg-black" style={{ width: `${width}%` }} />
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
        </AppLayout>
    );
}
