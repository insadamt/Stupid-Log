import { BarChart3 } from 'lucide-react';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Flip } from 'gsap/Flip';
import { gsap, motion, prefersReducedMotion, useGSAP } from '../../../animation';
import PlatformIcon from '../../../Components/PlatformIcon';
import { chartRowsRevealGap } from '../constants';
import { StatsRevealDelayContext, useStatsRevealDelay } from '../revealDelay';
import { ChartConfig } from '../types';
import { animationKey, percentLabel } from '../utils';
import { DeltaBadge } from './Badges';
import Donut from './Donut';
import { ProgressBar } from './Progress';

gsap.registerPlugin(Flip);

export default function GameUiChart({ config }: { config: ChartConfig }) {
    const chartRef = useRef<HTMLElement>(null);
    const hasRevealed = useRef(false);
    const revealDelay = useStatsRevealDelay();
    const donutData = [...config.data].sort((a, b) => b.value - a.value);
    const incomingData = donutData.filter((slice) => slice.value > 0);
    const [renderedData, setRenderedData] = useState(incomingData);
    const data = renderedData;
    const sum = data.reduce((acc, slice) => acc + slice.value, 0);
    const incomingChartKey = animationKey([config.title, config.eyebrow, ...incomingData.map((slice) => `${slice.label}:${slice.value}`)]);
    const renderedChartKey = animationKey([config.title, config.eyebrow, ...data.map((slice) => `${slice.label}:${slice.value}`)]);
    const rowRevealDelay = hasRevealed.current ? 0 : revealDelay + chartRowsRevealGap;
    const markRowsRevealed = (rows: HTMLElement[]) => {
        hasRevealed.current = true;
        rows.forEach((row) => {
            row.dataset.revealed = 'true';
        });
    };

    useGSAP(() => {
        const chart = chartRef.current;
        if (!chart || incomingChartKey === renderedChartKey) return;

        if (!hasRevealed.current || prefersReducedMotion()) {
            setRenderedData(incomingData);
            return;
        }

        const rows = Array.from(chart.querySelectorAll<HTMLElement>('[data-chart-row]'));
        const state = Flip.getState(rows);

        flushSync(() => {
            setRenderedData(incomingData);
        });

        const nextRows = Array.from(chart.querySelectorAll<HTMLElement>('[data-chart-row]'));

        Flip.from(state, {
            targets: [...rows, ...nextRows],
            duration: motion.duration.slow,
            ease: motion.ease.inOut,
            stagger: 0.045,
            absolute: true,
            absoluteOnLeave: true,
            prune: true,
            nested: true,
            onEnter: (elements) => gsap.fromTo(
                elements,
                { y: motion.distance.small, scale: 0.94, autoAlpha: 0 },
                { y: 0, scale: 1, autoAlpha: 1, duration: motion.duration.normal, ease: motion.ease.out, stagger: 0.04 },
            ),
            onLeave: (elements) => gsap.to(elements, {
                y: -motion.distance.small,
                scale: 0.94,
                autoAlpha: 0,
                duration: motion.duration.fast,
                ease: motion.ease.sharp,
            }),
        });
    }, { scope: chartRef, dependencies: [incomingChartKey, renderedChartKey] });

    useGSAP(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const rows = Array.from(chart.querySelectorAll<HTMLElement>('[data-chart-row]'));
        if (!rows.length) {
            hasRevealed.current = true;
            return;
        }

        if (prefersReducedMotion()) {
            gsap.set(rows, { autoAlpha: 1, clearProps: 'transform,visibility,opacity' });
            hasRevealed.current = true;
            return;
        }

        if (hasRevealed.current) {
            markRowsRevealed(rows.filter((row) => !row.dataset.revealed));
        } else {
            markRowsRevealed(rows);
        }
    }, { scope: chartRef, dependencies: [renderedChartKey] });

    return (
        <article ref={chartRef} className="grid h-full min-h-0 grid-cols-[1.15fr_1fr] gap-4 rounded-[30px] bg-black p-4 text-white shadow-[0_24px_75px_rgb(0_0_0/0.2)]">
            <section className="grid min-h-0 grid-rows-[auto_1fr] rounded-[26px] bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 ring-1 ring-white/8">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.26em] text-[#b7ff63]/70">{config.eyebrow}</div>
                    <div className="mt-2 flex items-start justify-between gap-3">
                        <h2 className="text-4xl font-black leading-none text-[#9BE44D]">{config.title}</h2>
                        <DeltaBadge value={config.delta} compact />
                    </div>
                </div>
                <div className="grid min-h-0 place-items-center">
                    <Donut data={donutData} total={config.total} center={config.center} format={config.format} />
                </div>
            </section>
            <section className="min-h-0 rounded-[26px] bg-white/[0.06] p-4 ring-1 ring-white/8">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Metric entries</div>
                    <div className="grid size-11 place-items-center rounded-2xl bg-[#b7ff63] text-black"><BarChart3 size={22} strokeWidth={3} /></div>
                </div>
                <div className="mt-4 grid max-h-[calc(100%-60px)] gap-3 overflow-y-auto pr-1">
                    {data.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm font-bold text-white/35">No rows available.</div>}
                    {data.map((slice) => {
                        const percent = sum > 0 ? (slice.value / sum) * 100 : 0;
                        const rowDelay = rowRevealDelay + data.findIndex((item) => item.label === slice.label) * 0.1;
                        return (
                            <div
                                key={slice.label}
                                data-chart-row
                                data-flip-id={slice.label}
                                className="rounded-[22px] bg-white/[0.07] p-4 ring-1 ring-white/8"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex min-w-0 items-center gap-3 text-sm font-black text-white/75">
                                        {config.showPlatformIcons ? (
                                            <span className="flex shrink-0 items-center gap-2">
                                                <PlatformIcon platform={slice.label} surface="dark" size="sm" />
                                                <span className="size-3 rounded-full ring-2 ring-white/12" style={{ backgroundColor: slice.color }} />
                                            </span>
                                        ) : (
                                            <span className="size-3 rounded-full" style={{ backgroundColor: slice.color }} />
                                        )}
                                        <span className="truncate">{slice.label}</span>
                                    </span>
                                    <span className="text-sm font-black text-white/80">{percentLabel(percent)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3 text-xs font-black text-white/35">
                                    <span>{config.format(slice.value)}</span>
                                    <DeltaBadge value={slice.growth} compact />
                                </div>
                                <StatsRevealDelayContext.Provider value={rowDelay}>
                                    <div className="mt-3">
                                        <ProgressBar value={percent} tone="dark" />
                                    </div>
                                </StatsRevealDelayContext.Provider>
                            </div>
                        );
                    })}
                </div>
            </section>
        </article>
    );
}
