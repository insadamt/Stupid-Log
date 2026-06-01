import { useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '../../../animation';
import { useStatsRevealDelay } from '../revealDelay';
import { StackSegment } from '../types';
import { animationKey, clampPercent } from '../utils';

export function ProgressBar({ value, large = false, tone = 'light' }: { value: number; large?: boolean; tone?: 'light' | 'dark' }) {
    const fillRef = useRef<HTMLDivElement>(null);
    const previousScale = useRef(0);
    const hasRevealed = useRef(false);
    const revealDelay = useStatsRevealDelay();
    const targetScale = clampPercent(value) / 100;
    const renderScale = !hasRevealed.current ? 0 : targetScale;

    useGSAP(() => {
        const fill = fillRef.current;
        if (!fill) return;
        gsap.killTweensOf(fill);

        if (prefersReducedMotion()) {
            gsap.set(fill, { scaleX: targetScale });
            previousScale.current = targetScale;
            hasRevealed.current = true;
            return;
        }

        const from = hasRevealed.current ? previousScale.current : 0;
        if (!hasRevealed.current) {
            gsap.set(fill, { scaleX: from });
        }

        gsap.fromTo(fill, { scaleX: from }, {
            scaleX: targetScale,
            duration: hasRevealed.current ? 0.46 : 0.74,
            delay: hasRevealed.current ? 0 : revealDelay,
            ease: hasRevealed.current ? 'power3.inOut' : 'power3.out',
            overwrite: 'auto',
            onStart: () => {
                hasRevealed.current = true;
            },
            onComplete: () => {
                previousScale.current = targetScale;
            },
        });
    }, { scope: fillRef, dependencies: [targetScale] });

    return (
        <div className={`${large ? 'h-4' : 'h-2.5'} overflow-hidden rounded-full ${tone === 'dark' ? 'bg-white/10' : 'bg-black/8'}`}>
            <div ref={fillRef} className="h-full w-full origin-left rounded-full bg-[#9BE44D]" style={{ transform: `scaleX(${renderScale})` }} />
        </div>
    );
}

export function StackedProgressBar({ segments, total }: { segments: StackSegment[]; total: number }) {
    const stackRef = useRef<HTMLDivElement>(null);
    const previousWidths = useRef<Record<string, number>>({});
    const hasRevealed = useRef(false);
    const revealDelay = useStatsRevealDelay();
    const safeTotal = Math.max(1, total);
    const widths = segments.reduce<Record<string, number>>((acc, segment) => {
        acc[segment.label] = clampPercent((segment.value / safeTotal) * 100);
        return acc;
    }, {});
    const renderWidths = !hasRevealed.current
        ? segments.reduce<Record<string, number>>((acc, segment) => ({ ...acc, [segment.label]: 0 }), {})
        : widths;
    const stackKey = animationKey(segments.map((segment) => `${segment.label}:${segment.value}:${segment.color}`));

    useGSAP(() => {
        const stack = stackRef.current;
        if (!stack) return;
        const fills = Array.from(stack.querySelectorAll<HTMLElement>('[data-stack-segment]'));
        gsap.killTweensOf(fills);

        if (prefersReducedMotion()) {
            fills.forEach((fill) => {
                const label = fill.dataset.label ?? '';
                gsap.set(fill, { width: `${widths[label] ?? 0}%` });
            });
            previousWidths.current = widths;
            hasRevealed.current = true;
            return;
        }

        fills.forEach((fill, index) => {
            const label = fill.dataset.label ?? '';
            const targetWidth = widths[label] ?? 0;
            const previousWidth = hasRevealed.current ? previousWidths.current[label] ?? 0 : 0;
            if (!hasRevealed.current) {
                gsap.set(fill, { width: `${previousWidth}%` });
            }

            gsap.fromTo(fill, { width: `${previousWidth}%` }, {
                width: `${targetWidth}%`,
                duration: hasRevealed.current ? 0.46 : 0.68,
                delay: hasRevealed.current ? 0 : revealDelay + index * 0.035,
                ease: hasRevealed.current ? 'power3.inOut' : 'power3.out',
                overwrite: 'auto',
                onStart: () => {
                    hasRevealed.current = true;
                },
            });
        });

        previousWidths.current = widths;
    }, { scope: stackRef, dependencies: [stackKey, safeTotal] });

    return (
        <div ref={stackRef} className="flex h-5 overflow-hidden rounded-full bg-black/8">
            {segments.length === 0 && <div className="h-full w-full bg-black/10" />}
            {segments.map((segment) => (
                <div
                    key={segment.label}
                    data-stack-segment
                    data-label={segment.label}
                    className="h-full"
                    style={{ width: `${renderWidths[segment.label]}%`, backgroundColor: segment.color }}
                />
            ))}
        </div>
    );
}
