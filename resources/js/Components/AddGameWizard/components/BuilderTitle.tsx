export default function BuilderTitle({
    eyebrow,
    title,
    body,
}: {
    eyebrow: string;
    title: string;
    body?: string;
}) {
    return (
        <div>
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#b7ff63]">
                {eyebrow}
            </p>

            <h3 className="mt-2 text-[52px] font-black leading-[0.88] tracking-[-0.065em] text-white">
                {title}
            </h3>

            {body && (
                <p className="mt-4 max-w-2xl text-base font-black leading-relaxed text-white/42">
                    {body}
                </p>
            )}
        </div>
    );
}
