import { ReactNode, UIEvent, useEffect, useRef, useState } from 'react';
import GameCard from '../../../Components/GameCard';
import { GameCardData } from '../../../types';

const cardPanelExitDuration = 300;

export default function VirtualCardGrid({
    items,
    columns,
    resultSetKey,
    hasMore,
    refreshing,
    loadingMore,
    empty,
    onNearEnd,
}: {
    items: GameCardData[];
    columns: number;
    resultSetKey: string;
    hasMore: boolean;
    refreshing: boolean;
    loadingMore: boolean;
    empty: ReactNode;
    onNearEnd: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const clearActiveGameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [activeGameId, setActiveGameId] = useState<number | null>(null);
    const cardWidth = 200;
    const rowHeight = 355;
    const gapX = 24;
    const totalRows = Math.ceil(items.length / columns);
    const totalHeight = Math.max(1, totalRows) * rowHeight + (hasMore || loadingMore ? 76 : 0);
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / rowHeight) + 2);
    const startIndex = startRow * columns;
    const endIndex = Math.min(items.length, endRow * columns);
    const visibleItems = items.slice(startIndex, endIndex);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const resizeObserver = new ResizeObserver(() => setViewportHeight(node.clientHeight));
        setViewportHeight(node.clientHeight);
        resizeObserver.observe(node);

        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        return () => {
            if (clearActiveGameTimeoutRef.current) {
                clearTimeout(clearActiveGameTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (clearActiveGameTimeoutRef.current) {
            clearTimeout(clearActiveGameTimeoutRef.current);
            clearActiveGameTimeoutRef.current = null;
        }

        setActiveGameId(null);
        setScrollTop(0);

        if (ref.current) {
            ref.current.scrollTop = 0;
        }
    }, [resultSetKey]);

    function activateGame(gameId: number) {
        if (clearActiveGameTimeoutRef.current) {
            clearTimeout(clearActiveGameTimeoutRef.current);
            clearActiveGameTimeoutRef.current = null;
        }

        setActiveGameId(gameId);
    }

    function scheduleActiveGameClear(gameId: number) {
        if (clearActiveGameTimeoutRef.current) {
            clearTimeout(clearActiveGameTimeoutRef.current);
        }

        clearActiveGameTimeoutRef.current = setTimeout(() => {
            setActiveGameId((currentGameId) => (currentGameId === gameId ? null : currentGameId));
            clearActiveGameTimeoutRef.current = null;
        }, cardPanelExitDuration);
    }

    function handleScroll(event: UIEvent<HTMLDivElement>) {
        const node = event.currentTarget;
        setScrollTop(node.scrollTop);

        if (node.scrollTop + node.clientHeight > node.scrollHeight - 700) {
            onNearEnd();
        }
    }

    if (items.length === 0 && !refreshing) {
        return <div className="grid h-full place-items-center">{empty}</div>;
    }

    return (
        <div ref={ref} onScroll={handleScroll} className="sl-scrollbar relative h-full min-h-0 overflow-y-auto overflow-x-hidden px-16 py-10">
            {items.length === 0 && refreshing && (
                <div className="grid h-full place-items-center">
                    <div className="rounded-[28px] bg-black px-6 py-5 text-center text-white shadow-[0_24px_55px_rgb(0_0_0/0.22)]">
                        <div className="mx-auto h-1 w-28 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#b7ff63]" />
                        </div>
                        <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#b7ff63]">Updating</p>
                    </div>
                </div>
            )}
            <div className="relative mx-auto" style={{ width: columns * cardWidth + (columns - 1) * gapX, height: totalHeight }}>
                {visibleItems.map((game, offset) => {
                    const index = startIndex + offset;
                    const row = Math.floor(index / columns);
                    const column = index % columns;

                    return (
                        <div
                            key={game.id}
                            data-refresh-item={game.id}
                            className="absolute overflow-visible"
                            onMouseEnter={() => activateGame(game.id)}
                            onMouseLeave={() => scheduleActiveGameClear(game.id)}
                            onFocusCapture={() => activateGame(game.id)}
                            onBlurCapture={(event) => {
                                if (!event.currentTarget.contains(event.relatedTarget)) {
                                    scheduleActiveGameClear(game.id);
                                }
                            }}
                            style={{
                                left: column * (cardWidth + gapX),
                                top: row * rowHeight,
                                width: cardWidth,
                                height: 335,
                                zIndex: activeGameId === game.id ? 50 : undefined,
                            }}
                        >
                            <GameCard game={game} compact panelSide={column === columns - 1 ? 'left' : 'right'} />
                        </div>
                    );
                })}
                {(hasMore || loadingMore) && (
                    <div className="absolute left-0 right-0 grid h-14 place-items-center rounded-[22px] bg-black/5 text-xs font-black uppercase tracking-[0.16em] text-black/35" style={{ top: totalRows * rowHeight }}>
                        {loadingMore ? 'Loading more' : 'Scroll for more'}
                    </div>
                )}
            </div>
        </div>
    );
}
