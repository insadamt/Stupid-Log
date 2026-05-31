import { Package } from "lucide-react";

export default function EmptyCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="grid min-h-[220px] place-items-center rounded-[28px] border border-dashed border-black/15 bg-white/60 p-8 text-center">
            <div>
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-black text-[#b7ff63]"><Package size={22} /></div>
                <div className="mt-4 text-2xl font-black tracking-[-0.04em]">{title}</div>
                <p className="mx-auto mt-2 max-w-xl text-sm font-bold text-black/45">{body}</p>
            </div>
        </div>
    );
}
