import { Database, KeyRound, Loader2, ShieldCheck, SkipForward } from 'lucide-react';
import { Provider, SetupForm, TestResult } from '../types';
import Background from './Background';
import { ControlButton, TestMessage, TextField } from './SetupControls';

export default function SetupImportedProviders({
    form,
    updateField,
    testProvider,
    testing,
    testResult,
    saving,
    error,
    saveAndOpen,
    skipAndOpen,
}: {
    form: SetupForm;
    updateField: <Key extends keyof SetupForm>(key: Key, value: SetupForm[Key]) => void;
    testProvider: (provider: Provider) => Promise<void>;
    testing: Provider | null;
    testResult: TestResult | null;
    saving: boolean;
    error: string | null;
    saveAndOpen: () => Promise<void>;
    skipAndOpen: () => void;
}) {
    const busy = saving || testing !== null;

    return (
        <section className="relative grid min-h-screen place-items-center px-5 py-8">
            <Background />
            <div className="relative grid w-full max-w-[840px] gap-6 rounded-[36px] border border-white/10 bg-black/42 p-7 shadow-[0_34px_120px_rgb(0_0_0/0.45)] backdrop-blur-md">
                <header>
                    <div className="text-xs font-black uppercase text-[#b7ff63]">Backup imported</div>
                    <h1 className="mt-2 text-5xl font-black leading-none">Connect providers?</h1>
                    <p className="mt-3 text-sm font-bold text-white/48">Provider secrets are never included in backups. Add them now or skip and open your restored library.</p>
                </header>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-4 rounded-[24px] bg-white/[0.06] p-5 ring-1 ring-white/10">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black">IGDB</h2>
                            <Database size={25} strokeWidth={3} />
                        </div>
                        <TextField label="Client ID" value={form.igdb_client_id} onChange={(value) => updateField('igdb_client_id', value)} />
                        <TextField label="Client Secret" type="password" value={form.igdb_client_secret} onChange={(value) => updateField('igdb_client_secret', value)} />
                        <ControlButton tone="ghost" disabled={busy} onClick={() => void testProvider('igdb')}>
                            {testing === 'igdb' ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                            Test IGDB
                        </ControlButton>
                    </div>

                    <div className="grid content-start gap-4 rounded-[24px] bg-white/[0.06] p-5 ring-1 ring-white/10">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black">Steam</h2>
                            <KeyRound size={25} strokeWidth={3} />
                        </div>
                        <TextField label="API Key" type="password" value={form.steam_api_key} onChange={(value) => updateField('steam_api_key', value)} />
                        <ControlButton tone="ghost" disabled={busy} onClick={() => void testProvider('steam')}>
                            {testing === 'steam' ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}
                            Test Steam
                        </ControlButton>
                    </div>
                </div>

                <TestMessage result={testResult} />
                {error && <div role="alert" className="rounded-[18px] bg-[#ffe0dd] px-4 py-3 text-sm font-black text-[#ad2c21]">{error}</div>}

                <footer className="flex items-center justify-end gap-3 border-t border-white/10 pt-5">
                    <ControlButton tone="ghost" disabled={busy} onClick={skipAndOpen}>
                        <SkipForward size={17} strokeWidth={3} />
                        Skip
                    </ControlButton>
                    <ControlButton tone="lime" disabled={busy} onClick={() => void saveAndOpen()}>
                        {saving ? <Loader2 className="animate-spin" size={17} /> : <KeyRound size={17} />}
                        {saving ? 'Saving' : 'Save and open'}
                    </ControlButton>
                </footer>
            </div>
        </section>
    );
}
