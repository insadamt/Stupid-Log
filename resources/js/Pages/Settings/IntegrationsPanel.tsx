import { Save } from 'lucide-react';
import { FormEvent, MouseEvent, ReactNode } from 'react';
import { FeedbackMessage, SettingsButton, SettingsField, StatusBadge } from './SettingsControls';
import { ProviderCredentialStatus, TestResult } from './types';

export default function IntegrationsPanel({
    username,
    igdb,
    steam,
    saving,
    testingIgdb,
    testingSteam,
    feedback,
    igdbTest,
    steamTest,
    onSubmit,
    onTestIgdb,
    onTestSteam,
}: {
    username: string;
    igdb: ProviderCredentialStatus & { hasClientId: boolean; hasClientSecret: boolean };
    steam: ProviderCredentialStatus & { hasApiKey: boolean };
    saving: boolean;
    testingIgdb: boolean;
    testingSteam: boolean;
    feedback: TestResult | null;
    igdbTest: TestResult | null;
    steamTest: TestResult | null;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onTestIgdb: (event: MouseEvent<HTMLButtonElement>) => void;
    onTestSteam: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
    const busy = saving || testingIgdb || testingSteam;

    return (
        <section id="settings-panel-integrations" role="tabpanel" aria-labelledby="settings-tab-integrations">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-black/35">Provider access</div>
            <h2 className="mt-1 text-4xl font-black tracking-[-0.05em]">Integrations</h2>
            <p className="mt-2 text-sm font-bold text-black/45">Manage credentials for external game providers.</p>

            <form onSubmit={onSubmit} className="mt-6">
                <input type="hidden" name="username" value={username} />

                <ProviderSection
                    title="IGDB"
                    description="Game metadata and discovery"
                    saved={igdb.saved}
                    lastTestedAt={igdb.lastTestedAt}
                    testing={testingIgdb}
                    testResult={igdbTest}
                    actionsDisabled={busy && !testingIgdb}
                    onTest={onTestIgdb}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <SettingsField
                            label="Client ID"
                            name="igdb_client_id"
                            placeholder={igdb.hasClientId ? 'Saved · enter a new ID to replace' : 'IGDB client ID'}
                        />
                        <SettingsField
                            label="Client Secret"
                            name="igdb_client_secret"
                            type="password"
                            placeholder={igdb.hasClientSecret ? 'Saved · enter a new secret to replace' : 'IGDB client secret'}
                        />
                    </div>
                </ProviderSection>

                <ProviderSection
                    title="Steam"
                    description="Search, achievements, DLC, and prices"
                    saved={steam.saved}
                    lastTestedAt={steam.lastTestedAt}
                    testing={testingSteam}
                    testResult={steamTest}
                    actionsDisabled={busy && !testingSteam}
                    onTest={onTestSteam}
                >
                    <div className="max-w-xl">
                        <SettingsField
                            label="API Key"
                            name="steam_api_key"
                            type="password"
                            placeholder={steam.hasApiKey ? 'Saved · enter a new key to replace' : 'Steam API key'}
                        />
                    </div>
                </ProviderSection>

                <div className="flex items-center gap-4 border-t border-black/10 pt-5">
                    <SettingsButton type="submit" tone="green" busy={saving} disabled={busy && !saving}>
                        <Save size={16} strokeWidth={3} />
                        {saving ? 'Saving' : 'Save integrations'}
                    </SettingsButton>
                    <span className="text-xs font-bold text-black/35">Blank fields keep the currently saved encrypted value.</span>
                </div>

                <div className="mt-4 max-w-xl">
                    <FeedbackMessage result={feedback} />
                </div>
            </form>
        </section>
    );
}

function ProviderSection({
    title,
    description,
    saved,
    lastTestedAt,
    testing,
    testResult,
    actionsDisabled,
    onTest,
    children,
}: {
    title: string;
    description: string;
    saved: boolean;
    lastTestedAt?: string | null;
    testing: boolean;
    testResult: TestResult | null;
    actionsDisabled: boolean;
    onTest: (event: MouseEvent<HTMLButtonElement>) => void;
    children: ReactNode;
}) {
    return (
        <section className="grid grid-cols-[180px_minmax(0,1fr)] gap-6 border-t border-black/10 py-6 first:border-t-0 first:pt-0">
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black">{title}</h3>
                    <StatusBadge active={saved} label={saved ? 'Saved' : 'Missing'} />
                </div>
                <p className="mt-1 text-xs font-bold text-black/40">{description}</p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.12em] text-black/30">
                    {formatDate(lastTestedAt)}
                </p>
            </div>

            <div>
                {children}
                <div className="mt-4 flex items-center gap-3">
                    <SettingsButton type="button" tone="ghost" busy={testing} disabled={actionsDisabled} onClick={onTest}>
                        {testing ? 'Testing' : `Test ${title}`}
                    </SettingsButton>
                    <div className="min-w-0 flex-1">
                        <FeedbackMessage result={testResult} />
                    </div>
                </div>
            </div>
        </section>
    );
}

function formatDate(value?: string | null) {
    if (!value) return 'Never tested';
    return `Tested ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))}`;
}
