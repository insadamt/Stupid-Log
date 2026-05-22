import AppLayout from '../Components/AppLayout';
import { StatsData } from '../types';

export default function Stats({ stats }: { stats: StatsData }) {
    return (
        <AppLayout title="Stats">
            <section className="grid grid-cols-3 gap-6">
                {Object.entries(stats).map(([key, value]) => (
                    <article key={key} className="rounded-[28px] bg-[#b7ff63] p-8">
                        <div className="text-lg font-black uppercase text-black/50">{key.replaceAll('_', ' ')}</div>
                        <div className="mt-3 text-5xl font-black">{value}</div>
                        <div className="mt-6 h-4 rounded-full bg-white">
                            <div className="h-full rounded-full bg-black" style={{ width: `${Math.min(Number(value) || 0, 100)}%` }} />
                        </div>
                    </article>
                ))}
            </section>
        </AppLayout>
    );
}
