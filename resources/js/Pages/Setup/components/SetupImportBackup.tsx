import { ArrowLeft, ArchiveRestore, FileArchive, Loader2, Upload } from 'lucide-react';
import { ChangeEvent } from 'react';
import { BackupState } from '../types';
import Background from './Background';
import { ControlButton } from './SetupControls';

export default function SetupImportBackup({
    backup,
    state,
    error,
    selectBackup,
    importBackup,
    goBack,
}: {
    backup: File | null;
    state: BackupState;
    error: string | null;
    selectBackup: (event: ChangeEvent<HTMLInputElement>) => void;
    importBackup: () => Promise<void>;
    goBack: () => void;
}) {
    const busy = state !== 'idle';

    return (
        <section className="relative grid min-h-screen place-items-center px-5 py-8">
            <Background />
            <div className="relative grid w-full max-w-[760px] gap-6 rounded-[36px] border border-white/10 bg-black/42 p-7 shadow-[0_34px_120px_rgb(0_0_0/0.45)] backdrop-blur-md" data-wizard-shell>
                <header>
                    <div className="text-xs font-black uppercase text-[#b7ff63]">Import backup</div>
                    <h1 className="mt-2 text-5xl font-black leading-none">Bring back your log.</h1>
                    <p className="mt-3 max-w-[580px] text-sm font-bold leading-relaxed text-white/48">
                        Choose a Stupid Log backup. It will be validated and restored before anything is changed.
                    </p>
                </header>

                <label className="grid cursor-pointer place-items-center gap-4 rounded-[26px] border border-dashed border-white/18 bg-white/[0.05] px-6 py-10 text-center transition hover:bg-white/[0.09]">
                    <span className="grid size-16 place-items-center rounded-[20px] bg-[#b7ff63] text-black">
                        {backup ? <FileArchive size={29} strokeWidth={3} /> : <Upload size={29} strokeWidth={3} />}
                    </span>
                    <span>
                        <span className="block text-lg font-black">{backup?.name ?? 'Choose backup archive'}</span>
                        <span className="mt-1 block text-xs font-bold text-white/38">.stupidlog.zip</span>
                    </span>
                    <input
                        type="file"
                        accept=".zip,.stupidlog.zip,application/zip"
                        onChange={selectBackup}
                        disabled={busy}
                        className="sr-only"
                    />
                </label>

                {error && <div role="alert" className="rounded-[18px] bg-[#ffe0dd] px-4 py-3 text-sm font-black text-[#ad2c21]">{error}</div>}

                <footer className="flex items-center justify-between border-t border-white/10 pt-5">
                    <ControlButton tone="ghost" disabled={busy} onClick={goBack}>
                        <ArrowLeft size={17} strokeWidth={3} />
                        Back
                    </ControlButton>
                    <ControlButton tone="lime" disabled={!backup || busy} onClick={() => void importBackup()}>
                        {busy ? <Loader2 className="animate-spin" size={17} strokeWidth={3} /> : <ArchiveRestore size={17} strokeWidth={3} />}
                        {state === 'previewing' ? 'Validating' : state === 'restoring' ? 'Importing' : 'Import backup'}
                    </ControlButton>
                </footer>
            </div>
        </section>
    );
}
