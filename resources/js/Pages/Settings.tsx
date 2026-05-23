import { router } from "@inertiajs/react";
import { FormEvent, MouseEvent, useState } from "react";
import AppLayout from "../Components/AppLayout";

type IgdbCredential = {
    has_client_id: boolean;
    has_client_secret: boolean;
    last_tested_at?: string | null;
    last_test_status?: string | null;
};

type SteamCredential = {
    has_api_key: boolean;
    last_tested_at?: string | null;
    last_test_status?: string | null;
};

export default function Settings({
    user,
    currencies,
    igdbCredential,
    steamCredential,
}: {
    user: { username: string; settings?: { currency_code: string } };
    currencies: string[];
    igdbCredential: IgdbCredential;
    steamCredential: SteamCredential;
}) {
    const [testingIgdb, setTestingIgdb] = useState(false);
    const [testingSteam, setTestingSteam] = useState(false);
    const [igdbTest, setIgdbTest] = useState<{
        ok: boolean;
        message: string;
    } | null>(null);
    const [steamTest, setSteamTest] = useState<{
        ok: boolean;
        message: string;
    } | null>(null);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.patch(
            "/settings",
            Object.fromEntries(new FormData(event.currentTarget)),
        );
    }

    async function testIgdb(event: MouseEvent<HTMLButtonElement>) {
        const form = event.currentTarget.form;
        if (!form) return;

        setTestingIgdb(true);
        setIgdbTest(null);

        const csrf =
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content ?? "";
        const formData = new FormData(form);

        try {
            const response = await fetch("/settings/igdb/test", {
                method: "POST",
                headers: {
                    "X-CSRF-TOKEN": csrf,
                    Accept: "application/json",
                },
                body: formData,
            });
            const data = (await response.json()) as {
                ok: boolean;
                message: string;
            };
            setIgdbTest({ ok: response.ok && data.ok, message: data.message });
        } catch (error) {
            setIgdbTest({
                ok: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "IGDB test failed.",
            });
        } finally {
            setTestingIgdb(false);
        }
    }

    async function testSteam(event: MouseEvent<HTMLButtonElement>) {
        const form = event.currentTarget.form;
        if (!form) return;

        setTestingSteam(true);
        setSteamTest(null);

        const csrf =
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content ?? "";
        const formData = new FormData(form);

        try {
            const response = await fetch("/settings/steam/test", {
                method: "POST",
                headers: {
                    "X-CSRF-TOKEN": csrf,
                    Accept: "application/json",
                },
                body: formData,
            });
            const data = (await response.json()) as {
                ok: boolean;
                message: string;
            };
            setSteamTest({ ok: response.ok && data.ok, message: data.message });
        } catch (error) {
            setSteamTest({
                ok: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Steam test failed.",
            });
        } finally {
            setTestingSteam(false);
        }
    }

    return (
        <AppLayout title="Settings">
            <section className="px-4 md:pl-[88px] md:pr-0">
                <div className="mb-8 rounded-[42px] bg-black p-8 text-[#b7ff63] shadow-2xl">
                    <div className="text-sm font-black uppercase tracking-[0.32em] text-[#b7ff63]/55">
                        Profile and providers
                    </div>
                    <h1 className="mt-3 text-[56px] font-black leading-none">
                        Settings
                    </h1>
                    <p className="mt-4 max-w-3xl text-xl font-black text-white/60">
                        Control your local profile, currency, and provider
                        credentials.
                    </p>
                </div>

                <form
                    onSubmit={submit}
                    className="grid max-w-5xl gap-6 rounded-[42px] bg-[#b7ff63] p-8 shadow-xl md:grid-cols-[1fr_1fr]"
                >
                    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                        Username
                        <input
                            name="username"
                            defaultValue={user.username}
                            className="rounded-2xl border-4 border-black/10 bg-white px-5 py-4 text-2xl font-black normal-case tracking-normal outline-none focus:border-black"
                        />
                    </label>
                    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                        Currency
                        <select
                            name="currency_code"
                            defaultValue={user.settings?.currency_code ?? "USD"}
                            className="rounded-2xl border-4 border-black/10 bg-white px-5 py-4 text-2xl font-black normal-case tracking-normal outline-none focus:border-black"
                        >
                            {currencies.map((currency) => (
                                <option key={currency}>{currency}</option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                        IGDB Client ID
                        <input
                            name="igdb_client_id"
                            placeholder={
                                igdbCredential.has_client_id
                                    ? "Saved - enter a new ID to replace"
                                    : "IGDB client ID"
                            }
                            className="rounded-2xl border-4 border-black/10 bg-white px-5 py-4 text-2xl font-black normal-case tracking-normal outline-none focus:border-black"
                        />
                    </label>
                    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                        IGDB Client Secret
                        <input
                            name="igdb_client_secret"
                            type="password"
                            placeholder={
                                igdbCredential.has_client_secret
                                    ? "Saved - enter a new secret to replace"
                                    : "IGDB client secret"
                            }
                            className="rounded-2xl border-4 border-black/10 bg-white px-5 py-4 text-2xl font-black normal-case tracking-normal outline-none focus:border-black"
                        />
                    </label>
                    <label className="grid gap-2 text-sm font-black uppercase tracking-[0.18em] text-black/45">
                        Steam API Key
                        <input
                            name="steam_api_key"
                            type="password"
                            placeholder={
                                steamCredential.has_api_key
                                    ? "Saved - enter a new Steam API key to replace"
                                    : "Steam API key"
                            }
                            className="rounded-2xl border-4 border-black/10 bg-white px-5 py-4 text-2xl font-black normal-case tracking-normal outline-none focus:border-black"
                        />
                    </label>
                    <div className="grid gap-4 rounded-[26px] bg-white/45 p-5 md:col-span-2">
                        <div className="flex flex-wrap items-center gap-3 text-lg font-black">
                            <span
                                className={`rounded-full px-5 py-2 ${igdbCredential.has_client_id && igdbCredential.has_client_secret ? "bg-black text-[#b7ff63]" : "bg-white text-black/55"}`}
                            >
                                {igdbCredential.has_client_id &&
                                igdbCredential.has_client_secret
                                    ? "IGDB saved"
                                    : "IGDB not saved"}
                            </span>
                            {igdbCredential.last_test_status && (
                                <span className="rounded-full bg-white px-5 py-2 text-black/55">
                                    Last test: {igdbCredential.last_test_status}
                                    {igdbCredential.last_tested_at ? ` at ${new Date(igdbCredential.last_tested_at).toLocaleString()}` : ""}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-lg font-black">
                            <span
                                className={`rounded-full px-5 py-2 ${
                                    steamCredential.has_api_key
                                        ? "bg-black text-[#b7ff63]"
                                        : "bg-white text-black/55"
                                }`}
                            >
                                {steamCredential.has_api_key
                                    ? "Steam key saved"
                                    : "Steam key missing"}
                            </span>
                            {steamCredential.last_test_status && (
                                <span className="rounded-full bg-white px-5 py-2 text-black/55">
                                    Last test: {steamCredential.last_test_status}
                                    {steamCredential.last_tested_at ? ` at ${new Date(steamCredential.last_tested_at).toLocaleString()}` : ""}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={testIgdb}
                                disabled={testingIgdb}
                                className="rounded-[20px] bg-white px-8 py-4 text-xl font-black text-black shadow-sm disabled:opacity-45"
                            >
                                {testingIgdb
                                    ? "Testing IGDB..."
                                    : "Test IGDB API"}
                            </button>
                            {igdbTest && (
                                <div
                                    className={`text-xl font-black ${igdbTest.ok ? "text-black" : "text-[#b00020]"}`}
                                >
                                    {igdbTest.message}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={testSteam}
                                disabled={testingSteam}
                                className="rounded-[20px] bg-white px-8 py-4 text-xl font-black text-black shadow-sm disabled:opacity-45"
                            >
                                {testingSteam
                                    ? "Testing Steam..."
                                    : "Test Steam API"}
                            </button>
                            {steamTest && (
                                <div
                                    className={`text-xl font-black ${steamTest.ok ? "text-black" : "text-[#b00020]"}`}
                                >
                                    {steamTest.message}
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="rounded-[24px] bg-black px-8 py-5 text-2xl font-black text-[#b7ff63] shadow-xl transition hover:-translate-y-1 md:col-span-2">
                        Save Settings
                    </button>
                </form>
            </section>
        </AppLayout>
    );
}
