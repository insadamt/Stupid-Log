import { tabs } from '../constants';
import { TabKey } from '../types';

export function Switch<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
    return (
        <div className="inline-flex rounded-full bg-black/7 p-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition ${value === option.value ? 'bg-black text-[#b7ff63] shadow-sm' : 'text-black/42 hover:text-black'}`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export function SlideNav({ active, setActive }: { active: TabKey; setActive: (tab: TabKey) => void }) {
    return (
        <div className="flex h-[112px] shrink-0 justify-center px-2 py-5">
            <div className="flex max-w-full items-center justify-center gap-2 overflow-hidden rounded-[28px] border border-black/10 bg-black px-5 py-4">
                {tabs.map((tab) => (
                    <button key={tab.key} type="button" onClick={() => setActive(tab.key)} className={`min-w-[165px] rounded-[20px] px-5 py-3 text-left transition ${active === tab.key ? 'bg-[#b7ff63] text-black' : 'bg-white/7 text-white/45 hover:text-white'}`}>
                        <div className="text-sm font-black">{tab.title}</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-50">{tab.sub}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function Empty({ text, dark = false }: { text: string; dark?: boolean }) {
    return <div className={`rounded-[22px] border border-dashed p-5 text-sm font-bold ${dark ? 'border-white/10 bg-white/[0.04] text-white/35' : 'border-black/14 bg-white/70 text-black/42'}`}>{text}</div>;
}
