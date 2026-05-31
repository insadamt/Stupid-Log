import { SelectHTMLAttributes } from "react";

export default function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className={`h-12 rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold text-black outline-none transition focus:border-black ${props.className ?? ""}`} />;
}
