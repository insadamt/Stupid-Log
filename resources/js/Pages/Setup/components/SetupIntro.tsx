import { ArchiveRestore, Play } from 'lucide-react';
import Background from './Background';
import { ControlButton } from './SetupControls';

export default function SetupIntro({
    startFreshSetup,
    startBackupImport,
}: {
    startFreshSetup: () => void;
    startBackupImport: () => void;
}) {
    return (
        <section className="relative grid min-h-screen place-items-center px-5 py-8">
            <Background />
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

                <div className="mt-8 flex items-center gap-3" data-intro-start>
                    <ControlButton tone="lime" onClick={startFreshSetup}>
                        <Play size={17} strokeWidth={3} />
                        New setup
                    </ControlButton>
                    <ControlButton tone="ghost" onClick={startBackupImport}>
                        <ArchiveRestore size={17} strokeWidth={3} />
                        Import backup
                    </ControlButton>
                </div>
            </div>
        </section>
    );
}
