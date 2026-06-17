import { Clock3, Dice5, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { gsap, motion, prefersReducedMotion, useGSAP } from '../../animation';
import AppLayout from '../../Components/AppLayout';
import { GameCardData, HomeWidgetsData, StatsData } from '../../types';
import BriefPanel from './components/BriefPanel';
import HomeGameWidget from './components/HomeGameWidget';

export default function Home({
    stats,
    homeWidgets,
}: {
    stats: StatsData;
    homeWidgets: HomeWidgetsData;
}) {
    const pageRef = useRef<HTMLElement>(null);
    const randomWidgetRef = useRef<HTMLElement>(null);
    const randomCoverRef = useRef<HTMLDivElement>(null);
    const [randomGame, setRandomGame] = useState<GameCardData | null>(homeWidgets.randomGame);
    const [pickingRandomGame, setPickingRandomGame] = useState(false);

    const { contextSafe } = useGSAP(() => {
        if (prefersReducedMotion()) return;

        gsap.timeline({ defaults: { ease: motion.ease.out } })
            .from('[data-home-shell]', { autoAlpha: 0, y: 18, scale: 0.985, duration: motion.duration.slow }, 0)
            .from('[data-home-copy]', { autoAlpha: 0, x: -18, duration: motion.duration.normal }, 0.12)
            .from('[data-home-widget]', { autoAlpha: 0, y: 18, duration: motion.duration.normal, stagger: 0.075 }, 0.18)
            .from('[data-home-stat]', { autoAlpha: 0, y: 10, duration: motion.duration.fast, stagger: 0.035 }, 0.3);
    }, { scope: pageRef });

    const pickRandomGame = contextSafe(() => {
        if (pickingRandomGame) return;

        setPickingRandomGame(true);

        if (!prefersReducedMotion()) {
            gsap.timeline()
                .to(randomWidgetRef.current, {
                    y: -4,
                    x: 8,
                    rotation: 0.35,
                    duration: 0.08,
                    ease: 'none',
                    repeat: 3,
                    yoyo: true,
                }, 0)
                .to(randomCoverRef.current, {
                    rotation: 360,
                    scale: 0.9,
                    duration: 0.42,
                    ease: motion.ease.inOut,
                }, 0);
        }

        fetch('/home/random-game', { headers: { Accept: 'application/json' } })
            .then((response) => response.json())
            .then((payload) => setRandomGame(payload.game ?? null))
            .finally(() => {
                setPickingRandomGame(false);

                if (!prefersReducedMotion()) {
                    const randomCopy = randomWidgetRef.current?.querySelectorAll('[data-random-copy]') ?? [];

                    gsap.timeline({ defaults: { ease: motion.ease.out } })
                        .fromTo(
                            randomWidgetRef.current,
                            { y: 16, scale: 0.975, rotation: -0.4 },
                            { y: 0, x: 0, scale: 1, rotation: 0, duration: motion.duration.slow },
                            0,
                        )
                        .fromTo(
                            randomCoverRef.current,
                            { rotation: -8, scale: 0.9, autoAlpha: 0.4 },
                            { rotation: 2, scale: 1, autoAlpha: 1, duration: motion.duration.slow },
                            0.04,
                        )
                        .fromTo(
                            randomCopy,
                            { y: 12, autoAlpha: 0 },
                            { y: 0, autoAlpha: 1, duration: motion.duration.normal, stagger: 0.045 },
                            0.12,
                        );
                }
            });
    });

    return (
        <AppLayout title="Home" lockViewport>
            <section ref={pageRef} className="grid h-full min-h-0 place-items-center pl-[88px]">
                <main data-home-shell className="relative grid h-full max-h-[880px] min-h-0 w-full max-w-[1500px] grid-rows-[auto_minmax(0,1fr)_auto] gap-6 overflow-hidden rounded-[46px] border border-[#b7ff63]/12 bg-[#07100d] p-7 text-white shadow-[0_32px_90px_rgb(0_0_0/0.3)]">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgb(183_255_99/0.1),transparent_34%),linear-gradient(90deg,rgb(255_255_255/0.045),transparent_42%)]" />
                    <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />

                    <header className="relative z-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        <div data-home-copy>
                            <div className="flex flex-wrap items-center gap-3">
                                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#b7ff63]">Stupid Log</p>
                                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/36">
                                    Library Lounge
                                </span>
                            </div>
                        </div>
                        <a href="/library" className="inline-flex h-12 items-center justify-center rounded-full bg-[#b7ff63] px-6 text-sm font-black text-black shadow-[0_16px_34px_rgb(183_255_99/0.16)] transition hover:-translate-y-0.5">
                            Open Library
                        </a>
                    </header>

                    <section className="relative z-10 grid min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
                        <HomeGameWidget
                            ref={randomWidgetRef}
                            coverRef={randomCoverRef}
                            variant="feature"
                            title="Pick Random Game"
                            eyebrow="Unfinished Only"
                            game={randomGame}
                            icon={Dice5}
                            emptyTitle="Nothing unfinished."
                            emptyText="Random picks only use Not Played, In Progress, or Dropped games."
                            action={{
                                label: randomGame ? 'Pick Again' : 'Pick Game',
                                loading: pickingRandomGame,
                                onClick: pickRandomGame,
                            }}
                        />

                        <aside className="grid min-h-0 gap-4">
                            <HomeGameWidget
                                variant="compact"
                                title="Last Added"
                                eyebrow="Newest File"
                                game={homeWidgets.lastAddedGame}
                                icon={Sparkles}
                                emptyTitle="No games yet."
                                emptyText="Add a game to start filling the home shelf."
                            />

                            <HomeGameWidget
                                variant="compact"
                                title="Last Completed"
                                eyebrow="Latest Clear"
                                game={homeWidgets.lastCompletedGame}
                                icon={Clock3}
                                emptyTitle="No clears yet."
                                emptyText="Completed and 100% games will appear here after they are logged."
                            />
                        </aside>
                    </section>

                    <div className="relative z-10">
                        <BriefPanel stats={stats} />
                    </div>
                </main>
            </section>
        </AppLayout>
    );
}
