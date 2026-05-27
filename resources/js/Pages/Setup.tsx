import { router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Database,
    Gamepad2,
    KeyRound,
    Loader2,
    Play,
    Save,
    ShieldCheck,
    Sparkles,
    UserRound,
} from 'lucide-react';
import { FormEvent, ReactNode, useRef, useState } from 'react';
import {
    clearPageTransition,
    createPageTransitionLayer,
    gsap,
    prefersReducedMotion,
    removePageTransitionLayer,
    storePageTransition,
    useGSAP,
} from '../animation';

type Provider = 'igdb' | 'steam';
type Scene = 'intro' | 'wizard' | 'launch';

type SetupForm = {
    username: string;
    igdb_client_id: string;
    igdb_client_secret: string;
    steam_api_key: string;
};

type TestResult = {
    ok: boolean;
    message: string;
};

const steps = [
    {
        eyebrow: 'Profile',
        title: 'Name the save.',
        detail: 'Create the local profile that owns your library.',
        icon: UserRound,
    },
    {
        eyebrow: 'Signals',
        title: 'Connect scanners.',
        detail: 'Add optional provider keys now, or leave them blank and add them later.',
        icon: Database,
    },
    {
        eyebrow: 'Launch',
        title: 'Open the log.',
        detail: 'Review the profile and enter your library.',
        icon: Sparkles,
    },
];

function ControlButton({
    children,
    type = 'button',
    tone = 'dark',
    disabled,
    onClick,
}: {
    children: ReactNode;
    type?: 'button' | 'submit';
    tone?: 'dark' | 'lime' | 'ghost';
    disabled?: boolean;
    onClick?: () => void;
}) {
    const toneClass = {
        dark: 'bg-black text-white hover:bg-black/85',
        lime: 'bg-[#b7ff63] text-black hover:brightness-95',
        ghost: 'bg-white/8 text-white ring-1 ring-white/14 hover:bg-white/14',
    }[tone];

    return (
        <button
            type={type}
            disabled={disabled}
            onClick={onClick}
            className={`${toneClass} inline-flex h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-sm font-black uppercase transition disabled:cursor-not-allowed disabled:opacity-40`}
        >
            {children}
        </button>
    );
}

