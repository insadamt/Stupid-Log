import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '../../animation';
import AppLayout from '../../Components/AppLayout';
import { ConfirmedYearStats, StatsData } from '../../types';
import { SlideNav } from './components/Controls';
import { statsRevealAfterTabDelay, statsTabTransitionDuration, tabs } from './constants';
import { StatsRevealDelayContext } from './revealDelay';
import { StatsComparison, StatView, TabKey } from './types';
import ArchivePanel from './views/ArchivePanel';
import BestGames from './views/BestGames';
import Breakdowns from './views/Breakdowns';
import Overview from './views/Overview';
import Progression from './views/Progression';

export default function Stats({ stats, confirmedYears = [] }: { stats: StatsData; confirmedYears?: ConfirmedYearStats[] }) {
    const panelShellRef = useRef<HTMLElement>(null);
    const panelContentRef = useRef<HTMLDivElement>(null);
    const pendingTabTransition = useRef<{ enterFrom: number; exitTo: number; clone: HTMLElement | null } | null>(null);
    const [view, setView] = useState<'all-time' | string>('all-time');
    const [bestGamesView, setBestGamesView] = useState<'latest' | string>('latest');
    const [active, setActive] = useState<TabKey>('overview');
    const yearsAsc = useMemo(() => [...confirmedYears].sort((a, b) => a.year - b.year), [confirmedYears]);
    const yearsDesc = useMemo(() => [...confirmedYears].sort((a, b) => b.year - a.year), [confirmedYears]);
    const selectedYear = view === 'all-time' ? null : confirmedYears.find((year) => String(year.year) === view) ?? null;
    const previousYear = selectedYear ? [...yearsAsc].filter((year) => year.year < selectedYear.year).pop() ?? null : null;
    const latestYear = yearsDesc[0] ?? null;
    const bestGamesMode = active === 'best-games';
    const selectedBestGamesYear = bestGamesView === 'latest' ? latestYear : confirmedYears.find((year) => String(year.year) === bestGamesView) ?? latestYear;
    const headerSnapshot = bestGamesMode ? selectedBestGamesYear : selectedYear;
    const current: StatView = selectedYear ?? stats;
    const previous: StatView | null = selectedYear ? previousYear : latestYear;
    const comparison: StatsComparison = selectedYear
        ? {
            currentLabel: `${selectedYear.year} confirmed snapshot`,
            previousLabel: previousYear ? `${previousYear.year} confirmed snapshot` : null,
            mode: 'year',
            hasPrevious: previousYear !== null,
            contextLabel: previousYear
                ? `Compared with ${previousYear.year} confirmed snapshot`
                : 'No previous snapshot available for comparison',
        }
        : {
            currentLabel: 'All-Time live stats',
            previousLabel: latestYear ? `${latestYear.year} confirmed snapshot` : null,
            mode: 'all-time',
            hasPrevious: latestYear !== null,
            contextLabel: latestYear
                ? `Compared with latest confirmed snapshot: ${latestYear.year}`
                : 'No previous snapshot available for comparison',
        };
    const displayedYear = bestGamesMode ? selectedBestGamesYear?.year ?? null : selectedYear?.year ?? latestYear?.year ?? null;
    const yearIndex = displayedYear ? yearsAsc.findIndex((year) => year.year === displayedYear) : -1;

    useGSAP(() => {
        const transition = pendingTabTransition.current;
        const content = panelContentRef.current;

        if (!transition || !content) return;

        pendingTabTransition.current = null;

        if (prefersReducedMotion()) {
            transition.clone?.remove();
            gsap.set(content, { autoAlpha: 1, clearProps: 'transform,visibility,opacity' });
            return;
        }

        const timeline = gsap.timeline({
            defaults: { duration: statsTabTransitionDuration, ease: 'power3.inOut' },
            onComplete: () => transition.clone?.remove(),
        });

        timeline.fromTo(
            content,
            { xPercent: transition.enterFrom, autoAlpha: 1 },
            { xPercent: 0, autoAlpha: 1, clearProps: 'transform,visibility,opacity' },
            0,
        );

        if (transition.clone) {
            timeline.to(
                transition.clone,
                { xPercent: transition.exitTo, autoAlpha: 1 },
                0,
            );
        }
    }, { scope: panelShellRef, dependencies: [active] });

    function setActiveTab(next: TabKey) {
        if (next === active) return;

        const currentIndex = tabs.findIndex((tab) => tab.key === active);
        const nextIndex = tabs.findIndex((tab) => tab.key === next);

        if (currentIndex < 0 || nextIndex < 0 || prefersReducedMotion()) {
            setActive(next);
            return;
        }

        const shell = panelShellRef.current;
        const content = panelContentRef.current;
        const nextIsRight = nextIndex > currentIndex;
        const clone = content?.cloneNode(true) as HTMLElement | undefined;

        if (shell && content && clone) {
            const bounds = content.getBoundingClientRect();
            const shellBounds = shell.getBoundingClientRect();

            clone.style.position = 'absolute';
            clone.style.left = `${bounds.left - shellBounds.left}px`;
            clone.style.top = `${bounds.top - shellBounds.top}px`;
            clone.style.width = `${bounds.width}px`;
            clone.style.height = `${bounds.height}px`;
            clone.style.zIndex = '20';
            clone.style.pointerEvents = 'none';
            clone.style.margin = '0';

            shell.appendChild(clone);
        }

        pendingTabTransition.current = {
            enterFrom: nextIsRight ? 100 : -100,
            exitTo: nextIsRight ? -100 : 100,
            clone: clone ?? null,
        };

        setActive(next);
    }

    const stepYear = (direction: number) => {
        if (yearsAsc.length === 0) return;
        const base = yearIndex >= 0 ? yearIndex : yearsAsc.length - 1;
        const next = Math.max(0, Math.min(yearsAsc.length - 1, base + direction));
        setView(String(yearsAsc[next].year));
    };

    const stepBestGamesYear = (direction: number) => {
        if (yearsAsc.length === 0) return;
        const base = selectedBestGamesYear ? yearsAsc.findIndex((year) => year.year === selectedBestGamesYear.year) : yearsAsc.length - 1;
        const next = Math.max(0, Math.min(yearsAsc.length - 1, base + direction));
        setBestGamesView(String(yearsAsc[next].year));
    };

    const panel = active === 'overview'
        ? <Overview stats={current} previous={previous} selectedYear={selectedYear} comparison={comparison} />
        : active === 'breakdowns'
            ? <Breakdowns stats={current} previous={previous} comparison={comparison} />
            : active === 'progression'
                ? <Progression stats={current} previous={previous} comparison={comparison} />
                : active === 'best-games'
                    ? <BestGames year={selectedBestGamesYear} />
                    : <ArchivePanel stats={current} comparison={comparison} />;
    const panelRevealDelay = pendingTabTransition.current ? statsRevealAfterTabDelay : 0;

    return (
        <AppLayout title="Stats" lockViewport>
            <section className="h-full overflow-hidden px-4 py-3 md:pl-[88px] md:pr-6">
                <div className="mx-auto grid h-full max-w-[1540px] grid-rows-[120px_minmax(0,1fr)_112px] gap-4 overflow-hidden">
                    <header className="rounded-[34px] bg-black px-6 py-5 text-white shadow-[0_24px_80px_rgb(0_0_0/0.20)]">
                        <div className="grid h-full gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
                            <div className="min-w-0">
                                <div className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-[#b7ff63]/70">
                                    {bestGamesMode ? (headerSnapshot ? `${headerSnapshot.year} confirmed snapshot` : 'No confirmed snapshots') : comparison.currentLabel}
                                    {!bestGamesMode && <span className="text-white/45"> · {comparison.contextLabel}</span>}
                                </div>
                                <div className="mt-1 flex items-end gap-4">
                                    <h1 className="text-6xl font-black leading-none tracking-[-0.06em]">Stats</h1>
                                    <p className="mb-2 hidden max-w-2xl truncate text-sm font-bold text-white/38 xl:block">Fixed screen modules. Data overflow stays inside game-style containers.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {!bestGamesMode && <button type="button" onClick={() => setView('all-time')} className={`rounded-[22px] px-6 py-4 text-sm font-black uppercase tracking-[0.16em] transition ${view === 'all-time' ? 'bg-[#b7ff63] text-black' : 'bg-white/8 text-white/50 hover:text-white'}`}>All Time</button>}
                                {bestGamesMode ? (
                                    <div className="flex items-center gap-2 rounded-[24px] bg-white/8 p-2">
                                        <button type="button" onClick={() => stepBestGamesYear(-1)} disabled={yearsAsc.length === 0 || yearIndex <= 0} className="grid size-11 place-items-center rounded-[18px] bg-black text-white ring-1 ring-white/10 transition hover:text-[#b7ff63] disabled:cursor-not-allowed disabled:opacity-25"><ChevronLeft size={18} /></button>
                                        <span className="block min-w-[116px] rounded-[18px] bg-[#b7ff63] px-5 py-3 text-center text-lg font-black tracking-[0.1em] text-black">{displayedYear ?? '—'}</span>
                                        <button type="button" onClick={() => stepBestGamesYear(1)} disabled={yearsAsc.length === 0 || yearIndex >= yearsAsc.length - 1} className="grid size-11 place-items-center rounded-[18px] bg-black text-white ring-1 ring-white/10 transition hover:text-[#b7ff63] disabled:cursor-not-allowed disabled:opacity-25"><ChevronRight size={18} /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 rounded-[24px] bg-white/8 p-2">
                                        <button type="button" onClick={() => stepYear(-1)} disabled={yearsAsc.length === 0 || yearIndex <= 0} className="grid size-11 place-items-center rounded-[18px] bg-black text-white ring-1 ring-white/10 transition hover:text-[#b7ff63] disabled:cursor-not-allowed disabled:opacity-25"><ChevronLeft size={18} /></button>
                                        <button type="button" onClick={() => displayedYear && setView(String(displayedYear))} disabled={!displayedYear} className={`min-w-[116px] rounded-[18px] px-5 py-3 text-center text-lg font-black tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-35 ${selectedYear ? 'bg-[#b7ff63] text-black' : 'bg-white/7 text-white/55 hover:text-white'}`}>{displayedYear ?? '—'}</button>
                                        <button type="button" onClick={() => stepYear(1)} disabled={yearsAsc.length === 0 || yearIndex >= yearsAsc.length - 1} className="grid size-11 place-items-center rounded-[18px] bg-black text-white ring-1 ring-white/10 transition hover:text-[#b7ff63] disabled:cursor-not-allowed disabled:opacity-25"><ChevronRight size={18} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>
                    <main ref={panelShellRef} className="relative min-h-0 overflow-hidden rounded-[34px] border border-black/8 bg-white/35 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.58)]">
                        <div ref={panelContentRef} className="relative z-10 h-full min-h-0">
                            <StatsRevealDelayContext.Provider key={active} value={panelRevealDelay}>
                                {panel}
                            </StatsRevealDelayContext.Provider>
                        </div>
                    </main>
                    <SlideNav active={active} setActive={setActiveTab} />
                </div>
            </section>
        </AppLayout>
    );
}
