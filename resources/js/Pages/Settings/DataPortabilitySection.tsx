import { ArchiveRestore, Download, FileArchive, Loader2, Upload, X } from 'lucide-react';
import { ChangeEvent, ReactNode, useState } from 'react';

type ImportPreview = {
    restore_token: string;
    expires_at: string;
    metadata: {
        username: string;
        currency_code: string;
        exported_at: string;
        app_version: string;
        format_version: number;
    };
    counts: Record<string, number>;
};

function PortabilityButton({
    children,
    disabled,
    onClick,
    tone = 'dark',
}: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    tone?: 'dark' | 'green' | 'danger';
}) {
    const toneClass = {
        dark: 'bg-black text-white hover:bg-black/85',
        green: 'bg-[#b7ff63] text-black hover:brightness-95',
        danger: 'bg-[#d92d20] text-white hover:bg-[#b42318]',
    }[tone];

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`${toneClass} inline-flex h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-xs font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40`}
        >
            {children}
        </button>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function readableSectionName(section: string) {
    return section
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RestoreDialog({
    preview,
    restoring,
    onClose,
    onRestore,
}: {
    preview: ImportPreview;
    restoring: boolean;
    onClose: () => void;
    onRestore: (confirmation: string) => void;
}) {
    const [confirmation, setConfirmation] = useState('');

    return (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="restore-backup-title"
                className="w-full max-w-lg rounded-[28px] bg-[#fff8f6] p-6 shadow-[0_30px_100px_rgb(0_0_0/0.4)]"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b42318]/65">
                            Destructive restore
                        </div>
                        <h2 id="restore-backup-title" className="mt-1 text-3xl font-black tracking-[-0.05em]">
                            Replace your library?
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={restoring}
                        className="grid size-10 place-items-center rounded-full bg-black/5 text-black transition hover:bg-black/10 disabled:opacity-40"
                        aria-label="Close restore confirmation"
                    >
                        <X size={18} strokeWidth={3} />
                    </button>
                </div>

                <div className="mt-5 rounded-[18px] bg-[#ffe0dd] p-4 text-sm font-bold leading-relaxed text-[#8f2118]">
                    Importing will replace your current local library. Provider credentials configured on this device will be preserved.
                </div>

                <div className="mt-5 grid gap-2">
                    <label htmlFor="restore-confirmation" className="text-[11px] font-black uppercase tracking-[0.2em] text-black/45">
                        Type RESTORE to continue
                    </label>
                    <input
                        id="restore-confirmation"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        autoComplete="off"
                        className="h-12 rounded-[14px] border border-[#d92d20]/25 bg-white px-4 font-black outline-none focus:border-[#d92d20]"
                    />
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <PortabilityButton onClick={onClose} disabled={restoring}>
                        Cancel
                    </PortabilityButton>
                    <PortabilityButton
                        tone="danger"
                        disabled={restoring || confirmation !== 'RESTORE'}
                        onClick={() => onRestore(confirmation)}
                    >
                        {restoring ? <Loader2 className="animate-spin" size={16} strokeWidth={3} /> : <ArchiveRestore size={16} strokeWidth={3} />}
                        {restoring ? 'Restoring' : `Restore ${preview.metadata.username}`}
                    </PortabilityButton>
                </div>
            </div>
        </div>
    );
}

