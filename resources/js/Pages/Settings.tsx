import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    CircleAlert,
    CircleDollarSign,
    Database,
    Gamepad2,
    KeyRound,
    Loader2,
    Save,
    ShieldCheck,
    Steam,
    UserRound,
} from 'lucide-react';
import { FormEvent, MouseEvent, ReactNode, useState } from 'react';
import AppLayout from '../Components/AppLayout';

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

type TestResult = {
    ok: boolean;
    message: string;
};

function formatDate(value?: string | null) {
    if (!value) return 'Never tested';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function Field({
    label,
    name,
    defaultValue,
    placeholder,
    type = 'text',
    children,
}: {
    label: string;
    name: string;
    defaultValue?: string;
    placeholder?: string;
    type?: string;
    children?: ReactNode;
}) {
    return (
        <label className="grid gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-black/38">{label}</span>
            {children ?? (
                <input
                    name={name}
                    type={type}
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    className="h-14 rounded-[20px] border border-black/10 bg-[#f6faf4] px-5 text-lg font-black text-black outline-none shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] placeholder:text-black/28 focus:border-black focus:bg-white"
                />
            )}
        </label>
    );
}

function StatusChip({ active, label }: { active: boolean; label: string }) {
    return (
        <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] ${active ? 'bg-[#b7ff63] text-black' : 'bg-white/8 text-white/38 ring-1 ring-white/10'}`}>
            {active ? <CheckCircle2 size={14} strokeWidth={3} /> : <CircleAlert size={14} strokeWidth={3} />}
            {label}
        </span>
    );
}

function ProviderStatus({
    title,
    saved,
    lastStatus,
    lastTestedAt,
    icon,
}: {
    title: string;
    saved: boolean;
    lastStatus?: string | null;
    lastTestedAt?: string | null;
    icon: ReactNode;
}) {
    return (
        <article className="rounded-[26px] bg-white/[0.07] p-4 ring-1 ring-white/8">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/65">{title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <StatusChip active={saved} label={saved ? 'Saved' : 'Missing'} />
                        {lastStatus && <StatusChip active={lastStatus === 'ok'} label={`Test ${lastStatus}`} />}
                    </div>
                </div>
                <div className="grid size-12 place-items-center rounded-2xl bg-[#b7ff63] text-black">{icon}</div>
            </div>
            <div className="mt-3 truncate text-xs font-black uppercase tracking-[0.16em] text-white/32">{formatDate(lastTestedAt)}</div>
        </article>
    );
}

function TestMessage({ result }: { result: TestResult | null }) {
    if (!result) return null;

    return (
        <div className={`rounded-[18px] px-4 py-3 text-sm font-black ${result.ok ? 'bg-[#b7ff63] text-black' : 'bg-[#ffe0dd] text-[#ad2c21]'}`}>
            {result.message}
        </div>
    );
}

function ActionButton({
    children,
    disabled,
    onClick,
    tone = 'dark',
    type = 'button',
}: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
    tone?: 'dark' | 'green' | 'ghost';
    type?: 'button' | 'submit';
}) {
    const toneClass = {
        dark: 'bg-black text-white hover:bg-black/85',
        green: 'bg-[#b7ff63] text-black hover:brightness-95',
        ghost: 'bg-white/75 text-black ring-1 ring-black/10 hover:bg-white',
    }[tone];

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${toneClass} inline-flex h-13 items-center justify-center gap-2 rounded-[18px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40`}
        >
            {children}
        </button>
    );
}

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
    const [igdbTest, setIgdbTest] = useState<TestResult | null>(null);
    const [steamTest, setSteamTest] = useState<TestResult | null>(null);

    const igdbSaved = igdbCredential.has_client_id && igdbCredential.has_client_secret;
    const steamSaved = steamCredential.has_api_key;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.patch('/settings', Object.fromEntries(new FormData(event.currentTarget)), { preserveScroll: true });
    }

    async function testIgdb(event: MouseEvent<HTMLButtonElement>) {
        const form = event.currentTarget.form;
        if (!form) return;

        setTestingIgdb(true);
        setIgdbTest(null);

        const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        const formData = new FormData(form);

        try {
            const response = await fetch('/settings/igdb/test', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    Accept: 'application/json',
                },
                body: formData,
            });
            const data = (await response.json()) as TestResult;
            setIgdbTest({ ok: response.ok && data.ok, message: data.message });
        } catch (error) {
            setIgdbTest({ ok: false, message: error instanceof Error ? error.message : 'IGDB test failed.' });
        } finally {
            setTestingIgdb(false);
        }
    }

    async function testSteam(event: MouseEvent<HTMLButtonElement>) {
        const form = event.currentTarget.form;
        if (!form) return;

        setTestingSteam(true);
        setSteamTest(null);

        const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        const formData = new FormData(form);

        try {
            const response = await fetch('/settings/steam/test', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    Accept: 'application/json',
                },
                body: formData,
            });
            const data = (await response.json()) as TestResult;
            setSteamTest({ ok: response.ok && data.ok, message: data.message });
        } catch (error) {
            setSteamTest({ ok: false, message: error instanceof Error ? error.message : 'Steam test failed.' });
        } finally {
            setTestingSteam(false);
        }
    }

    return (
        <AppLayout title="Settings" lockViewport>
            <section className="h-full overflow-hidden px-4 py-3 md:pl-[88px] md:pr-6">
                <div className="mx-auto grid h-full max-w-[1540px] grid-rows-[120px_minmax(0,1fr)] gap-4 overflow-hidden">
                    <header className="rounded-[34px] bg-black px-6 py-5 text-white shadow-[0_24px_80px_rgb(0_0_0/0.20)]">
                        <div className="grid h-full gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
                            <div className="min-w-0">
                                <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]/70">System setup</div>
                                <div className="mt-1 flex items-end gap-4">
                                    <h1 className="text-6xl font-black leading-none tracking-[-0.06em]">Settings</h1>
                                    <p className="mb-2 hidden max-w-2xl truncate text-sm font-bold text-white/38 xl:block">Profile, currency, and provider keys in one fixed console.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <StatusChip active={igdbSaved} label="IGDB" />
                                <StatusChip active={steamSaved} label="Steam" />
                            </div>
                        </div>
                    </header>

                    <form onSubmit={submit} className="grid min-h-0 gap-4 overflow-hidden rounded-[34px] border border-black/8 bg-white/35 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.58)] xl:grid-cols-[420px_minmax(0,1fr)]">
                        <aside className="grid min-h-0 grid-rows-[auto_1fr_auto] rounded-[34px] bg-black p-5 text-white shadow-[0_24px_70px_rgb(0_0_0/0.18)]">
                            <div>
                                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Player profile</div>
                                <h2 className="mt-2 text-4xl font-black tracking-[-0.05em]">Account Loadout</h2>
                                <p className="mt-3 text-sm font-bold leading-relaxed text-white/38">These values control the local profile name and how money is displayed across Stupid Log.</p>
                            </div>

                            <div className="mt-6 grid min-h-0 gap-4 content-start overflow-y-auto pr-1">
                                <div className="rounded-[28px] bg-white/[0.07] p-4 ring-1 ring-white/8">
                                    <div className="grid size-14 place-items-center rounded-2xl bg-[#b7ff63] text-black"><UserRound size={28} strokeWidth={3} /></div>
                                    <div className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/32">Current profile</div>
                                    <div className="mt-1 truncate text-3xl font-black tracking-[-0.04em]">{user.username}</div>
                                </div>

                                <div className="rounded-[28px] bg-white/[0.07] p-4 ring-1 ring-white/8">
                                    <div className="grid size-14 place-items-center rounded-2xl bg-[#b7ff63] text-black"><CircleDollarSign size={28} strokeWidth={3} /></div>
                                    <div className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/32">Display currency</div>
                                    <div className="mt-1 text-3xl font-black tracking-[-0.04em]">{user.settings?.currency_code ?? 'USD'}</div>
                                </div>
                            </div>

                            <ActionButton type="submit" tone="green">
                                <Save size={16} strokeWidth={3} />
                                Save Settings
                            </ActionButton>
                        </aside>

                        <section className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-4 overflow-hidden">
                            <div className="grid gap-4 xl:grid-cols-2">
                                <article className="rounded-[30px] border border-black/10 bg-white/75 p-5 shadow-[0_18px_44px_rgb(0_0_0/0.06)]">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/35">Identity</div>
                                            <h3 className="mt-1 text-3xl font-black tracking-[-0.05em]">Profile</h3>
                                        </div>
                                        <div className="grid size-12 place-items-center rounded-2xl bg-black text-[#b7ff63]"><Gamepad2 size={24} strokeWidth={3} /></div>
                                    </div>
                                    <div className="mt-5 grid gap-4">
                                        <Field label="Username" name="username" defaultValue={user.username} />
                                        <Field label="Currency" name="currency_code">
                                            <select
                                                name="currency_code"
                                                defaultValue={user.settings?.currency_code ?? 'USD'}
                                                className="h-14 rounded-[20px] border border-black/10 bg-[#f6faf4] px-5 text-lg font-black text-black outline-none shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] focus:border-black focus:bg-white"
                                            >
                                                {currencies.map((currency) => <option key={currency}>{currency}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                </article>

                                <div className="grid gap-4">
                                    <ProviderStatus
                                        title="IGDB provider"
                                        saved={igdbSaved}
                                        lastStatus={igdbCredential.last_test_status}
                                        lastTestedAt={igdbCredential.last_tested_at}
                                        icon={<Database size={24} strokeWidth={3} />}
                                    />
                                    <ProviderStatus
                                        title="Steam provider"
                                        saved={steamSaved}
                                        lastStatus={steamCredential.last_test_status}
                                        lastTestedAt={steamCredential.last_tested_at}
                                        icon={<Steam size={24} strokeWidth={3} />}
                                    />
                                </div>
                            </div>

                            <div className="grid min-h-0 gap-4 overflow-hidden xl:grid-cols-2">
                                <article className="grid min-h-0 grid-rows-[auto_1fr_auto] rounded-[30px] border border-black/10 bg-white/75 p-5 shadow-[0_18px_44px_rgb(0_0_0/0.06)]">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/35">Metadata core</div>
                                            <h3 className="mt-1 text-3xl font-black tracking-[-0.05em]">IGDB</h3>
                                        </div>
                                        <div className="grid size-12 place-items-center rounded-2xl bg-black text-[#b7ff63]"><Database size={24} strokeWidth={3} /></div>
                                    </div>
                                    <div className="mt-5 grid min-h-0 content-start gap-4 overflow-y-auto pr-1">
                                        <Field
                                            label="Client ID"
                                            name="igdb_client_id"
                                            placeholder={igdbCredential.has_client_id ? 'Saved - enter a new ID to replace' : 'IGDB client ID'}
                                        />
                                        <Field
                                            label="Client Secret"
                                            name="igdb_client_secret"
                                            type="password"
                                            placeholder={igdbCredential.has_client_secret ? 'Saved - enter a new secret to replace' : 'IGDB client secret'}
                                        />
                                    </div>
                                    <div className="mt-5 grid gap-3">
                                        <ActionButton onClick={testIgdb} disabled={testingIgdb} tone="ghost">
                                            {testingIgdb ? <Loader2 className="animate-spin" size={16} strokeWidth={3} /> : <ShieldCheck size={16} strokeWidth={3} />}
                                            {testingIgdb ? 'Testing IGDB' : 'Test IGDB API'}
                                        </ActionButton>
                                        <TestMessage result={igdbTest} />
                                    </div>
                                </article>

                                <article className="grid min-h-0 grid-rows-[auto_1fr_auto] rounded-[30px] border border-black/10 bg-white/75 p-5 shadow-[0_18px_44px_rgb(0_0_0/0.06)]">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-black/35">Store services</div>
                                            <h3 className="mt-1 text-3xl font-black tracking-[-0.05em]">Steam</h3>
                                        </div>
                                        <div className="grid size-12 place-items-center rounded-2xl bg-black text-[#b7ff63]"><Steam size={24} strokeWidth={3} /></div>
                                    </div>
                                    <div className="mt-5 grid min-h-0 content-start gap-4 overflow-y-auto pr-1">
                                        <Field
                                            label="API Key"
                                            name="steam_api_key"
                                            type="password"
                                            placeholder={steamCredential.has_api_key ? 'Saved - enter a new Steam API key to replace' : 'Steam API key'}
                                        />
                                        <div className="rounded-[22px] bg-[#f6faf4] p-4 text-sm font-bold leading-relaxed text-black/45 ring-1 ring-black/8">
                                            Steam is used for achievements, DLC catalog refresh, pricing checks, and store-linked enrichment.
                                        </div>
                                    </div>
                                    <div className="mt-5 grid gap-3">
                                        <ActionButton onClick={testSteam} disabled={testingSteam} tone="ghost">
                                            {testingSteam ? <Loader2 className="animate-spin" size={16} strokeWidth={3} /> : <KeyRound size={16} strokeWidth={3} />}
                                            {testingSteam ? 'Testing Steam' : 'Test Steam API'}
                                        </ActionButton>
                                        <TestMessage result={steamTest} />
                                    </div>
                                </article>
                            </div>

                            <div className="flex items-center justify-between gap-4 rounded-[28px] bg-black p-4 text-white shadow-[0_18px_44px_rgb(0_0_0/0.12)]">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">Save gate</div>
                                    <p className="mt-1 text-sm font-bold text-white/42">Blank provider fields keep saved credentials. Type a new key only when replacing it.</p>
                                </div>
                                <ActionButton type="submit" tone="green">
                                    <Save size={16} strokeWidth={3} />
                                    Save Settings
                                </ActionButton>
                            </div>
                        </section>
                    </form>
                </div>
            </section>
        </AppLayout>
    );
}
