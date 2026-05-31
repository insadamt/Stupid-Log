import { useEffect, useState } from "react";

export default function CoverImage({ src, fallbackSrc = "", alt = "", className = "" }: { src: string; fallbackSrc?: string; alt?: string; className?: string }) {
    const [current, setCurrent] = useState(src);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setCurrent(src);
        setFailed(false);
    }, [src, fallbackSrc]);

    if (!current || failed) {
        return <div className={`grid place-items-center bg-black text-xs font-black uppercase tracking-[0.18em] text-white/35 ${className}`}>No Cover</div>;
    }

    return (
        <img
            src={current}
            alt={alt}
            className={`bg-black object-contain ${className}`}
            onError={() => {
                if (fallbackSrc && current !== fallbackSrc) {
                    setCurrent(fallbackSrc);
                    return;
                }
                setFailed(true);
            }}
        />
    );
}
