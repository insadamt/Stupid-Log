import { InputHTMLAttributes } from "react";

export default function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={`h-12 rounded-2xl border border-white/10 bg-[#eff5ee] px-4 text-sm font-black text-[#08100d] outline-none transition placeholder:text-black/35 focus:border-[#b7ff63] focus:ring-2 focus:ring-[#b7ff63]/25 disabled:cursor-not-allowed disabled:opacity-45 ${props.className ?? ""}`}
        />
    );
}
