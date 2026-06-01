import { useMemo, useRef, useState } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '../../../animation';
import { useStatsRevealDelay } from '../revealDelay';
import { DonutArcLayout, DonutTweenSlice, Slice } from '../types';
import { animationKey, clampPercent } from '../utils';

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

function interpolatedDonutLayout(transitions: DonutTweenSlice[], progress: number, order?: string[]) {
    return donutLayout(transitions
        .map((slice) => ({
            label: slice.label,
            value: slice.from + (slice.to - slice.from) * progress,
            color: slice.color,
        }))
        .filter((slice) => slice.value > 0.001), order);
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
    const span = Math.max(0, arc.end - arc.start);
    if (span <= 0.01) return '';

    const endAngle = span >= 359.99 ? arc.start + 359.99 : arc.end;
    const start = pointOnCircle(cx, cy, radius, arc.start);
    const end = pointOnCircle(cx, cy, radius, endAngle);
    const largeArcFlag = endAngle - arc.start > 180 ? 1 : 0;

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export default function Donut({ data, total, center }: { data: Slice[]; total: string; center: string }) {
    const chartRef = useRef<HTMLDivElement>(null);
    const hasRevealed = useRef(false);
    const previousSlices = useRef<Slice[]>(data);
    const sliceOrder = useRef<string[]>(data.map((slice) => slice.label));
    const revealDelay = useStatsRevealDelay();
    const radius = 72;
    const strokeWidth = 24;
    const centerTextSize = total.length > 8 ? 'text-4xl' : total.length > 5 ? 'text-5xl' : 'text-6xl';
    const dataKey = animationKey(data.map((slice) => `${slice.label}:${slice.value}:${slice.color}`));
    const orderedLabels = [
        ...sliceOrder.current,
        ...data.filter((slice) => !sliceOrder.current.includes(slice.label)).map((slice) => slice.label),
    ];
    const targetLayout = useMemo(() => donutLayout(data, orderedLabels), [dataKey]);
    const [renderLayout, setRenderLayout] = useState<DonutArcLayout[]>(() => targetLayout.map((arc) => ({ ...arc, end: arc.start })));

    useGSAP(() => {
        if (!chartRef.current) return;
        const centerText = chartRef.current.querySelector<HTMLElement>('[data-donut-center]');

        if (prefersReducedMotion()) {
            setRenderLayout(targetLayout);
            previousSlices.current = data;
            sliceOrder.current = orderedLabels;
            hasRevealed.current = true;
            return;
        }

        const tweenState = { progress: 0 };
        gsap.killTweensOf(tweenState);

        if (!hasRevealed.current) {
            setRenderLayout(revealedDonutLayout(targetLayout, 0));
            gsap.to(tweenState, {
                progress: 1,
                duration: 0.82,
                delay: revealDelay,
                ease: 'power3.out',
                onUpdate: () => {
                    setRenderLayout(revealedDonutLayout(targetLayout, tweenState.progress));
                },
                onComplete: () => {
                    previousSlices.current = data;
                    sliceOrder.current = orderedLabels;
                    hasRevealed.current = true;
                    setRenderLayout(targetLayout);
                },
            });
            return;
        }

        const previousByLabel = new Map(previousSlices.current.map((slice) => [slice.label, slice]));
        const targetByLabel = new Map(data.map((slice) => [slice.label, slice]));
        const transitionLabels = [
            ...orderedLabels,
            ...previousSlices.current.filter((slice) => !orderedLabels.includes(slice.label)).map((slice) => slice.label),
        ];
        const transitions: DonutTweenSlice[] = transitionLabels.map((label) => {
            const target = targetByLabel.get(label);
            const from = previousByLabel.get(label);
            return {
                label,
                from: from?.value ?? 0,
                to: target?.value ?? 0,
                color: target?.color ?? from?.color ?? '#9BE44D',
            };
        });

        gsap.to(tweenState, {
            progress: 1,
            duration: 0.68,
            ease: 'power3.inOut',
            onUpdate: () => {
                setRenderLayout(interpolatedDonutLayout(transitions, tweenState.progress, transitionLabels));
            },
            onComplete: () => {
                previousSlices.current = data;
                sliceOrder.current = orderedLabels;
                setRenderLayout(targetLayout);
            },
        });

        if (centerText) {
            gsap.fromTo(centerText, { scale: 0.97, autoAlpha: 0.72 }, { scale: 1, autoAlpha: 1, duration: 0.34, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform,visibility,opacity' });
        }
    }, { scope: chartRef, dependencies: [dataKey] });

    return (
        <div ref={chartRef} className="relative size-[min(42vh,380px)] min-h-[330px] min-w-[330px] shrink-0">
            <svg viewBox="0 0 220 220" className="size-full">
                <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={strokeWidth} />
                {renderLayout.map((arc) => (
                    <path
                        key={arc.label}
                        d={donutArcPath(arc, 110, 110, radius)}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="butt"
                    />
                ))}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
                <div data-donut-center className="max-w-[58%]">
                    <div className={`${centerTextSize} truncate font-black leading-none text-white`} title={total}>{total}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/32">{center}</div>
                </div>
            </div>
        </div>
    );
}
