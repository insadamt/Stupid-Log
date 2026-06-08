import { AlertTriangle, Loader2 } from "lucide-react";
import { Dispatch, RefObject, SetStateAction } from "react";
import CoverImage from "../components/CoverImage";
import Field from "../components/Field";
import Notice from "../components/Notice";
import TextArea from "../components/TextArea";
import TextInput from "../components/TextInput";
import { Draft, SteamEnrichmentStatus } from "../types";

export default function BasicsStep({
    enrichmentStatus,
    retryMetadata,
    coverPreview,
    coverInputRef,
    uploadCover,
    uploadingCover,
    providerCoverUrl,
    draft,
    localCoverPreview,
    setLocalCoverPreview,
    setDraft,
    coverError,
    update,
}: {
    enrichmentStatus: SteamEnrichmentStatus;
    retryMetadata: () => Promise<void>;
    coverPreview: string;
    coverInputRef: RefObject<HTMLInputElement | null>;
    uploadCover: (file: File) => Promise<void>;
    uploadingCover: boolean;
    providerCoverUrl: string;
    draft: Draft;
    localCoverPreview: string;
    setLocalCoverPreview: Dispatch<SetStateAction<string>>;
    setDraft: Dispatch<SetStateAction<Draft>>;
    coverError: string;
    update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
    return (
                                        <div className="grid gap-6">
                                            <div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Game Basics</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Clean the record.</h3></div>
                                            {enrichmentStatus === "loading" && <Notice><span className="inline-flex items-center gap-3"><Loader2 className="size-5 animate-spin" /> Loading Steam store details.</span></Notice>}
                                            {enrichmentStatus === "warning" && <Notice tone="danger"><div className="flex flex-wrap items-center justify-between gap-3"><span>Steam store details are still unavailable.</span><button type="button" onClick={() => void retryMetadata()} className="rounded-xl bg-black px-4 py-2 text-xs font-black text-white">Retry metadata</button></div></Notice>}
                                            <div className="grid gap-6 rounded-[28px] border border-black/10 bg-white/70 p-5 xl:grid-cols-[280px_1fr]">
                                                <div>
                                                    <div className="rounded-[24px] bg-black p-2">
                                                        <CoverImage src={coverPreview} className="h-[360px] w-full rounded-[18px]" />
                                                    </div>
                                                    <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCover(file); event.currentTarget.value = ""; }} />
                                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                                        <button type="button" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover} className="rounded-2xl bg-black px-4 py-3 text-sm font-black text-white disabled:opacity-40">{uploadingCover ? "Uploading" : "Upload"}</button>
                                                        <button type="button" onClick={() => { setLocalCoverPreview(""); setDraft((current) => ({ ...current, cover_url_original: providerCoverUrl, cover_path: "" })); }} disabled={!providerCoverUrl || (!draft.cover_path && !localCoverPreview && draft.cover_url_original === providerCoverUrl)} className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-black text-black/55 disabled:opacity-35">Reset</button>
                                                    </div>
                                                    {draft.cover_path && <div className="mt-3 rounded-2xl bg-[#b7ff63] px-4 py-3 text-sm font-black text-black">Cover uploaded</div>}
                                                    {coverError && <Notice tone="danger"><div className="flex items-center gap-2"><AlertTriangle size={18} /> {coverError}</div></Notice>}
                                                </div>
                                                <div className="grid gap-4 content-start">
                                                    <div className="grid gap-4 md:grid-cols-2"><Field label="Title"><TextInput value={draft.title} onChange={(event) => update("title", event.target.value)} /></Field><Field label="Publisher"><TextInput value={draft.publisher} onChange={(event) => update("publisher", event.target.value)} placeholder="Unknown" /></Field><Field label="Release Date"><TextInput value={draft.release_date} onChange={(event) => update("release_date", event.target.value)} type="date" /></Field></div>
                                                    <Field label="Description"><TextArea value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="No description" /></Field>
                                                </div>
                                            </div>
                                        </div>
    );
}