function TextField({
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
    required,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
}) {
    return (
        <label className="grid gap-2" data-wizard-item>
            <span className="text-[11px] font-black uppercase text-white/42">{label}</span>
            <input
                type={type}
                value={value}
                required={required}
                onChange={(event) => onChange(event.currentTarget.value)}
                placeholder={placeholder}
                className="h-14 rounded-[16px] border border-white/10 bg-white/[0.08] px-4 text-base font-black text-white outline-none placeholder:text-white/24 focus:border-[#b7ff63] focus:bg-white/[0.12]"
            />
        </label>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-[16px] bg-white/[0.08] px-4 py-3 ring-1 ring-white/10" data-wizard-item>
            <span className="text-xs font-black uppercase text-white/42">{label}</span>
            <span className="truncate text-sm font-black text-white">{value}</span>
        </div>
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

function Background() {
    return (
        <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgb(183_255_99/0.18),transparent_28%),radial-gradient(circle_at_50%_76%,rgb(255_255_255/0.06),transparent_30%),linear-gradient(135deg,#11150d,#070907_58%,#14120e)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:48px_48px]" />
        </>
    );
}

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

    useGSAP(() => {
        const root = rootRef.current;
        if (!root || scene !== 'intro') return;

        const frame = root.querySelector('[data-intro-frame]');
        const logo = root.querySelector('[data-intro-logo]');
        const rings = root.querySelectorAll('[data-intro-ring]');
        const copy = root.querySelectorAll('[data-intro-copy]');
        const start = root.querySelector('[data-intro-start]');

        if (prefersReducedMotion()) {
            gsap.set([frame, logo, rings, copy, start], { autoAlpha: 1, clearProps: 'transform,visibility,opacity' });
            return;
        }

        gsap.timeline({ defaults: { ease: 'power3.out' } })
            .fromTo(frame, { autoAlpha: 0, scale: 0.96, y: 18 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.58 })
            .fromTo(rings, { autoAlpha: 0, scale: 0.72 }, { autoAlpha: 1, scale: 1, duration: 0.7, stagger: 0.08 }, '-=0.32')
            .fromTo(logo, { autoAlpha: 0, scale: 0.78, rotation: -6 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.62, ease: 'back.out(1.7)' }, '-=0.45')
            .fromTo(copy, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.38, stagger: 0.08 }, '-=0.18')
            .fromTo(start, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.34 }, '-=0.14');

        gsap.to(rings, {
            scale: (index) => 1.06 + index * 0.035,
            autoAlpha: (index) => 0.5 - index * 0.08,
            duration: 2.4,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            stagger: 0.18,
        });
    }, { scope: rootRef, dependencies: [scene] });

    useGSAP(() => {
        const root = rootRef.current;
        if (!root || scene !== 'wizard') return;

        const shell = root.querySelector('[data-wizard-shell]');
        const stepRing = root.querySelector('[data-step-ring]');
        const items = root.querySelectorAll('[data-wizard-item]');

        if (prefersReducedMotion()) {
            gsap.set([shell, stepRing, items], { autoAlpha: 1, clearProps: 'transform,visibility,opacity' });
            return;
        }

        gsap.fromTo(shell, { autoAlpha: 0, y: 18, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out', clearProps: 'transform,visibility,opacity' });
        gsap.fromTo(stepRing, { autoAlpha: 0, scale: 0.72, rotation: -8 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.42, ease: 'back.out(1.7)', clearProps: 'transform,visibility,opacity' });
        gsap.fromTo(items, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.34, stagger: 0.055, ease: 'power3.out', clearProps: 'transform,visibility,opacity' });
    }, { scope: rootRef, dependencies: [scene, step] });

    useGSAP(() => {
        const root = rootRef.current;
        if (!root || scene !== 'launch' || launchStartedRef.current) return;

        launchStartedRef.current = true;

        const frame = root.querySelector<HTMLElement>('[data-launch-frame]');
        const mark = root.querySelector<HTMLElement>('[data-launch-mark]');
        const copy = root.querySelectorAll<HTMLElement>('[data-launch-copy]');
        const loader = root.querySelector<HTMLElement>('[data-launch-loader]');
        const progress = root.querySelector<HTMLElement>('[data-launch-progress]');
        const pulse = root.querySelector<HTMLElement>('[data-launch-pulse]');

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

        if (prefersReducedMotion()) {
            submitSetup();
            return;
        }

        gsap.killTweensOf([frame, mark, copy, loader, progress, pulse]);
        gsap.set(progress, { width: '18%' });
        gsap.set(pulse, { xPercent: -120, autoAlpha: 1 });

        const pulseTween = pulse
            ? gsap.to(pulse, {
                xPercent: 120,
                duration: 0.92,
                ease: 'power2.inOut',
                repeat: -1,
                paused: true,
            })
            : null;

        gsap.timeline({
            defaults: { ease: 'power3.out' },
            onComplete: () => {
                storePageTransition({
                    from: '/setup',
                    to: '/',
                    enterFrom: 0,
                    exitTo: 0,
                    kind: 'setup-complete',
                });
                createPageTransitionLayer(root);
                pulseTween?.kill();
                submitSetup();
            },
        })
            .fromTo(frame, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0)
            .fromTo(mark, { scale: 0.92, rotation: -3 }, { scale: 1, rotation: 0, duration: 0.34, ease: 'back.out(1.7)' }, 0.08)
            .to(progress, { width: '82%', duration: 0.92, ease: 'power2.out' }, 0.14)
            .call(() => pulseTween?.play(), [], 0.18)
            .to({}, { duration: 0.22 }, 1.08);
    }, { scope: rootRef, dependencies: [scene] });

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

    const StepIcon = steps[step].icon;

    return (
        <main ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#090b08] text-white">
            <Background />

            {scene === 'intro' && (
                <section className="relative grid min-h-screen place-items-center px-5 py-8">
                    <div className="grid w-full max-w-[760px] place-items-center rounded-[36px] border border-white/10 bg-black/38 px-6 py-12 text-center shadow-[0_34px_120px_rgb(0_0_0/0.45)] backdrop-blur-md" data-intro-frame>
                        <div className="relative grid size-[260px] place-items-center md:size-[320px]">
                            <span className="absolute inset-0 rounded-full border border-[#b7ff63]/24" data-intro-ring />
                            <span className="absolute inset-6 rounded-full border border-white/12" data-intro-ring />
                            <span className="absolute inset-12 rounded-full bg-[#b7ff63]/8 blur-2xl" data-intro-ring />
                            <div className="relative grid size-[170px] place-items-center rounded-[42px] bg-white p-6 shadow-[0_28px_90px_rgb(183_255_99/0.22)] md:size-[210px]" data-intro-logo>
                                <img src="/images/stupid-log/stupid-log.png" alt="Stupid Log" className="size-full object-contain" />
                            </div>
                        </div>

                        <div className="mt-8" data-intro-copy>
                            <div className="text-xs font-black uppercase text-[#b7ff63]">Stupid Log</div>
                            <h1 className="mt-2 text-5xl font-black leading-none md:text-7xl">Press Start</h1>
                        </div>

                        <div className="mt-8" data-intro-start>
                            <ControlButton tone="lime" onClick={startWizard}>
                                <Play size={17} strokeWidth={3} />
                                Start
                            </ControlButton>
                        </div>
                    </div>
                </section>
            )}

            {scene === 'wizard' && (
                <form onSubmit={submit} className="relative grid min-h-screen place-items-center px-5 py-8">
                    <div className="grid w-full max-w-[840px] gap-5 rounded-[36px] border border-white/10 bg-black/42 p-5 shadow-[0_34px_120px_rgb(0_0_0/0.45)] backdrop-blur-md md:p-7" data-wizard-shell>
                        <header className="grid gap-5 border-b border-white/10 pb-5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="grid size-14 place-items-center rounded-[20px] bg-white p-2">
                                        <img src="/images/stupid-log/stupid-log.png" alt="" className="size-full object-contain" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black uppercase text-[#b7ff63]">{steps[step].eyebrow}</div>
                                        <div className="mt-0.5 text-lg font-black text-white/72">Setup</div>
                                    </div>
                                </div>
                                <div className="grid size-12 place-items-center rounded-full border border-[#b7ff63]/35 bg-[#b7ff63]/10 text-[#b7ff63]" data-step-ring>
                                    <StepIcon size={22} strokeWidth={3} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {steps.map((item, index) => {
                                    const active = step === index;
                                    const complete = step > index;

                                    return (
                                        <button
                                            key={item.eyebrow}
                                            type="button"
                                            onClick={() => setStep(index)}
                                            className={`h-2 rounded-full transition ${active || complete ? 'bg-[#b7ff63]' : 'bg-white/12'}`}
                                            aria-label={item.title}
                                            data-wizard-item
                                        />
                                    );
                                })}
                            </div>
                        </header>

                        <section className="min-h-[430px] py-3">
                            <div className="mb-7" data-wizard-item>
                                <h2 className="text-4xl font-black leading-none md:text-6xl">{steps[step].title}</h2>
                                <p className="mt-3 max-w-[560px] text-sm font-bold leading-relaxed text-white/48">{steps[step].detail}</p>
                            </div>

                            {step === 0 && (
                                <div className="grid gap-4">
                                    <TextField label="Username" required value={form.username} onChange={(value) => updateField('username', value)} placeholder="Player One" />
                                    <div className="rounded-[22px] bg-[#b7ff63] p-5 text-black" data-wizard-item>
                                        <div className="flex items-start gap-3">
                                            <Gamepad2 className="mt-0.5 shrink-0" size={24} strokeWidth={3} />
                                            <div>
                                                <div className="text-lg font-black">Your library starts empty.</div>
                                                <p className="mt-1 text-sm font-bold leading-relaxed text-black/62">Add games manually or connect providers after launch.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="grid gap-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="grid gap-4 rounded-[24px] bg-white/[0.06] p-5 ring-1 ring-white/10" data-wizard-item>
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-xs font-black uppercase text-[#b7ff63]">Metadata</div>
                                                    <h3 className="mt-1 text-2xl font-black">IGDB</h3>
                                                </div>
                                                <Database size={26} strokeWidth={3} />
                                            </div>
                                            <TextField label="Client ID" value={form.igdb_client_id} onChange={(value) => updateField('igdb_client_id', value)} placeholder="IGDB client ID" />
                                            <TextField label="Client Secret" type="password" value={form.igdb_client_secret} onChange={(value) => updateField('igdb_client_secret', value)} placeholder="IGDB client secret" />
                                            <ControlButton tone="ghost" disabled={testing !== null} onClick={() => void testProvider('igdb')}>
                                                {testing === 'igdb' ? <Loader2 className="animate-spin" size={17} strokeWidth={3} /> : <ShieldCheck size={17} strokeWidth={3} />}
                                                {testing === 'igdb' ? 'Testing IGDB' : 'Test IGDB'}
                                            </ControlButton>
                                        </div>

                                        <div className="grid content-start gap-4 rounded-[24px] bg-white/[0.06] p-5 ring-1 ring-white/10" data-wizard-item>
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-xs font-black uppercase text-[#b7ff63]">Store</div>
                                                    <h3 className="mt-1 text-2xl font-black">Steam</h3>
                                                </div>
                                                <KeyRound size={26} strokeWidth={3} />
                                            </div>
                                            <TextField label="API Key" type="password" value={form.steam_api_key} onChange={(value) => updateField('steam_api_key', value)} placeholder="Optional Steam API key" />
                                            <ControlButton tone="ghost" disabled={testing !== null} onClick={() => void testProvider('steam')}>
                                                {testing === 'steam' ? <Loader2 className="animate-spin" size={17} strokeWidth={3} /> : <ShieldCheck size={17} strokeWidth={3} />}
                                                {testing === 'steam' ? 'Testing Steam' : 'Test Steam'}
                                            </ControlButton>
                                        </div>
                                    </div>
                                    <TestMessage result={testResult} />
                                </div>
                            )}

                            {step === 2 && (
                                <div className="grid gap-4">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <SummaryRow label="Player" value={form.username || 'Missing'} />
                                        <SummaryRow label="IGDB" value={form.igdb_client_id && form.igdb_client_secret ? 'Ready' : 'Later'} />
                                        <SummaryRow label="Steam" value={form.steam_api_key ? 'Ready' : 'Later'} />
                                    </div>
                                    <div className="overflow-hidden rounded-[26px] border border-[#b7ff63]/30 bg-[#b7ff63] p-6 text-black" data-wizard-item>
                                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <div className="text-xs font-black uppercase text-black/52">Ready</div>
                                                <h3 className="mt-2 text-4xl font-black leading-none">Open Stupid Log.</h3>
                                            </div>
                                            <ControlButton type="submit" tone="dark" disabled={submitting}>
                                                <Save size={17} strokeWidth={3} />
                                                {submitting ? 'Opening' : 'Enter app'}
                                            </ControlButton>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                            <ControlButton tone="ghost" disabled={step === 0 || submitting} onClick={() => setStep((current) => Math.max(0, current - 1))}>
                                <ArrowLeft size={17} strokeWidth={3} />
                                Back
                            </ControlButton>
                            {step < steps.length - 1 ? (
                                <ControlButton tone="lime" disabled={submitting} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>
                                    Continue
                                    <ArrowRight size={17} strokeWidth={3} />
                                </ControlButton>
                            ) : (
                                <ControlButton type="submit" tone="lime" disabled={submitting}>
                                    <Save size={17} strokeWidth={3} />
                                    {submitting ? 'Opening' : 'Finish setup'}
                                </ControlButton>
                            )}
                        </footer>
                    </div>
                </form>
            )}

            {scene === 'launch' && (
                <section className="relative grid min-h-screen place-items-center overflow-hidden bg-[#090b08] px-5 py-8 text-center text-white" data-launch-frame>
                    <Background />
                    <div className="absolute inset-0 bg-[#b7ff63]/10" />
                    <div className="relative grid place-items-center px-6">
                        <div className="grid size-[168px] place-items-center rounded-[44px] bg-white p-8 shadow-[0_28px_90px_rgb(183_255_99/0.2)]" data-launch-mark>
                            <img src="/images/stupid-log/stupid-log.png" alt="" className="size-full object-contain" />
                        </div>
                        <div className="mt-6 text-xs font-black uppercase tracking-[0.32em] text-[#b7ff63]" data-launch-copy>Stupid Log</div>
                        <div className="mt-3 text-5xl font-black leading-none md:text-7xl" data-launch-copy>Opening Log</div>
                        <div className="mt-8 grid w-[min(70vw,430px)] gap-3" data-launch-loader>
                            <div className="h-3.5 overflow-hidden rounded-full bg-white/14 p-1">
                                <div className="relative h-full w-[18%] overflow-hidden rounded-full bg-[#b7ff63]" data-launch-progress>
                                    <div className="absolute inset-y-0 w-1/3 rounded-full bg-white/80 blur-[1px]" data-launch-pulse />
                                </div>
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/38">Preparing home base</div>
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}
