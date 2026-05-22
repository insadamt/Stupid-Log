import { router } from '@inertiajs/react';
import { FormEvent } from 'react';
import AppLayout from '../Components/AppLayout';

export default function Settings({ user, currencies }: { user: { username: string; settings?: { currency_code: string } }; currencies: string[] }) {
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.patch('/settings', Object.fromEntries(new FormData(event.currentTarget)));
    }

    return (
        <AppLayout title="Settings">
            <section className="pl-[88px]">
                <div className="mb-8 rounded-[42px] bg-black p-8 text-[#b7ff63] shadow-2xl">
                    <div className="text-sm font-black uppercase tracking-[0.32em] text-[#b7ff63]/55">Profile and providers</div>
                    <h1 className="mt-3 text-[56px] font-black leading-none">Settings</h1>
                    <p className="mt-4 max-w-3xl text-xl font-black text-white/60">Control your local profile, currency, and provider credentials.</p>
                </div>

                <form onSubmit={submit} className="grid max-w-5xl grid-cols-[1fr_1fr] gap-6 rounded-[42px] bg-[#b7ff63] p-8 shadow-xl">
                    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                        Username
                        <input name="username" defaultValue={user.username} className="rounded-2xl border-4 border-black/10 bg-white px-5 py-4 text-2xl font-black normal-case tracking-normal outline-none focus:border-black" />
                    </label>
                    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                        Currency
                        <select name="currency_code" defaultValue={user.settings?.currency_code ?? 'USD'} className="rounded-2xl border-4 border-black/10 bg-white px-5 py-4 text-2xl font-black normal-case tracking-normal outline-none focus:border-black">
                            {currencies.map((currency) => <option key={currency}>{currency}</option>)}
                        </select>
                    </label>
                    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                        IGDB Client ID
                        <input name="igdb_client_id" placeholder="IGDB client ID" className="rounded-2xl border-4 border-black/10 bg-white px-5 py-4 text-2xl font-black normal-case tracking-normal outline-none focus:border-black" />
                    </label>
                    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                        IGDB Client Secret
                        <input name="igdb_client_secret" placeholder="IGDB client secret" className="rounded-2xl border-4 border-black/10 bg-white px-5 py-4 text-2xl font-black normal-case tracking-normal outline-none focus:border-black" />
                    </label>
                    <label className="col-span-2 grid gap-2 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                        Steam API Key
                        <input name="steam_api_key" placeholder="Steam API key" className="rounded-2xl border-4 border-black/10 bg-white px-5 py-4 text-2xl font-black normal-case tracking-normal outline-none focus:border-black" />
                    </label>
                    <button className="col-span-2 rounded-[24px] bg-black px-8 py-5 text-2xl font-black text-[#b7ff63] shadow-xl transition hover:-translate-y-1">Save Settings</button>
                </form>
            </section>
        </AppLayout>
    );
}
