import { ReactNode, UIEvent, useEffect, useRef, useState } from 'react';
import { useStaggerRefresh } from '../../../animation';
import GameCard from '../../../Components/GameCard';
import { GameCardData } from '../../../types';

export default function VirtualCardGrid({
    items,
    columns,
    refreshKey,
    hasMore,
    loading,
    empty,
    onNearEnd,
}: {
    items: GameCardData[];
    columns: number;
    refreshKey: string;
    hasMore: boolean;
    loading: boolean;
    empty: ReactNode;
    onNearEnd: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const cardWidth = 200;
    const rowHeight = 355;
    const gapX = 24;
    const totalRows = Math.ceil(items.length / columns);
    const totalHeight = Math.max(1, totalRows) * rowHeight + (hasMore || loading ? 76 : 0);
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 2);
    const startIndex = startRow * columns;
    const endIndex = Math.min(items.length, endRow * columns);
    const visibleItems = items.slice(startIndex, endIndex);

    useStaggerRefresh(gridRef, refreshKey);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const resizeObserver = new ResizeObserver(() => setViewportHeight(node.clientHeight));
        setViewportHeight(node.clientHeight);
        resizeObserver.observe(node);

        return () => resizeObserver.disconnect();
    }, []);

    function handleScroll(event: UIEvent<HTMLDivElement>) {
        const node = event.currentTarget;
        setScrollTop(node.scrollTop);

        if (node.scrollTop + node.clientHeight > node.scrollHeight - 700) {
            onNearEnd();
        }
    }

    if (items.length === 0 && !loading) {
        return <div className="grid h-full place-items-center">{empty}</div>;
    }

    return (
        <div ref={ref} onScroll={handleScroll} className="sl-scrollbar relative h-full min-h-0 overflow-y-auto overflow-x-hidden px-16 py-10">
            <div ref={gridRef} className="relative mx-auto" style={{ width: columns * cardWidth + (columns - 1) * gapX, height: totalHeight }}>
                {visibleItems.map((game, offset) => {
                    const index = startIndex + offset;
                    const row = Math.floor(index / columns);
                    const column = index % columns;

                    return (
                        <div
                            key={game.id}
                            data-refresh-item={game.id}
                            className="absolute"
                            style={{
                                left: column * (cardWidth + gapX),
                                top: row * rowHeight,
                                width: cardWidth,
                                height: 335,
                            }}
                        >
                            <GameCard game={game} compact panelSide={column === columns - 1 ? 'left' : 'right'} />
                        </div>
                    );
                })}
                {hasMore && (
                    <div className="absolute left-0 right-0 grid h-14 place-items-center rounded-[22px] bg-black/5 text-xs font-black uppercase tracking-[0.16em] text-black/35" style={{ top: totalRows * rowHeight }}>
                        Scroll for more
                    </div>
                )}
            </div>
        </div>
    );
}
