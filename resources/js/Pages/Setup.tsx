import { router } from '@inertiajs/react';
import { FormEvent, MouseEvent, useState } from 'react';

export default function Setup({ currencies }: { currencies: string[] }) {
    const [testing, setTesting] = useState<'igdb' | 'steam' | null>(null);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.post('/setup', Object.fromEntries(new FormData(event.currentTarget)));
    }

    async function testProvider(event: MouseEvent<HTMLButtonElement>, provider: 'igdb' | 'steam') {
        const form = event.currentTarget.form;
        if (!form) return;

        setTesting(provider);
        setTestResult(null);

        const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        const formData = new FormData(form);

        try {
            const response = await fetch(`/settings/${provider}/test`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    Accept: 'application/json',
                },
                body: formData,
            });
            const data = await response.json() as { ok: boolean; message: string };
            setTestResult({ ok: response.ok && data.ok, message: data.message });
        } catch (error) {
            setTestResult({ ok: false, message: error instanceof Error ? error.message : 'Credential test failed.' });
        } finally {
            setTesting(null);
        }
    }

    return (
        <main className="min-h-screen bg-[#eef1ea] p-6">
            <form onSubmit={submit} className="mx-auto grid w-full max-w-5xl gap-6 rounded-[8px] border border-black/10 bg-white p-8 shadow-[0_24px_80px_rgb(0_0_0/0.12)]">
                <div className="border-b border-black/10 pb-6">
                    <div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">First-use setup</div>
                    <h1 className="mt-2 text-5xl font-black tracking-[-0.05em]">Stupid Log Setup</h1>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-black/40">
                        Username
                        <input name="username" required defaultValue="Player One" className="rounded-[8px] border border-black/10 bg-[#f7f9f3] px-5 py-4 text-xl font-black normal-case tracking-normal outline-none focus:border-black" />
                    </label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-black/40">
                        Currency
                        <select name="currency_code" defaultValue="USD" className="rounded-[8px] border border-black/10 bg-[#f7f9f3] px-5 py-4 text-xl font-black normal-case tracking-normal outline-none focus:border-black">
                            {currencies.map((currency) => <option key={currency}>{currency}</option>)}
                        </select>
                    </label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-black/40">
                        IGDB Client ID
                        <input name="igdb_client_id" placeholder="IGDB client ID" className="rounded-[8px] border border-black/10 bg-[#f7f9f3] px-5 py-4 text-xl font-black normal-case tracking-normal outline-none focus:border-black" />
                    </label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-black/40">
                        IGDB Client Secret
                        <input name="igdb_client_secret" type="password" placeholder="IGDB client secret" className="rounded-[8px] border border-black/10 bg-[#f7f9f3] px-5 py-4 text-xl font-black normal-case tracking-normal outline-none focus:border-black" />
                    </label>
                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.18em] text-black/40 md:col-span-2">
                        Steam API Key
                        <input name="steam_api_key" type="password" placeholder="Optional Steam API key" className="rounded-[8px] border border-black/10 bg-[#f7f9f3] px-5 py-4 text-xl font-black normal-case tracking-normal outline-none focus:border-black" />
                    </label>
                </div>

                <div className="grid gap-3 rounded-[8px] border border-black/10 bg-[#f7f9f3] p-5">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-black/35">Test credentials</div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={(event) => void testProvider(event, 'igdb')} disabled={testing !== null} className="rounded-[8px] bg-black px-5 py-3 text-sm font-black text-white disabled:opacity-45">
                            {testing === 'igdb' ? 'Testing IGDB' : 'Test IGDB'}
                        </button>
                        <button type="button" onClick={(event) => void testProvider(event, 'steam')} disabled={testing !== null} className="rounded-[8px] bg-black px-5 py-3 text-sm font-black text-white disabled:opacity-45">
                            {testing === 'steam' ? 'Testing Steam' : 'Test Steam'}
                        </button>
                    </div>
                    {testResult && <div className={`text-sm font-black ${testResult.ok ? 'text-black' : 'text-[#b42318]'}`}>{testResult.message}</div>}
                </div>

                <div className="flex justify-end">
                    <button className="rounded-[8px] bg-black px-8 py-5 text-xl font-black text-white">Finish</button>
                </div>
            </form>
        </main>
    );
}
