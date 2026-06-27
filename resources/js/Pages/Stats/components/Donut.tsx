import { useMemo, useRef, useState } from 'react';
import { gsap, motion, prefersReducedMotion, useGSAP } from '../../../animation';
import { useStatsRevealDelay } from '../revealDelay';
import { DonutArcLayout, Slice } from '../types';
import { animationKey, clampPercent, percentLabel } from '../utils';

const arcSeamOverlapDegrees = 0.35;
const minimumVisibleSpanDegrees = 0.01;
const fullCircleDegrees = 360;

function donutLayout(data: Slice[], order?: string[]): DonutArcLayout[] {
    const orderRank = new Map(order?.map((label, index) => [label, index]) ?? []);
    const orderedData = order
        ? [...data].sort((a, b) => (orderRank.get(a.label) ?? Number.MAX_SAFE_INTEGER) - (orderRank.get(b.label) ?? Number.MAX_SAFE_INTEGER))
        : data;
    const total = orderedData.reduce((sum, slice) => sum + slice.value, 0);
    let cursor = 0;

    if (total <= 0) return [];

    return orderedData.map((slice, index) => {
        const span = index === orderedData.length - 1 ? 360 - cursor : (slice.value / total) * 360;
        const layout = {
            label: slice.label,
            value: slice.value,
            color: slice.color,
            start: cursor,
            end: cursor + span,
        };

        cursor += span;
        return layout;
    });
}

function interpolatedDonutLayout(fromLayout: DonutArcLayout[], targetData: Slice[], progress: number, order: string[]) {
    const fromByLabel = new Map(fromLayout.map((arc) => [arc.label, arc]));
    const targetByLabel = new Map(targetData.map((slice) => [slice.label, slice]));
    const slices = order.map((label) => {
        const from = fromByLabel.get(label);
        const target = targetByLabel.get(label);

        return {
            label,
            value: (from?.value ?? 0) + ((target?.value ?? 0) - (from?.value ?? 0)) * progress,
            color: target?.color ?? from?.color ?? '#9BE44D',
        };
    });
    const layout = donutLayout(slices, order);
    const fromTotal = fromLayout.reduce((sum, arc) => sum + arc.value, 0);
    const targetTotal = targetData.reduce((sum, slice) => sum + slice.value, 0);

    if (fromTotal > 0 && targetTotal > 0) return layout;

    const currentTotal = slices.reduce((sum, slice) => sum + slice.value, 0);
    return revealedDonutLayout(layout, currentTotal / Math.max(fromTotal, targetTotal, 1));
}

function revealedDonutLayout(layout: DonutArcLayout[], progress: number) {
    const sweep = clampPercent(progress * 100) * 3.6;

    return layout.map((arc) => ({
        ...arc,
        end: sweep <= arc.start ? arc.start : Math.min(arc.end, sweep),
    }));
}

function pointOnCircle(cx: number, cy: number, radius: number, angle: number) {
    const radians = (angle - 90) * (Math.PI / 180);

    return {
        x: cx + radius * Math.cos(radians),
        y: cy + radius * Math.sin(radians),
    };
}

