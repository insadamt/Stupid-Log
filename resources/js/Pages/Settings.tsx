import { router } from '@inertiajs/react';
import { Settings as SettingsIcon } from 'lucide-react';
import { FormEvent, MouseEvent, useState } from 'react';
import AppLayout from '../Components/AppLayout';
import DataPortabilityPanel from './Settings/DataPortabilityPanel';
import IntegrationsPanel from './Settings/IntegrationsPanel';
import ProfilePanel from './Settings/ProfilePanel';
import { StatusBadge } from './Settings/SettingsControls';
import SettingsTabs from './Settings/SettingsTabs';
import { RequestState, SettingsSection, TestResult } from './Settings/types';

type IgdbCredential = {
    has_client_id: boolean;
    has_client_secret: boolean;
    last_tested_at?: string | null;
    last_test_status?: string | null;
};

export default function Settings({
    user,
    igdbCredential,
}: {
    user: { username: string };
    igdbCredential: IgdbCredential;
}) {
    const [section, setSection] = useState<SettingsSection>(initialSection);
    const [requestState, setRequestState] = useState<RequestState>('idle');
    const [restoreBusy, setRestoreBusy] = useState(false);
    const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
    const [profileFeedback, setProfileFeedback] = useState<TestResult | null>(null);
    const [integrationFeedback, setIntegrationFeedback] = useState<TestResult | null>(null);
    const [igdbTest, setIgdbTest] = useState<TestResult | null>(null);

    const igdbSaved = igdbCredential.has_client_id && igdbCredential.has_client_secret;
    const navigationLocked = restoreBusy || requestState === 'resetting';

    function changeSection(next: SettingsSection) {
        if (navigationLocked) return;

        setSection(next);
        const url = new URL(window.location.href);
        url.searchParams.set('section', next);
        window.history.replaceState(window.history.state, '', url);
    }

    function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setProfileErrors({});
        setProfileFeedback(null);

        router.patch('/settings?section=profile', Object.fromEntries(new FormData(event.currentTarget)), {
            preserveScroll: true,
            onStart: () => setRequestState('saving-profile'),
            onSuccess: () => setProfileFeedback({ ok: true, message: 'Profile saved.' }),
            onError: (errors) => {
                setProfileErrors(errors as Record<string, string>);
                setProfileFeedback({ ok: false, message: 'Profile could not be saved.' });
            },
            onFinish: () => setRequestState('idle'),
        });
    }

    function saveIntegrations(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIntegrationFeedback(null);

        router.patch('/settings?section=integrations', Object.fromEntries(new FormData(event.currentTarget)), {
            preserveScroll: true,
            onStart: () => setRequestState('saving-integrations'),
            onSuccess: () => setIntegrationFeedback({ ok: true, message: 'Integration settings saved.' }),
            onError: () => setIntegrationFeedback({ ok: false, message: 'Integration settings could not be saved.' }),
            onFinish: () => setRequestState('idle'),
        });
    }

    async function testProvider(
        event: MouseEvent<HTMLButtonElement>,
        endpoint: string,
        state: RequestState,
        setResult: (result: TestResult | null) => void,
        fallback: string,
    ) {
        const form = event.currentTarget.form;
        if (!form || requestState !== 'idle') return;

        setRequestState(state);
        setResult(null);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: requestHeaders(),
                body: new FormData(form),
            });
            const data = (await response.json()) as TestResult;
            setResult({ ok: response.ok && data.ok, message: data.message });
        } catch (error) {
            setResult({ ok: false, message: error instanceof Error ? error.message : fallback });
        } finally {
            setRequestState('idle');
        }
    }

    function resetApp() {
        if (!confirm('Reset Stupid Log and permanently erase this installation?')) return;

        router.post('/settings/reset', {}, {
            onStart: () => setRequestState('resetting'),
            onFinish: () => setRequestState('idle'),
        });
    }

    return (
        <AppLayout title="Settings" lockViewport>
            <section className="h-full overflow-hidden px-4 py-3 pl-[88px] pr-6">
                <div className="mx-auto grid h-full max-w-[1540px] grid-rows-[120px_minmax(0,1fr)_112px] gap-4 overflow-hidden">
                    <header className="rounded-[34px] bg-black px-6 py-5 text-white shadow-[0_24px_80px_rgb(0_0_0/0.20)]">
                        <div className="flex h-full items-center justify-between gap-6">
                            <div className="flex min-w-0 items-center gap-5">
                                <div className="grid size-14 shrink-0 place-items-center rounded-[20px] bg-[#b7ff63] text-black">
                                    <SettingsIcon size={28} strokeWidth={3} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]/70">System configuration</div>
                                    <div className="mt-1 flex items-end gap-4">
                                        <h1 className="text-6xl font-black leading-none tracking-[-0.06em]">Settings</h1>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-[24px] bg-white/8 p-2">
                                <StatusBadge active={igdbSaved} label="IGDB" dark />
                            </div>
                        </div>
                    </header>

                    <main className="min-h-0 overflow-hidden rounded-[34px] border border-black/8 bg-white/35 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.58)]">
                        <div className="h-full min-h-0 overflow-y-auto rounded-[28px] bg-white/85 p-7 shadow-[0_18px_45px_rgb(9_14_12/0.06)]">
                            <div hidden={section !== 'profile'}>
                                <ProfilePanel
                                    username={user.username}
                                    saving={requestState === 'saving-profile'}
                                    errors={profileErrors}
                                    feedback={profileFeedback}
                                    onSubmit={saveProfile}
                                />
                            </div>

                            <div hidden={section !== 'integrations'}>
                                <IntegrationsPanel
                                    username={user.username}
                                    igdb={{
                                        saved: igdbSaved,
                                        hasClientId: igdbCredential.has_client_id,
                                        hasClientSecret: igdbCredential.has_client_secret,
                                        lastTestedAt: igdbCredential.last_tested_at,
                                        lastTestStatus: igdbCredential.last_test_status,
                                    }}
                                    saving={requestState === 'saving-integrations'}
                                    testingIgdb={requestState === 'testing-igdb'}
                                    feedback={integrationFeedback}
                                    igdbTest={igdbTest}
                                    onSubmit={saveIntegrations}
                                    onTestIgdb={(event) => testProvider(event, '/settings/igdb/test', 'testing-igdb', setIgdbTest, 'IGDB test failed.')}
                                />
                            </div>

                            <div hidden={section !== 'data'}>
                                <DataPortabilityPanel
                                    resetting={requestState === 'resetting'}
                                    onReset={resetApp}
                                    onRestoreBusyChange={setRestoreBusy}
                                />
                            </div>
                        </div>
                    </main>

                    <SettingsTabs active={section} disabled={navigationLocked} onChange={changeSection} />
                </div>
            </section>
        </AppLayout>
    );
}

function initialSection(): SettingsSection {
    const section = new URLSearchParams(window.location.search).get('section');
    return section === 'integrations' || section === 'data' ? section : 'profile';
}

function requestHeaders(): Record<string, string> {
    return {
        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
        Accept: 'application/json',
    };
}
