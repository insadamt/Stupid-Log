import { Link2, Save, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { statusPillStyle } from '../../../statusColors';
import { LinkedProgressCandidate, LinkedProgressForm } from '../types';

const syncOptions: Array<{ key: keyof Omit<LinkedProgressForm, 'source_library_game_id'>; label: string }> = [
    { key: 'sync_playtime', label: 'Playtime' },
    { key: 'sync_achievements', label: 'Achievements' },
    { key: 'sync_dates', label: 'Dates' },
    { key: 'sync_status', label: 'Status' },
];

export default function LinkedProgressPanel({
    form,
    query,
    candidates,
    errors,
    loading,
    saving,
    hasLink,
    source,
    setQuery,
    updateForm,
    submit,
    remove,
}: {
    form: LinkedProgressForm;
    query: string;
    candidates: LinkedProgressCandidate[];
    errors: Record<string, string>;
    loading: boolean;
    saving: boolean;
    hasLink: boolean;
    source: LinkedProgressCandidate | null;
    setQuery: (query: string) => void;
    updateForm: (patch: Partial<LinkedProgressForm>) => void;
    submit: () => void;
    remove: () => void;
}) {
    const selectedCandidate = candidates.find((candidate) => String(candidate.id) === form.source_library_game_id) ?? source;
    const selectedOptions = syncOptions.filter((option) => form[option.key]);

    return (
        <article className="overflow-hidden rounded-[34px] bg-black text-white shadow-[0_30px_78px_rgb(0_0_0/0.24)]">
            <div className="grid gap-4 p-6">
                <div className="flex items-center justify-between gap-5">
                    <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff63]">Linked Progress</div>
                        <h2 className="mt-1 text-[40px] font-black leading-none tracking-[-0.06em]">Sync source</h2>
                        <p className="mt-2 max-w-3xl text-base font-black leading-snug text-white/62">
                            Overwrite this entry's selected progress fields with another library game and keep them synced.
                        </p>
                    </div>
                    <div className="grid size-[64px] shrink-0 place-items-center rounded-[22px] bg-[#b7ff63] text-black">
                        <Link2 size={29} strokeWidth={3} />
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-[20px] border border-[#b7ff63]/25 bg-[#b7ff63]/10 px-4 py-3 text-sm font-black text-[#d8ff9f]">
                    <ShieldAlert size={18} className="shrink-0" />
                    <span>Selected fields will be overwritten on this entry. Synced progress is counted once in stats.</span>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
                    <section className="min-w-0 rounded-[26px] border border-white/10 bg-white/[0.05] p-4">
                        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">Source Game</div>
                        <label className="mb-3 flex h-11 items-center gap-3 rounded-[17px] bg-white/10 px-4 text-white/50">
                            <Search size={17} />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search library games..."
                                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/25"
                            />
                        </label>

                        <div className="grid max-h-[250px] gap-2 overflow-auto pr-1">
                            {loading && <div className="rounded-[18px] bg-white/10 px-4 py-3 text-sm font-black text-white/45">Loading candidates</div>}
                            {!loading && candidates.length === 0 && (
                                <div className="rounded-[18px] bg-white/10 px-4 py-3 text-sm font-black text-white/45">No eligible source games found.</div>
                            )}
                            {candidates.map((candidate) => {
                                const active = String(candidate.id) === form.source_library_game_id;

                                return (
                                    <button
                                        key={candidate.id}
                                        type="button"
                                        onClick={() => updateForm({ source_library_game_id: String(candidate.id) })}
                                        className={`rounded-[18px] px-4 py-3 text-left transition ${
                                            active ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/62 hover:bg-white/[0.16] hover:text-white'
                                        }`}
                                    >
                                        <div className="flex min-w-0 items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-base font-black">{candidate.title}</div>
                                                <div className={`mt-1 text-[10px] font-black uppercase tracking-[0.16em] ${active ? 'text-black/45' : 'text-white/30'}`}>
                                                    {candidate.platform}
                                                </div>
                                            </div>
                                            <span
                                                className="shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em]"
                                                style={statusPillStyle({ status: candidate.status, status_color_hex: candidate.status_color_hex })}
                                            >
                                                {candidate.status}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.candidates && <div className="mt-2 text-xs font-black text-[#ff6068]">{errors.candidates}</div>}
                        {errors.source_library_game_id && <div className="mt-2 text-xs font-black text-[#ff6068]">{errors.source_library_game_id}</div>}
                    </section>

                    <section className="grid min-w-0 content-start gap-4 rounded-[26px] border border-white/10 bg-white/[0.05] p-4">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">Sync Options</div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {syncOptions.map((option) => {
                                    const active = form[option.key];

                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => updateForm({ [option.key]: !active })}
                                            className={`rounded-[16px] px-4 py-3 text-left text-sm font-black transition ${
                                                active ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/55 hover:text-white'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.sync_options && <div className="mt-2 text-xs font-black text-[#ff6068]">{errors.sync_options}</div>}
                        </div>

                        <div className="rounded-[22px] bg-black/25 p-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Current Source</div>
                            {selectedCandidate ? (
                                <div className="mt-2">
                                    <div className="truncate text-2xl font-black tracking-[-0.04em]">{selectedCandidate.title}</div>
                                    <div className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/38">{selectedCandidate.platform}</div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {selectedOptions.length > 0
                                            ? selectedOptions.map((option) => (
                                                <span key={option.key} className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white/65">{option.label}</span>
                                            ))
                                            : <span className="text-sm font-black text-white/35">No sync options selected.</span>}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2 text-sm font-black text-white/35">Choose a source game.</div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <footer className="flex items-center justify-between gap-4 border-t border-white/10 px-6 py-4">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                    {hasLink ? 'This entry is currently linked.' : 'This entry uses local progress.'}
                </div>
                <div className="flex gap-3">
                    {hasLink && (
                        <button type="button" onClick={remove} disabled={saving} className="flex items-center gap-2 rounded-[17px] bg-white/10 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                            <Trash2 size={17} />
                            Remove
                        </button>
                    )}
                    <button type="button" onClick={submit} disabled={saving || !form.source_library_game_id} className="flex items-center gap-2 rounded-[17px] bg-[#b7ff63] px-5 py-3 text-sm font-black text-black disabled:opacity-50">
                        <Save size={17} />
                        {saving ? 'Saving' : hasLink ? 'Update Link' : 'Create Link'}
                    </button>
                </div>
            </footer>
        </article>
    );
}
