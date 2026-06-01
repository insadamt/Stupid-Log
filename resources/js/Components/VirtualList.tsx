import { ReactNode, useEffect, useRef, useState } from 'react';

export default function VirtualList<T>({
    items,
    rowHeight,
    gap = 0,
    className,
    empty,
    hasMore = false,
    loading = false,
    onNearEnd,
    getKey,
    render,
}: {
    items: T[];
    rowHeight: number;
    gap?: number;
    className?: string;
    empty: ReactNode;
    hasMore?: boolean;
    loading?: boolean;
    onNearEnd?: () => void;
    getKey: (item: T, index: number) => string | number;
    render: (item: T, index: number) => ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const stride = rowHeight + gap;
    const totalHeight = items.length > 0 ? items.length * rowHeight + (items.length - 1) * gap + (hasMore || loading ? 58 : 0) : 0;
    const startIndex = Math.max(0, Math.floor(scrollTop / stride) - 6);
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / stride) + 6);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const resizeObserver = new ResizeObserver(() => setViewportHeight(node.clientHeight));
        setViewportHeight(node.clientHeight);
        resizeObserver.observe(node);

        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            onScroll={(event) => {
                const node = event.currentTarget;
                setScrollTop(node.scrollTop);
                if (onNearEnd && node.scrollTop + node.clientHeight > node.scrollHeight - 500) {
                    onNearEnd();
                }
            }}
            className={className}
        >
            {items.length === 0 ? empty : (
                <div className="relative" style={{ height: totalHeight }}>
                    {items.slice(startIndex, endIndex).map((item, offset) => {
                        const index = startIndex + offset;

                        return (
                            <div
                                key={getKey(item, index)}
                                className="absolute left-0 right-0"
                                style={{ top: index * stride, height: rowHeight }}
                            >
                                {render(item, index)}
                            </div>
                        );
                    })}
                    {(hasMore || loading) && (
                        <div className="absolute left-0 right-0 grid h-10 place-items-center text-[10px] font-black uppercase tracking-[0.16em] text-black/35" style={{ top: items.length * stride }}>
                            {loading ? 'Loading' : 'Scroll for more'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
