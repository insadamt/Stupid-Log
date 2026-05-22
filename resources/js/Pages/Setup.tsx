import { router } from '@inertiajs/react';
import { FormEvent } from 'react';

export default function Setup({ currencies }: { currencies: string[] }) {
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.post('/setup', Object.fromEntries(new FormData(event.currentTarget)));
    }

    return (
        <main className="grid min-h-screen place-items-center bg-[#f3f3f3] p-6">
            <form onSubmit={submit} className="w-full max-w-3xl rounded-[36px] bg-[#b7ff63] p-10">
                <h1 className="text-5xl font-black">Stupid Log Setup</h1>
                <div className="mt-8 grid gap-5">
                    <input name="username" required defaultValue="Player One" className="rounded-2xl px-5 py-4 text-2xl font-black" />
                    <select name="currency_code" defaultValue="USD" className="rounded-2xl px-5 py-4 text-2xl font-black">
                        {currencies.map((currency) => <option key={currency}>{currency}</option>)}
                    </select>
                    <input name="igdb_client_id" placeholder="IGDB client ID" className="rounded-2xl px-5 py-4 text-2xl font-black" />
                    <input name="igdb_client_secret" placeholder="IGDB client secret" className="rounded-2xl px-5 py-4 text-2xl font-black" />
                    <input name="steam_api_key" placeholder="Steam API key optional" className="rounded-2xl px-5 py-4 text-2xl font-black" />
                    <button className="rounded-[20px] bg-black px-8 py-5 text-2xl font-black text-white">Finish</button>
                </div>
            </form>
        </main>
    );
}
