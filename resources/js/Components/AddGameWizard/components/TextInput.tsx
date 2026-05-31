import { InputHTMLAttributes } from "react";

export default function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={`h-12 rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold text-black outline-none transition placeholder:text-black/30 focus:border-black ${props.className ?? ""}`} />;
}
