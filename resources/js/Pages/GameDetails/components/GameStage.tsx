import { RefObject } from 'react';
import GameCard from '../../../Components/GameCard';
import { GameCardData } from '../../../types';

export default function GameStage({
    stageRef,
    libraryGame,
}: {
    stageRef: RefObject<HTMLElement | null>;
    libraryGame: GameCardData;
}) {
    return (
        <section
            data-details-stage
            ref={stageRef}
            className={[
                'relative z-20 grid h-[610px] w-full place-items-center self-center rounded-[44px] border border-black/10 bg-black/[0.035] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.45)]',
            ].join(' ')}
        >
            <div className="pointer-events-none absolute inset-x-8 top-8 h-24 rounded-full bg-[#b7ff63]/28 blur-3xl" />
            <div className="absolute -bottom-6 h-12 w-[300px] rounded-full bg-black/16 blur-xl" />
            <div data-details-card>
                <GameCard game={libraryGame} featured expanded={false} />
            </div>
        </section>
    );
}
