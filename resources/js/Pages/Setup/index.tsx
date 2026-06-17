import { router } from '@inertiajs/react';
import { ChangeEvent, useRef, useState } from 'react';
import {
    clearPageTransition,
    gsap,
    prefersReducedMotion,
    removePageTransitionLayer,
} from '../../animation';
import { readJsonResponse } from '../../http';
import SetupIntro from './components/SetupIntro';
import SetupImportBackup from './components/SetupImportBackup';
import SetupImportedProviders from './components/SetupImportedProviders';
import SetupLaunch from './components/SetupLaunch';
import SetupWizard from './components/SetupWizard';
import { steps } from './constants';
import { BackupPreview, BackupState, Provider, ProviderTestResults, Scene, SetupForm, TestResult } from './types';
import { useSetupAnimations } from './useSetupAnimations';

export default function Setup() {
    const rootRef = useRef<HTMLElement>(null);
    const [scene, setScene] = useState<Scene>('intro');
    const [step, setStep] = useState(0);
    const [testing, setTesting] = useState<Provider | null>(null);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [providerResults, setProviderResults] = useState<ProviderTestResults>({});
    const [backup, setBackup] = useState<File | null>(null);
    const [backupState, setBackupState] = useState<BackupState>('idle');
    const [backupError, setBackupError] = useState<string | null>(null);
    const [importedProviderError, setImportedProviderError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const launchStartedRef = useRef(false);
    const [form, setForm] = useState<SetupForm>({
        username: 'Player One',
        igdb_client_id: '',
        igdb_client_secret: '',
    });

    useSetupAnimations({
        rootRef,
        scene,
        step,
        form,
        launchStartedRef,
        submittingRef,
        setSubmitting,
        setScene,
    });

    function updateField<Key extends keyof SetupForm>(key: Key, value: SetupForm[Key]) {
        setForm((current) => ({ ...current, [key]: value }));
        if (key === 'igdb_client_id' || key === 'igdb_client_secret') {
            setProviderResults((current) => ({ ...current, igdb: undefined }));
        }
    }

    function startFlow(nextScene: Scene) {
        const root = rootRef.current;
        if (!root || prefersReducedMotion()) {
            setScene(nextScene);
            return;
        }

        gsap.timeline({
            defaults: { ease: 'power3.inOut' },
            onComplete: () => setScene(nextScene),
        })
            .to(root.querySelectorAll('[data-intro-ring]'), { scale: 1.55, autoAlpha: 0, duration: 0.42 }, 0)
            .to(root.querySelector('[data-intro-logo]'), { scale: 1.12, autoAlpha: 0, duration: 0.36 }, 0.04)
            .to(root.querySelector('[data-intro-frame]'), { scale: 1.025, autoAlpha: 0, duration: 0.4 }, 0.08);
    }

    function finishSetup() {
        if (submittingRef.current) return;

        if (step < steps.length - 1) {
            setStep((current) => Math.min(steps.length - 1, current + 1));
            return;
        }

        const root = rootRef.current;
        const submitSetup = () => {
            router.post('/setup', form, {
                preserveScroll: false,
                onError: () => {
                    submittingRef.current = false;
                    launchStartedRef.current = false;
                    setSubmitting(false);
                    clearPageTransition();
                    removePageTransitionLayer();
                    setScene('wizard');
                },
            });
        };

        submittingRef.current = true;
        setSubmitting(true);

        if (!root || prefersReducedMotion()) {
            submitSetup();
            return;
        }

        const shell = root.querySelector<HTMLElement>('[data-wizard-shell]');

        gsap.timeline({
            defaults: { ease: 'power3.inOut' },
            onComplete: () => setScene('launch'),
        })
            .to(shell, { scale: 0.965, autoAlpha: 0.2, filter: 'blur(10px)', duration: 0.34 }, 0)
            .to(shell, { autoAlpha: 0, duration: 0.2 }, 0.18);
    }

    async function runProviderTest(provider: Provider): Promise<TestResult> {
        const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => formData.append(key, value));

        try {
            const response = await fetch(`/setup/${provider}/test`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    Accept: 'application/json',
                },
                body: formData,
            });
            const data = await response.json() as TestResult;
            return { ok: response.ok && data.ok, message: data.message };
        } catch (error) {
            return { ok: false, message: error instanceof Error ? error.message : 'Credential test failed.' };
        }
    }

    async function testProvider(provider: Provider) {
        if (testing) return;

        setTesting(provider);
        setTestResult(null);

        try {
            const result = await runProviderTest(provider);
            setProviderResults((current) => ({ ...current, [provider]: result }));
            setTestResult(result);
        } finally {
            setTesting(null);
        }
    }

    function configuredProviders() {
        const providers: Provider[] = [];
        if (form.igdb_client_id.trim() || form.igdb_client_secret.trim()) {
            providers.push('igdb');
        }
        return providers;
    }

    async function continueStep() {
        if (testing || submittingRef.current || backupState !== 'idle') return;

        if (step !== 1) {
            setStep((current) => Math.min(steps.length - 1, current + 1));
            return;
        }

        const providers = configuredProviders();
        if (providers.length === 0) {
            setStep((current) => Math.min(steps.length - 1, current + 1));
            return;
        }

        setTestResult(null);

        for (const provider of providers) {
            setTesting(provider);
            const result = await runProviderTest(provider);
            setProviderResults((current) => ({ ...current, [provider]: result }));
            setTestResult(result);
        }

        setTesting(null);
        setStep((current) => Math.min(steps.length - 1, current + 1));
    }

    function selectBackup(event: ChangeEvent<HTMLInputElement>) {
        setBackup(event.target.files?.[0] ?? null);
        setBackupError(null);
    }

    async function importBackup() {
        if (!backup || backupState !== 'idle') return;

        setBackupState('previewing');
        setBackupError(null);
        const formData = new FormData();
        formData.append('backup', backup);

        try {
            const response = await fetch('/settings/data-portability/preview', {
                method: 'POST',
                headers: requestHeaders(),
                body: formData,
            });
            const payload = await readJsonResponse(
                response,
                'Backup validation failed. Server returned a non-JSON error.',
                'Backup upload rejected. The file is larger than the server upload limit.',
            );

            if (!response.ok) {
                throw new Error(responseMessage(payload, 'Backup validation failed.'));
            }

            const preview = payload as BackupPreview;
            setBackupState('restoring');

            const restoreResponse = await fetch('/setup/import/restore', {
                method: 'POST',
                headers: {
                    ...requestHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: preview.token }),
            });
            const restorePayload = await readJsonResponse(restoreResponse, 'Backup import failed. Server returned a non-JSON error.');

            if (!restoreResponse.ok) {
                throw new Error(responseMessage(restorePayload, 'Backup import failed.'));
            }

            setBackupState('idle');
            setScene('import-providers');
        } catch (error) {
            setBackupError(error instanceof Error ? error.message : 'Backup import failed.');
            setBackupState('idle');
        }
    }

    async function saveImportedProviders() {
        if (submitting) return;

        setSubmitting(true);
        setImportedProviderError(null);
        try {
            const response = await fetch('/setup/import/providers', {
                method: 'POST',
                headers: {
                    ...requestHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    igdb_client_id: form.igdb_client_id,
                    igdb_client_secret: form.igdb_client_secret,
                }),
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(responseMessage(payload, 'Provider credentials could not be saved.'));
            }

            router.visit('/');
        } catch (error) {
            setImportedProviderError(error instanceof Error ? error.message : 'Provider credentials could not be saved.');
            setSubmitting(false);
        }
    }

    return (
        <main ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#090b08] text-white">
            {scene === 'intro' && (
                <SetupIntro
                    startFreshSetup={() => startFlow('wizard')}
                    startBackupImport={() => startFlow('import')}
                />
            )}
            {scene === 'wizard' && (
                <SetupWizard
                    step={step}
                    form={form}
                    updateField={updateField}
                    finishSetup={finishSetup}
                    continueStep={continueStep}
                    testProvider={testProvider}
                    testing={testing}
                    testResult={testResult}
                    providerResults={providerResults}
                    setStep={setStep}
                    submitting={submitting}
                />
            )}
            {scene === 'import' && (
                <SetupImportBackup
                    backup={backup}
                    state={backupState}
                    error={backupError}
                    selectBackup={selectBackup}
                    importBackup={importBackup}
                    goBack={() => setScene('intro')}
                />
            )}
            {scene === 'import-providers' && (
                <SetupImportedProviders
                    form={form}
                    updateField={updateField}
                    testProvider={testProvider}
                    testing={testing}
                    testResult={testResult}
                    saving={submitting}
                    error={importedProviderError}
                    saveAndOpen={saveImportedProviders}
                    skipAndOpen={() => router.visit('/')}
                />
            )}
            {scene === 'launch' && <SetupLaunch />}
        </main>
    );
}

function requestHeaders(): Record<string, string> {
    return {
        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
        Accept: 'application/json',
    };
}

function responseMessage(payload: unknown, fallback: string): string {
    if (typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string') {
        return payload.message;
    }

    return fallback;
}
