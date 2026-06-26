import { Check, ChevronRight } from "lucide-react";
import { WizardSearchResult } from "../types";
import { fallbackResultCover, preferredResultCover } from "../utils";
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
    const coverSrc = preferredResultCover(result);
    const fallbackCoverSrc = fallbackResultCover(result);

    return (
        <button
            type="button"
            onClick={onSelect}
            className={[
                "sl-search-result-card group relative grid min-h-[132px] grid-cols-[86px_minmax(0,1fr)_40px] items-center gap-4 overflow-hidden rounded-[24px] border p-2.5 text-left transition",
                selected
                    ? "border-[#b7ff63] bg-black text-white shadow-[0_22px_55px_rgb(0_0_0/0.22)]"
                    : "border-black/8 bg-[#edf1ea] text-black hover:-translate-y-0.5 hover:border-black/20 hover:bg-white",
            ].join(" ")}
        >
            <div
                className={[
                    "relative z-10 h-[114px] overflow-hidden rounded-[19px] p-1",
                    selected ? "bg-[#b7ff63]" : "bg-[#b7ff63]",
                ].join(" ")}
            >
                <CoverImage
                    src={coverSrc}
                    fallbackSrc={fallbackCoverSrc}
                    alt={result.title}
                    className="h-full w-full rounded-[15px]"
                />
            </div>

            <div className="relative z-10 min-w-0">
                <h4 className="line-clamp-2 text-xl font-black leading-[1.02] md:text-2xl">
                    {result.title}
                </h4>
            </div>

            <span
                className={[
                    "sl-search-result-card-icon relative z-10 grid size-10 place-items-center rounded-[14px] transition",
                    selected ? "bg-[#b7ff63] text-black" : "bg-black/8 text-black/45 group-hover:bg-black group-hover:text-[#b7ff63]",
                ].join(" ")}
                aria-hidden="true"
            >
                {selected ? <Check size={20} strokeWidth={3.2} /> : <ChevronRight size={20} strokeWidth={3.2} />}
            </span>
        </button>
    );
}
