import { Dispatch, SetStateAction } from "react";
import CoverImage from "../components/CoverImage";
import { Draft, ManualDuplicate } from "../types";

export default function DuplicateCandidatesModal({
    duplicateCandidates,
    setDraft,
    setDuplicateCandidates,
    submit,
}: {
    duplicateCandidates: ManualDuplicate[];
    setDraft: Dispatch<SetStateAction<Draft>>;
    setDuplicateCandidates: Dispatch<SetStateAction<ManualDuplicate[]>>;
    submit: (forceCreateDuplicate?: boolean) => Promise<void>;
}) {
    return (
                        <div className="absolute inset-0 z-10 grid place-items-center bg-black/55 px-5">
                            <section className="w-full max-w-2xl rounded-[30px] bg-white p-6 text-black shadow-[0_32px_120px_rgb(0_0_0/0.4)]">
                                <div className="text-xs font-black uppercase tracking-[0.24em] text-black/35">Possible duplicate</div>
                                <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">This looks like an existing game.</h3>
                                <div className="mt-5 grid gap-3">
                                    {duplicateCandidates.map((game) => (
                                        <button
                                            key={game.id}
                                            type="button"
                                            onClick={() => {
                                                setDraft((current) => ({ ...current, existing_game_id: game.id, create_duplicate_anyway: false }));
                                                setDuplicateCandidates([]);
                                            }}
                                            className="grid grid-cols-[54px_1fr_auto] items-center gap-3 rounded-2xl border border-black/10 bg-[#f8faf4] p-3 text-left hover:border-black"
                                        >
                                            <CoverImage src={game.cover_url ?? ""} className="size-14 rounded-xl" />
                                            <div className="min-w-0">
                                                <div className="truncate text-lg font-black">{game.title}</div>
                                                <div className="mt-1 truncate text-xs font-bold text-black/45">{game.publisher || "Unknown publisher"} · {game.release_year || "Unknown year"}</div>
                                            </div>
                                            <span className="rounded-xl bg-black px-4 py-2 text-xs font-black text-white">Use existing</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-6 flex flex-wrap justify-end gap-3">
                                    <button type="button" onClick={() => setDuplicateCandidates([])} className="rounded-2xl bg-black/5 px-5 py-3 text-sm font-black text-black/55">Go back</button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDuplicateCandidates([]);
                                            void submit(true);
                                        }}
                                        className="rounded-2xl bg-black px-5 py-3 text-sm font-black text-white"
                                    >
                                        Create new anyway
                                    </button>
                                </div>
                            </section>
                        </div>
    );
}
