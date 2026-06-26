import PlatformIcon from "../../PlatformIcon";
import TextInput from "../components/TextInput";
import { Draft } from "../types";

export default function PlatformStep({
    platformQuery,
    setPlatformQuery,
    filteredPlatforms,
    draft,
    choosePlatform,
}: {
    platformQuery: string;
    setPlatformQuery: (value: string) => void;
    filteredPlatforms: Array<{ id: number; name: string; devices: Array<unknown> }>;
    draft: Draft;
    choosePlatform: (platformId: number) => void;
}) {
    return (
        <div className="grid gap-6">
            <div>
                <div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Platform</div>
                <h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Choose the ecosystem.</h3>
            </div>

            <TextInput value={platformQuery} onChange={(event) => setPlatformQuery(event.target.value)} placeholder="Search platform..." />

            <div className="sl-platform-grid grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {filteredPlatforms.map((item) => {
                    const selected = draft.platform_id === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => choosePlatform(item.id)}
                            aria-label={`Choose ${item.name}`}
                            title={item.name}
                            className={`sl-platform-card grid aspect-square place-items-center rounded-[24px] border transition ${selected ? "is-selected border-[#b7ff63] bg-black text-white" : "border-black/10 bg-white/75 text-black hover:-translate-y-0.5 hover:bg-white"}`}
                        >
                            <PlatformIcon platform={item.name} surface={selected ? "dark" : "light"} size="lg" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
