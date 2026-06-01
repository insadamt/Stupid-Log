import Background from './Background';

export default function SetupLaunch() {
    return (
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
    );
}
