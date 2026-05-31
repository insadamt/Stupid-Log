import { ChevronRight } from "lucide-react";
import { WizardSearchResult } from "../types";
import { fallbackResultCover, preferredResultCover, sourceName, year } from "../utils";
import CoverImage from "./CoverImage";

export default function SearchResultCard({
    result,
    selected,
    onSelect,
}: {
    result: WizardSearchResult;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={[
                "group grid min-h-[172px] grid-cols-[104px_minmax(0,1fr)_auto] items-center gap-5 rounded-[30px] border p-3 text-left transition",
                selected
                    ? "border-[#b7ff63] bg-black text-white shadow-[0_22px_55px_rgb(0_0_0/0.22)]"
                    : "border-black/8 bg-[#edf1ea] text-black hover:-translate-y-0.5 hover:border-black/20 hover:bg-white",
            ].join(" ")}
        >
            <div
                className={[
                    "overflow-hidden rounded-[22px] p-1.5",
                    selected ? "bg-[#b7ff63]" : "bg-[#b7ff63]",
                ].join(" ")}
            >
                <CoverImage
                    src={preferredResultCover(result)}
                    fallbackSrc={fallbackResultCover(result)}
                    alt={result.title}
                    className="h-[136px] w-[92px] rounded-[17px]"
                />
            </div>

            <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                        className={[
                            "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
                            selected ? "bg-[#b7ff63] text-black" : "bg-black text-[#b7ff63]",
                        ].join(" ")}
                    >
                        {sourceName(result.source)}
                    </span>

                    {result.steam_app_id && (
                        <span
                            className={[
                                "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
                                selected ? "bg-white/10 text-white/50" : "bg-black/5 text-black/42",
                            ].join(" ")}
                        >
                            Steam {result.steam_app_id}
                        </span>
                    )}
                </div>

                <h4 className="truncate text-[28px] font-black leading-none tracking-[-0.055em]">
                    {result.title}
                </h4>

                <p
                    className={[
                        "mt-3 truncate text-sm font-black uppercase tracking-[0.16em]",
                        selected ? "text-white/38" : "text-black/38",
                    ].join(" ")}
                >
                    {result.publisher || "Unknown Publisher"} · {year(result.release_date)}
                </p>
            </div>

            <span
                className={[
                    "grid size-14 place-items-center rounded-full transition group-hover:rotate-45",
                    selected ? "bg-[#b7ff63] text-black" : "bg-black text-[#b7ff63]",
                ].join(" ")}
            >
                <ChevronRight size={28} strokeWidth={3.2} />
            </span>
        </button>
    );
}
