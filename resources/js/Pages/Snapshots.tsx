import { router } from '@inertiajs/react';
import AppLayout from '../Components/AppLayout';

type Snapshot = { id: number; year: number; status: string; confirmed_at?: string | null };

export default function Snapshots({ snapshots, currentYear }: { snapshots: Snapshot[]; currentYear: number }) {
    return (
        <AppLayout title="Snapshots">
            <section>
                <div className="mb-10 flex items-center justify-between rounded-[32px] bg-[#b7ff63] p-8">
                    <div className="text-5xl font-black">Yearly Archive</div>
                    <button onClick={() => router.post('/snapshots', { year: currentYear })} className="rounded-[18px] bg-black px-8 py-5 text-2xl font-black text-white">Create Pre-Snapshot</button>
                </div>
                <div className="grid gap-5">
                    {snapshots.map((snapshot) => (
                        <article key={snapshot.id} className="flex items-center justify-between rounded-[24px] bg-white p-6 text-3xl font-black">
                            <span>{snapshot.year}</span>
                            <span>{snapshot.status}</span>
                            {snapshot.status === 'draft' && (
                                <button onClick={() => router.patch(`/snapshots/${snapshot.id}/confirm`)} className="rounded-[16px] bg-[#b7ff63] px-8 py-4">Confirm</button>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        </AppLayout>
    );
}
