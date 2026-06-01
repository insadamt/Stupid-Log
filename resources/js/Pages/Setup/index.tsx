import { router } from '@inertiajs/react';
import { FormEvent, useRef, useState } from 'react';
import {
    clearPageTransition,
    gsap,
    prefersReducedMotion,
    removePageTransitionLayer,
} from '../../animation';
import SetupIntro from './components/SetupIntro';
import SetupLaunch from './components/SetupLaunch';
import SetupWizard from './components/SetupWizard';
import { Provider, Scene, SetupForm, TestResult } from './types';
import { useSetupAnimations } from './useSetupAnimations';

export default function Setup() {
    const rootRef = useRef<HTMLElement>(null);
    const [scene, setScene] = useState<Scene>('intro');
    const [step, setStep] = useState(0);
    const [testing, setTesting] = useState<Provider | null>(null);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const launchStartedRef = useRef(false);
    const [form, setForm] = useState<SetupForm>({
        username: 'Player One',
        igdb_client_id: '',
        igdb_client_secret: '',
        steam_api_key: '',
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
    }

    function startWizard() {
        const root = rootRef.current;
        if (!root || prefersReducedMotion()) {
            setScene('wizard');
            return;
        }

        gsap.timeline({
            defaults: { ease: 'power3.inOut' },
            onComplete: () => setScene('wizard'),
        })
            .to(root.querySelectorAll('[data-intro-ring]'), { scale: 1.55, autoAlpha: 0, duration: 0.42 }, 0)
            .to(root.querySelector('[data-intro-logo]'), { scale: 1.12, autoAlpha: 0, duration: 0.36 }, 0.04)
            .to(root.querySelector('[data-intro-frame]'), { scale: 1.025, autoAlpha: 0, duration: 0.4 }, 0.08);
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submittingRef.current) return;

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

    async function testProvider(provider: Provider) {
        setTesting(provider);
        setTestResult(null);

        const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => formData.append(key, value));

        try {
            const response = await fetch(`/settings/${provider}/test`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf,
                    Accept: 'application/json',
                },
                body: formData,
            });
            const data = await response.json() as TestResult;
            setTestResult({ ok: response.ok && data.ok, message: data.message });
        } catch (error) {
            setTestResult({ ok: false, message: error instanceof Error ? error.message : 'Credential test failed.' });
        } finally {
            setTesting(null);
        }
    }

    return (
        <main ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#090b08] text-white">
            {scene === 'intro' && <SetupIntro startWizard={startWizard} />}
            {scene === 'wizard' && (
                <SetupWizard
                    step={step}
                    form={form}
                    updateField={updateField}
                    submit={submit}
                    testProvider={testProvider}
                    testing={testing}
                    testResult={testResult}
                    setStep={setStep}
                    submitting={submitting}
                />
            )}
            {scene === 'launch' && <SetupLaunch />}
        </main>
    );
}
