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
            <form onSubmit={submit} className="max-w-3xl rounded-[32px] bg-[#b7ff63] p-8">
                <div className="grid gap-5">
                    <input name="username" defaultValue={user.username} className="rounded-2xl px-5 py-4 text-2xl font-black" />
                    <select name="currency_code" defaultValue={user.settings?.currency_code ?? 'USD'} className="rounded-2xl px-5 py-4 text-2xl font-black">
                        {currencies.map((currency) => <option key={currency}>{currency}</option>)}
                    </select>
                    <input name="igdb_client_id" placeholder="IGDB client ID" className="rounded-2xl px-5 py-4 text-2xl font-black" />
                    <input name="igdb_client_secret" placeholder="IGDB client secret" className="rounded-2xl px-5 py-4 text-2xl font-black" />
                    <input name="steam_api_key" placeholder="Steam API key" className="rounded-2xl px-5 py-4 text-2xl font-black" />
                    <button className="rounded-[20px] bg-black px-8 py-5 text-2xl font-black text-white">Save Settings</button>
                </div>
            </form>
        </AppLayout>
    );
}
