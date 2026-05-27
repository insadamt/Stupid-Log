import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    CircleAlert,
    Database,
    KeyRound,
    Loader2,
    RotateCcw,
    Save,
    ShieldCheck,
    TriangleAlert,
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
                    className="h-12 rounded-[14px] border border-black/10 bg-[#f6faf4] px-4 text-base font-black text-black outline-none shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] placeholder:text-black/28 focus:border-black focus:bg-white"
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
        <article className="rounded-[22px] bg-white/[0.07] p-4 ring-1 ring-white/8">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/65">{title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <StatusChip active={saved} label={saved ? 'Saved' : 'Missing'} />
                        {lastStatus && <StatusChip active={lastStatus === 'ok'} label={`Test ${lastStatus}`} />}
                    </div>
                </div>
                <div className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-[#b7ff63] text-black">{icon}</div>
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
    tone?: 'dark' | 'green' | 'ghost' | 'danger';
    type?: 'button' | 'submit';
}) {
    const toneClass = {
        dark: 'bg-black text-white hover:bg-black/85',
        green: 'bg-[#b7ff63] text-black hover:brightness-95',
        ghost: 'bg-white/75 text-black ring-1 ring-black/10 hover:bg-white',
        danger: 'bg-[#d92d20] text-white hover:bg-[#b42318]',
    }[tone];

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${toneClass} inline-flex h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-xs font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40`}
        >
            {children}
        </button>
    );
}

export default function Settings({
    user,
    igdbCredential,
    steamCredential,
}: {
    user: { username: string };
    igdbCredential: IgdbCredential;
    steamCredential: SteamCredential;
}) {
    const [testingIgdb, setTestingIgdb] = useState(false);
    const [testingSteam, setTestingSteam] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [igdbTest, setIgdbTest] = useState<TestResult | null>(null);
    const [steamTest, setSteamTest] = useState<TestResult | null>(null);

    const igdbSaved = igdbCredential.has_client_id && igdbCredential.has_client_secret;
    const steamSaved = steamCredential.has_api_key;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.patch('/settings', Object.fromEntries(new FormData(event.currentTarget)), { preserveScroll: true });
    }

    function resetApp() {
        if (!confirm('Reset Stupid Log and erase your library, snapshots, credentials, and settings?')) return;

        setResetting(true);
        router.post('/settings/reset', {}, {
            onFinish: () => setResetting(false),
        });
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
                <form onSubmit={submit} className="mx-auto grid h-full max-w-[1540px] grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
                    <header className="rounded-[24px] bg-black px-5 py-4 text-white shadow-[0_20px_60px_rgb(0_0_0/0.18)]">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                            <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.26em] text-[#b7ff63]/70">System setup</div>
                                <h1 className="mt-1 truncate text-4xl font-black leading-none tracking-[-0.05em]">Settings</h1>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                <StatusChip active={igdbSaved} label="IGDB" />
                                <StatusChip active={steamSaved} label="Steam" />
                                <ActionButton type="submit" tone="green">
                                    <Save size={16} strokeWidth={3} />
                                    Save
                                </ActionButton>
                            </div>
                        </div>
                    </header>

                    <div className="grid min-h-0 gap-4 overflow-hidden xl:grid-cols-[360px_minmax(0,1fr)]">
                        <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden">
                            <article className="rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-[0_18px_45px_rgb(9_14_12/0.06)]">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/38">Profile</div>
                                        <div className="mt-1 truncate text-2xl font-black tracking-[-0.04em]">{user.username}</div>
                                    </div>
                                    <div className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-black text-[#b7ff63]"><UserRound size={22} strokeWidth={3} /></div>
                                </div>
                                <div className="mt-4 grid gap-3">
                                    <Field label="Username" name="username" defaultValue={user.username} />
                                </div>
                            </article>

                            <section className="grid min-h-0 content-start gap-3 overflow-y-auto rounded-[24px] bg-black p-4 text-white shadow-[0_20px_60px_rgb(0_0_0/0.16)]">
                                <ProviderStatus
                                    title="IGDB provider"
                                    saved={igdbSaved}
                                    lastStatus={igdbCredential.last_test_status}
                                    lastTestedAt={igdbCredential.last_tested_at}
                                    icon={<Database size={22} strokeWidth={3} />}
                                />
                                <ProviderStatus
                                    title="Steam provider"
                                    saved={steamSaved}
                                    lastStatus={steamCredential.last_test_status}
                                    lastTestedAt={steamCredential.last_tested_at}
                                    icon={<KeyRound size={22} strokeWidth={3} />}
                                />
                            </section>

                            <article className="rounded-[24px] border border-[#d92d20]/25 bg-[#fff4f2] p-5 shadow-[0_18px_45px_rgb(9_14_12/0.06)]">
                                <div className="flex items-start gap-3">
                                    <div className="grid size-11 shrink-0 place-items-center rounded-[16px] bg-[#d92d20] text-white"><TriangleAlert size={22} strokeWidth={3} /></div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b42318]/70">Danger zone</div>
                                        <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-black">Reset app</h2>
                                        <p className="mt-2 text-sm font-bold leading-relaxed text-black/55">Erase your library, snapshots, provider credentials, and profile settings, then return to first-use setup.</p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <ActionButton onClick={resetApp} disabled={resetting} tone="danger">
                                        {resetting ? <Loader2 className="animate-spin" size={16} strokeWidth={3} /> : <RotateCcw size={16} strokeWidth={3} />}
                                        {resetting ? 'Resetting' : 'Reset app'}
                                    </ActionButton>
                                </div>
                            </article>
                        </aside>

                        <section className="grid min-h-0 gap-4 overflow-hidden lg:grid-cols-2">
                            <article className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-[0_18px_45px_rgb(9_14_12/0.06)]">
                                <div className="flex items-center justify-between gap-3 border-b border-black/8 pb-4">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/38">Metadata</div>
                                        <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">IGDB</h2>
                                    </div>
                                    <div className="grid size-11 place-items-center rounded-[16px] bg-black text-[#b7ff63]"><Database size={22} strokeWidth={3} /></div>
                                </div>
                                <div className="grid min-h-0 content-start gap-4 overflow-y-auto py-5 pr-1">
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
                                <div className="grid gap-3 border-t border-black/8 pt-4">
                                    <div className="flex flex-wrap gap-2">
                                        <ActionButton onClick={testIgdb} disabled={testingIgdb} tone="ghost">
                                            {testingIgdb ? <Loader2 className="animate-spin" size={16} strokeWidth={3} /> : <ShieldCheck size={16} strokeWidth={3} />}
                                            {testingIgdb ? 'Testing IGDB' : 'Test IGDB'}
                                        </ActionButton>
                                    </div>
                                    <TestMessage result={igdbTest} />
                                </div>
                            </article>

                            <article className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-[0_18px_45px_rgb(9_14_12/0.06)]">
                                <div className="flex items-center justify-between gap-3 border-b border-black/8 pb-4">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-black/38">Store</div>
                                        <h2 className="mt-1 text-3xl font-black tracking-[-0.05em]">Steam</h2>
                                    </div>
                                    <div className="grid size-11 place-items-center rounded-[16px] bg-black text-[#b7ff63]"><KeyRound size={22} strokeWidth={3} /></div>
                                </div>
                                <div className="grid min-h-0 content-start gap-4 overflow-y-auto py-5 pr-1">
                                    <Field
                                        label="API Key"
                                        name="steam_api_key"
                                        type="password"
                                        placeholder={steamCredential.has_api_key ? 'Saved - enter a new Steam API key to replace' : 'Steam API key'}
                                    />
                                    <div className="rounded-[18px] bg-[#f6faf4] p-4 text-sm font-bold leading-relaxed text-black/45 ring-1 ring-black/8">
                                        Achievements, DLC refresh, prices, and Steam search use this key.
                                    </div>
                                </div>
                                <div className="grid gap-3 border-t border-black/8 pt-4">
                                    <div className="flex flex-wrap gap-2">
                                        <ActionButton onClick={testSteam} disabled={testingSteam} tone="ghost">
                                            {testingSteam ? <Loader2 className="animate-spin" size={16} strokeWidth={3} /> : <KeyRound size={16} strokeWidth={3} />}
                                            {testingSteam ? 'Testing Steam' : 'Test Steam'}
                                        </ActionButton>
                                    </div>
                                    <TestMessage result={steamTest} />
                                </div>
                            </article>
                        </section>
                    </div>
                </form>
            </section>
        </AppLayout>
    );
}
