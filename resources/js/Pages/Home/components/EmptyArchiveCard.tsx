import { Sparkles } from 'lucide-react';

export default function EmptyArchiveCard() {
    return (
        <div className="relative z-20 grid h-[520px] w-[650px] place-items-center rounded-[48px] bg-black p-5 text-center shadow-[0_45px_90px_rgb(0_0_0/0.24)]">
            <div className="grid h-full w-full place-items-center rounded-[38px] bg-[#b7ff63] p-12">
                <div>
                    <Sparkles
                        className="mx-auto mb-5"
                        size={56}
                        strokeWidth={3}
                    />
                    <h2 className="text-5xl font-black leading-[0.92] tracking-[-0.05em]">
                        Start your archive.
                    </h2>
                    <p className="mx-auto mt-5 max-w-[390px] text-xl font-black leading-snug text-black/58">
                        Add your first game and turn the shelf into a personal
                        save file.
                    </p>
                </div>
            </div>
        </div>
    );
}
