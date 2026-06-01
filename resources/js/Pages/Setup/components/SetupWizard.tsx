import { ArrowLeft, ArrowRight, Database, Gamepad2, KeyRound, Loader2, Save, ShieldCheck } from 'lucide-react';
import { Dispatch, KeyboardEvent, SetStateAction } from 'react';
import { steps } from '../constants';
import { Provider, SetupForm, TestResult } from '../types';
import { ControlButton, SummaryRow, TestMessage, TextField } from './SetupControls';

export default function SetupWizard({
    step,
    form,
    updateField,
    finishSetup,
    testProvider,
    testing,
    testResult,
    setStep,
    submitting,
}: {
    step: number;
    form: SetupForm;
    updateField: <Key extends keyof SetupForm>(key: Key, value: SetupForm[Key]) => void;
    finishSetup: () => void;
    testProvider: (provider: Provider) => Promise<void>;
    testing: Provider | null;
    testResult: TestResult | null;
    setStep: Dispatch<SetStateAction<number>>;
    submitting: boolean;
}) {
    const StepIcon = steps[step].icon;
    const advanceStep = () => setStep((current) => Math.min(steps.length - 1, current + 1));
    const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
        if (event.key !== 'Enter') return;
        const target = event.target as HTMLElement;

        if (target.tagName === 'TEXTAREA') return;

        event.preventDefault();
        if (step < steps.length - 1) {
            advanceStep();
        }
    };

    return (
        <form onSubmit={(event) => event.preventDefault()} onKeyDown={handleKeyDown} className="relative grid min-h-screen place-items-center px-5 py-8">
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
                                    <ControlButton tone="dark" disabled={submitting} onClick={finishSetup}>
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
                        <ControlButton tone="lime" disabled={submitting} onClick={advanceStep}>
                            Continue
                            <ArrowRight size={17} strokeWidth={3} />
                        </ControlButton>
                    ) : (
                        <ControlButton tone="lime" disabled={submitting} onClick={finishSetup}>
                            <Save size={17} strokeWidth={3} />
                            {submitting ? 'Opening' : 'Finish setup'}
                        </ControlButton>
                    )}
                </footer>
            </div>
        </form>
    );
}
