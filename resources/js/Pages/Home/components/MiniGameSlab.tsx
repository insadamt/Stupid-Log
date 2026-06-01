import GameCard from '../../../Components/GameCard';
import { GameCardData } from '../../../types';

export default function MiniGameSlab({
    game,
    side,
}: {
    game: GameCardData;
    side: "left" | "right";
}) {
    const laneLabel = side === "left" ? "Previous File" : "Next File";

    return (
        <div
            className={[
                "absolute top-1/2 z-10 -translate-y-1/2 transition duration-300 hover:z-30 hover:scale-105",
                side === "left" ? "left-[3%] -rotate-6" : "right-[3%] rotate-6",
            ].join(" ")}
        >
            <div className="pointer-events-none absolute left-5 top-5 z-30 rounded-full bg-black/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63] shadow-[0_10px_22px_rgb(0_0_0/0.18)]">
                {laneLabel}
            </div>

            <GameCard game={game} compact expanded={false} />
        </div>
    );
}