export default function DataPortabilitySection() {
    const [backupFile, setBackupFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [showRestoreDialog, setShowRestoreDialog] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    function selectBackup(event: ChangeEvent<HTMLInputElement>) {
        setBackupFile(event.target.files?.[0] ?? null);
        setPreview(null);
        setMessage(null);
        setShowRestoreDialog(false);
    }

    async function previewImport() {
        if (!backupFile) return;

        setPreviewing(true);
        setPreview(null);
        setMessage(null);
        const formData = new FormData();
        formData.append('backup', backupFile);

        try {
            const response = await fetch('/settings/data/import/preview', {
                method: 'POST',
                headers: requestHeaders(),
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(responseMessage(data, 'Unable to preview this backup.'));
            setPreview(data as ImportPreview);
        } catch (error) {
            setMessage({ ok: false, text: error instanceof Error ? error.message : 'Unable to preview this backup.' });
        } finally {
            setPreviewing(false);
        }
    }

    async function restoreBackup(confirmation: string) {
        if (!preview) return;

        setRestoring(true);
        setMessage(null);

        try {
            const response = await fetch('/settings/data/import/restore', {
                method: 'POST',
                headers: {
                    ...requestHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    restore_token: preview.restore_token,
                    confirmation,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(responseMessage(data, 'Unable to restore this backup.'));

            setMessage({ ok: true, text: data.message ?? 'Backup restored successfully.' });
            setPreview(null);
            setBackupFile(null);
            setShowRestoreDialog(false);
            window.setTimeout(() => window.location.reload(), 700);
        } catch (error) {
            setMessage({ ok: false, text: error instanceof Error ? error.message : 'Unable to restore this backup.' });
        } finally {
            setRestoring(false);
        }
    }

    return (
        <>
            <article className="rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-[0_18px_45px_rgb(9_14_12/0.06)] lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/8 pb-4">
                    <div className="max-w-2xl">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/38">Local backup</div>
                        <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">Data Portability</h2>
                        <p className="mt-2 text-sm font-bold leading-relaxed text-black/50">
                            Move your Stupid Log library to another device or create a local backup.
                        </p>
                    </div>
                    <div className="grid size-11 place-items-center rounded-[16px] bg-black text-[#b7ff63]">
                        <FileArchive size={22} strokeWidth={3} />
                    </div>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                    <section className="grid content-start gap-4 rounded-[20px] bg-black p-5 text-white">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b7ff63]/70">Full export</div>
                            <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">Export Backup</h3>
                            <p className="mt-2 text-sm font-bold leading-relaxed text-white/48">
                                Downloads your library, financial history, snapshots, and local covers. API credentials are never included.
                            </p>
                        </div>
                        <a
                            href="/settings/data/export"
                            className="inline-flex h-12 w-fit items-center justify-center gap-2 rounded-[14px] bg-[#b7ff63] px-5 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:brightness-95"
                        >
                            <Download size={16} strokeWidth={3} />
                            Export Backup
                        </a>
                    </section>

                    <section className="grid content-start gap-4 rounded-[20px] bg-[#f6faf4] p-5 ring-1 ring-black/8">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/38">Full restore</div>
                            <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">Import Backup</h3>
                            <p className="mt-2 text-sm font-bold text-[#b42318]">Importing will replace your current local library.</p>
                        </div>

                        <label className="grid min-h-24 cursor-pointer place-items-center rounded-[18px] border-2 border-dashed border-black/15 bg-white px-4 py-5 text-center transition hover:border-black/30">
                            <input
                                type="file"
                                accept=".stupidlog.zip,application/zip"
                                onChange={selectBackup}
                                className="sr-only"
                            />
                            <span className="grid gap-2">
                                <Upload className="mx-auto" size={22} strokeWidth={3} />
                                <span className="text-sm font-black">
                                    {backupFile?.name ?? 'Choose a .stupidlog.zip file'}
                                </span>
                            </span>
                        </label>

                        <div className="flex flex-wrap gap-2">
                            <PortabilityButton
                                onClick={previewImport}
                                disabled={!backupFile || previewing}
                                tone="green"
                            >
                                {previewing ? <Loader2 className="animate-spin" size={16} strokeWidth={3} /> : <FileArchive size={16} strokeWidth={3} />}
                                {previewing ? 'Reading Backup' : 'Preview Import'}
                            </PortabilityButton>
                        </div>

                        {message && (
                            <div className={`rounded-[16px] px-4 py-3 text-sm font-black ${message.ok ? 'bg-[#b7ff63] text-black' : 'bg-[#ffe0dd] text-[#ad2c21]'}`}>
                                {message.text}
                            </div>
                        )}
                    </section>
                </div>

                {preview && (
                    <section className="mt-5 rounded-[20px] border border-black/10 bg-white p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/38">Validated backup</div>
                                <h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">{preview.metadata.username}</h3>
                                <p className="mt-1 text-sm font-bold text-black/45">
                                    Exported {formatDate(preview.metadata.exported_at)} · Currency {preview.metadata.currency_code} · V{preview.metadata.app_version}
                                </p>
                            </div>
                            <PortabilityButton tone="danger" onClick={() => setShowRestoreDialog(true)}>
                                <ArchiveRestore size={16} strokeWidth={3} />
                                Restore Backup
                            </PortabilityButton>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                            {Object.entries(preview.counts)
                                .filter(([, count]) => count > 0)
                                .map(([section, count]) => (
                                    <div key={section} className="rounded-[14px] bg-[#f6faf4] p-3 ring-1 ring-black/6">
                                        <div className="text-xl font-black">{count}</div>
                                        <div className="mt-1 text-[9px] font-black uppercase tracking-[0.15em] text-black/38">
                                            {readableSectionName(section)}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </section>
                )}
            </article>

            {showRestoreDialog && preview && (
                <RestoreDialog
                    preview={preview}
                    restoring={restoring}
                    onClose={() => setShowRestoreDialog(false)}
                    onRestore={restoreBackup}
                />
            )}
        </>
    );
}

function requestHeaders(): Record<string, string> {
    return {
        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
        Accept: 'application/json',
    };
}

function responseMessage(data: unknown, fallback: string): string {
    if (!data || typeof data !== 'object') return fallback;
    const payload = data as { message?: string; errors?: Record<string, string[]> };
    const validationMessage = payload.errors ? Object.values(payload.errors).flat()[0] : null;

    return validationMessage ?? payload.message ?? fallback;
}
