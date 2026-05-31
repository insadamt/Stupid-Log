import { TextareaHTMLAttributes } from "react";

export default function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={`min-h-[128px] rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm font-bold text-black outline-none transition placeholder:text-black/30 focus:border-black ${props.className ?? ""}`} />;
}