function donutArcPath(arc: DonutArcLayout, cx: number, cy: number, radius: number) {
    const span = Math.min(fullCircleDegrees, Math.max(0, arc.end - arc.start));
    if (span <= minimumVisibleSpanDegrees) return '';

    const endAngle = arc.start + Math.min(fullCircleDegrees, span + arcSeamOverlapDegrees);
    const start = pointOnCircle(cx, cy, radius, arc.start);
    const end = pointOnCircle(cx, cy, radius, endAngle);
    const renderedSpan = endAngle - arc.start;

    if (renderedSpan <= 180) {
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
    }

    const midpoint = pointOnCircle(cx, cy, radius, arc.start + renderedSpan / 2);
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${midpoint.x} ${midpoint.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

function centerValueTextSize(value: string) {
    if (value.length > 12) return 'text-2xl';
    if (value.length > 7) return 'text-3xl';
    if (value.length > 5) return 'text-4xl';

    return 'text-5xl';
}

export default function Donut({
    data,
    total,
    center,
    format,
}: {
    data: Slice[];
    total: string;
    center: string;
    format: (value: number) => string;
}) {
    const chartRef = useRef<HTMLDivElement>(null);
    const hasRevealed = useRef(false);
    const activeTween = useRef<gsap.core.Tween | null>(null);
    const renderedLayout = useRef<DonutArcLayout[]>([]);
    const [activeLabel, setActiveLabel] = useState<string | null>(null);
    const revealDelay = useStatsRevealDelay();
    const radius = 72;
    const strokeWidth = 24;
    const centerValueSize = centerValueTextSize(total);
    const dataKey = animationKey(data.map((slice) => `${slice.label}:${slice.value}:${slice.color}`));
    const stableOrder = useMemo(() => data.map((slice) => slice.label).sort((a, b) => a.localeCompare(b)), [dataKey]);
    const targetLayout = useMemo(() => donutLayout(data, stableOrder), [dataKey]);
    const [renderLayout, setRenderLayout] = useState<DonutArcLayout[]>(() => targetLayout.map((arc) => ({ ...arc, end: arc.start })));

    useGSAP(() => {
        if (!chartRef.current) return;

        if (prefersReducedMotion()) {
            setRenderLayout(targetLayout);
            renderedLayout.current = targetLayout;
            hasRevealed.current = true;
            return;
        }

        const tweenState = { progress: 0 };
        if (activeTween.current) {
            activeTween.current.kill();
        }

        if (!hasRevealed.current) {
            const initialLayout = revealedDonutLayout(targetLayout, 0);
            renderedLayout.current = initialLayout;
            setRenderLayout(initialLayout);
            activeTween.current = gsap.to(tweenState, {
                progress: 1,
                duration: motion.duration.page,
                delay: revealDelay,
                ease: motion.ease.out,
                onUpdate: () => {
                    const nextLayout = revealedDonutLayout(targetLayout, tweenState.progress);
                    renderedLayout.current = nextLayout;
                    setRenderLayout(nextLayout);
                },
                onComplete: () => {
                    renderedLayout.current = targetLayout;
                    hasRevealed.current = true;
                    setRenderLayout(targetLayout);
                    activeTween.current = null;
                },
            });
            return;
        }

        const fromLayout = renderedLayout.current.length ? renderedLayout.current : renderLayout;
        const transitionOrder = [...new Set([...stableOrder, ...fromLayout.map((arc) => arc.label)])]
            .sort((a, b) => a.localeCompare(b));

        activeTween.current = gsap.to(tweenState, {
            progress: 1,
            duration: motion.duration.slow,
            ease: motion.ease.inOut,
            onUpdate: () => {
                const nextLayout = interpolatedDonutLayout(fromLayout, data, tweenState.progress, transitionOrder);
                renderedLayout.current = nextLayout;
                setRenderLayout(nextLayout);
            },
            onComplete: () => {
                renderedLayout.current = targetLayout;
                setRenderLayout(targetLayout);
                activeTween.current = null;
            },
        });
    }, { scope: chartRef, dependencies: [dataKey] });

    const activeArc = activeLabel ? renderLayout.find((arc) => arc.label === activeLabel) ?? null : null;
    const focusedLabel = activeArc ? activeLabel : null;
    const renderedTotal = renderLayout.reduce((sum, arc) => sum + arc.value, 0);
    const activePercent = activeArc && renderedTotal > 0 ? (activeArc.value / renderedTotal) * 100 : 0;
    const activeValue = activeArc ? format(activeArc.value) : null;
    const visiblePositiveArcs = renderLayout.filter((arc) => arc.value > 0 && arc.end - arc.start > minimumVisibleSpanDegrees);
    const singleVisibleArc = visiblePositiveArcs.length === 1 ? visiblePositiveArcs[0] : null;
    const circumference = 2 * Math.PI * radius;

    return (
        <div ref={chartRef} className="relative size-[min(42vh,380px)] min-h-[330px] min-w-[330px] shrink-0">
            <svg viewBox="0 0 220 220" className="size-full overflow-visible">
                <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={strokeWidth} />
                {renderLayout.map((arc) => {
                    const isSingleVisibleArc = singleVisibleArc?.label === arc.label;
                    const span = Math.min(fullCircleDegrees, Math.max(0, arc.end - arc.start));
                    const sharedProps = {
                        fill: 'none',
                        stroke: arc.color,
                        strokeWidth: focusedLabel === arc.label ? strokeWidth + 6 : strokeWidth,
                        strokeLinecap: 'butt' as const,
                        opacity: focusedLabel && focusedLabel !== arc.label ? 0.28 : 1,
                        pointerEvents: 'stroke' as const,
                        tabIndex: 0,
                        role: 'button' as const,
                        'aria-label': `${arc.label}: ${format(arc.value)}, ${percentLabel(renderedTotal > 0 ? (arc.value / renderedTotal) * 100 : 0)}`,
                        className: 'cursor-pointer outline-none transition-[stroke-width,opacity,filter] duration-200 ease-out focus-visible:[filter:drop-shadow(0_0_6px_currentColor)]',
                        style: { filter: focusedLabel === arc.label ? `drop-shadow(0 0 7px ${arc.color})` : undefined },
                        onPointerEnter: () => setActiveLabel(arc.label),
                        onPointerLeave: () => setActiveLabel(null),
                        onFocus: () => setActiveLabel(arc.label),
                        onBlur: () => setActiveLabel(null),
                    };

                    return isSingleVisibleArc ? (
                        <circle
                            key={arc.label}
                            cx="110"
                            cy="110"
                            r={radius}
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - span / fullCircleDegrees)}
                            transform="rotate(-90 110 110)"
                            {...sharedProps}
                        />
                    ) : (
                        <path key={arc.label} d={donutArcPath(arc, 110, 110, radius)} {...sharedProps} />
                    );
                })}
            </svg>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div data-donut-center className="grid w-[42%] max-w-[138px] justify-items-center overflow-hidden">
                    {activeArc ? (
                        <>
                            <div className="line-clamp-2 max-w-full break-words text-xl font-black leading-[0.95] text-white" title={activeArc.label}>
                                {activeArc.label}
                            </div>
                            <div className="mt-2 max-w-full truncate text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: activeArc.color }} title={activeValue ? `${activeValue} · ${percentLabel(activePercent)}` : percentLabel(activePercent)}>
                                {activeValue ? `${activeValue} · ${percentLabel(activePercent)}` : percentLabel(activePercent)}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={`${centerValueSize} max-w-full truncate font-black leading-none text-white`} title={total}>
                                {total}
                            </div>
                            <div className="mt-2 line-clamp-2 max-w-full break-words text-[10px] font-black uppercase leading-tight tracking-[0.12em] text-white/35" title={center}>
                                {center}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
