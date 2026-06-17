import { router } from '@inertiajs/react';
import { ArchiveRestore, Download, RotateCcw, Upload } from 'lucide-react';
import { ChangeEvent, ReactNode, useState } from 'react';
import { readJsonResponse } from '../../http';
import { SettingsButton } from './SettingsControls';

type BackupPreview = {
    token: string;
    created_at: string;
    currency_code: string;
    counts: Record<string, number>;
    media_count: number;
};

type PortabilityState = 'idle' | 'previewing' | 'restoring';

export default function DataPortabilityPanel({
    resetting,
    onReset,
    onRestoreBusyChange,
}: {
    resetting: boolean;
    onReset: () => void;
    onRestoreBusyChange: (busy: boolean) => void;
}) {
    const [backup, setBackup] = useState<File | null>(null);
    const [preview, setPreview] = useState<BackupPreview | null>(null);
    const [confirmation, setConfirmation] = useState('');
    const [state, setState] = useState<PortabilityState>('idle');
    const [error, setError] = useState<string | null>(null);

    const canRestore = preview !== null && confirmation === 'RESTORE' && state === 'idle';

    function selectBackup(event: ChangeEvent<HTMLInputElement>) {
        setBackup(event.target.files?.[0] ?? null);
        setPreview(null);
        setConfirmation('');
        setError(null);
    }

    async function previewBackup() {
        if (!backup) return;

        setState('previewing');
        setError(null);
        const formData = new FormData();
        formData.append('backup', backup);

        try {
            const response = await fetch('/settings/data-portability/preview', {
                method: 'POST',
                headers: requestHeaders(),
                body: formData,
            });
            const payload = await readJsonResponse(
                response,
                'Backup validation failed. Server returned a non-JSON error.',
                'Backup upload rejected. The file is larger than the server upload limit.',
            );

            if (!response.ok) throw new Error(responseMessage(payload, 'Backup validation failed.'));
            setPreview(payload as BackupPreview);
        } catch (exception) {
            setPreview(null);
            setError(exception instanceof Error ? exception.message : 'Backup validation failed.');
        } finally {
            setState('idle');
        }
    }

    async function restoreBackup() {
        if (!canRestore || !preview) return;

        setState('restoring');
        setError(null);
        onRestoreBusyChange(true);

        try {
            const response = await fetch('/settings/data-portability/restore', {
                method: 'POST',
                headers: { ...requestHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: preview.token, confirmation }),
            });
            const payload = await readJsonResponse(response, 'Restore failed. Server returned a non-JSON error.');

            if (!response.ok) throw new Error(responseMessage(payload, 'Restore failed.'));
            router.visit('/settings?section=data');
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'Restore failed.');
            setState('idle');
            onRestoreBusyChange(false);
        }
    }

    return (
        <section id="settings-panel-data" role="tabpanel" aria-labelledby="settings-tab-data">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-black/35">Backup & recovery</div>
            <h2 className="mt-1 text-4xl font-black tracking-[-0.05em]">Data & Safety</h2>

            <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
                <ActionRow
                    title="Export backup"
                    description="Download your library, finance history, snapshots, and local covers."
                    action={(
                        <a
                            href="/settings/data-portability/export"
                            className="inline-flex h-11 items-center gap-2 rounded-[18px] bg-black px-5 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:text-[#b7ff63]"
                        >
                            <Download size={16} strokeWidth={3} />
                            Export
                        </a>
                    )}
                />

                <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-8 py-6">
                    <div>
                        <h3 className="text-lg font-black">Restore backup</h3>
                        <p className="mt-1 text-xs font-bold leading-relaxed text-black/40">
                            Replaces current library data after validation. Profile and credentials are preserved.
                        </p>
                    </div>

                    <div>
                        <div className="flex items-center gap-3">
                            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[18px] border border-black/15 px-4 text-xs font-black uppercase tracking-[0.12em] transition hover:bg-[#f4f7f1]">
                                <Upload size={15} strokeWidth={3} />
                                Choose file
                                <input type="file" accept=".zip,.stupidlog.zip,application/zip" onChange={selectBackup} className="sr-only" disabled={state !== 'idle'} />
                            </label>
                            <span className="max-w-[300px] truncate text-xs font-bold text-black/40">{backup?.name ?? 'No file selected'}</span>
                            <SettingsButton type="button" busy={state === 'previewing'} disabled={!backup || state !== 'idle'} onClick={previewBackup}>
                                {state === 'previewing' ? 'Validating' : 'Validate'}
                            </SettingsButton>
                        </div>

                        {preview && (
                            <div className="mt-4 border-l-4 border-[#b7ff63] bg-[#f6faf4] p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-black">Backup validated</p>
                                        <p className="mt-1 text-xs font-bold text-black/40">
                                            {new Date(preview.created_at).toLocaleString()} · {preview.currency_code} · {preview.counts.games ?? 0} games · {preview.counts.snapshot_runs ?? 0} snapshots
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={confirmation}
                                            onChange={(event) => setConfirmation(event.target.value)}
                                            placeholder="Type RESTORE"
                                            disabled={state !== 'idle'}
                                            className="h-11 w-40 rounded-[18px] border border-black/15 bg-white px-3 text-sm font-black outline-none focus:border-black"
                                        />
                                        <SettingsButton type="button" tone="danger" busy={state === 'restoring'} disabled={!canRestore} onClick={restoreBackup}>
                                            <ArchiveRestore size={16} strokeWidth={3} />
                                            Restore
                                        </SettingsButton>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && <div role="alert" className="mt-3 text-sm font-black text-[#b42318]">{error}</div>}
                    </div>
                </div>

                <ActionRow
                    title="Reset app"
                    description="Permanently erase the profile, credentials, library, snapshots, settings, and covers."
                    danger
                    action={(
                        <SettingsButton type="button" tone="danger" busy={resetting} disabled={state !== 'idle'} onClick={onReset}>
                            <RotateCcw size={16} strokeWidth={3} />
                            Reset app
                        </SettingsButton>
                    )}
                />
            </div>
        </section>
    );
}

function ActionRow({
    title,
    description,
    action,
    danger = false,
}: {
    title: string;
    description: string;
    action: ReactNode;
    danger?: boolean;
}) {
    return (
        <div className="grid grid-cols-[240px_minmax(0,1fr)_auto] items-center gap-8 py-6">
            <h3 className={`text-lg font-black ${danger ? 'text-[#b42318]' : ''}`}>{title}</h3>
            <p className="text-xs font-bold text-black/40">{description}</p>
            {action}
        </div>
    );
}

function requestHeaders(): Record<string, string> {
    return {
        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
        Accept: 'application/json',
    };
}

function responseMessage(payload: unknown, fallback: string): string {
    if (typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string') {
        return payload.message;
    }

    return fallback;
}
