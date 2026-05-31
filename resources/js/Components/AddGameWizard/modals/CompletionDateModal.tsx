import TextInput from "../components/TextInput";

export default function CompletionDateModal({
    completionDateDraft,
    setCompletionDateDraft,
    setPendingStatusId,
    applyCompletedStatus,
}: {
    completionDateDraft: string;
    setCompletionDateDraft: (value: string) => void;
    setPendingStatusId: (value: number | null) => void;
    applyCompletedStatus: () => void;
}) {
    return (
                        <div className="absolute inset-0 z-10 grid place-items-center bg-black/55 px-5">
                            <section className="w-full max-w-md rounded-[30px] bg-white p-6 text-black shadow-[0_32px_120px_rgb(0_0_0/0.4)]">
                                <div className="text-xs font-black uppercase tracking-[0.24em] text-black/35">Completion date</div>
                                <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">When did you finish it?</h3>
                                <p className="mt-3 text-sm font-bold text-black/50">Today is filled in automatically. Change it if the real completed date is different.</p>
                                <div className="mt-5">
                                    <TextInput value={completionDateDraft} onChange={(event) => setCompletionDateDraft(event.target.value)} type="date" className="w-full border-black/10 bg-[#f4f5ef] text-black" />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button type="button" onClick={() => setPendingStatusId(null)} className="rounded-2xl bg-black/5 px-5 py-3 text-sm font-black text-black/55">Cancel</button>
                                    <button type="button" onClick={applyCompletedStatus} className="rounded-2xl bg-black px-5 py-3 text-sm font-black text-white">Apply</button>
                                </div>
                            </section>
                        </div>
    );
}
