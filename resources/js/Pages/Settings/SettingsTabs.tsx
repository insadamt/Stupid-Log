import { Database, KeyRound, UserRound } from 'lucide-react';
import { KeyboardEvent } from 'react';
import { SettingsSection } from './types';

const tabs = [
    { key: 'profile', label: 'Profile', icon: UserRound },
    { key: 'integrations', label: 'Integrations', icon: KeyRound },
    { key: 'data', label: 'Data & Safety', icon: Database },
] as const;

export default function SettingsTabs({
    active,
    disabled,
    onChange,
}: {
    active: SettingsSection;
    disabled: boolean;
    onChange: (section: SettingsSection) => void;
}) {
    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        if (disabled || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

        event.preventDefault();
        const nextIndex = event.key === 'Home'
            ? 0
            : event.key === 'End'
                ? tabs.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        const next = tabs[nextIndex];
        onChange(next.key);
        document.getElementById(`settings-tab-${next.key}`)?.focus();
    }

    return (
        <nav role="tablist" aria-label="Settings sections" className="flex h-[112px] shrink-0 justify-center px-2 py-5">
            <div className="flex max-w-full items-center justify-center gap-2 overflow-hidden rounded-[28px] border border-black/10 bg-black px-5 py-4">
                {tabs.map((tab, index) => {
                    const Icon = tab.icon;
                    const selected = tab.key === active;

                    return (
                        <button
                            key={tab.key}
                            id={`settings-tab-${tab.key}`}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-controls={`settings-panel-${tab.key}`}
                            tabIndex={selected ? 0 : -1}
                            disabled={disabled}
                            onClick={() => onChange(tab.key)}
                            onKeyDown={(event) => handleKeyDown(event, index)}
                            className={[
                                'flex min-w-[190px] items-center gap-3 rounded-[20px] px-5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7ff63]',
                                selected ? 'bg-[#b7ff63] text-black' : 'bg-white/7 text-white/45 hover:text-white',
                                disabled ? 'cursor-not-allowed opacity-40' : '',
                            ].join(' ')}
                        >
                            <Icon size={20} strokeWidth={3} />
                            <span>
                                <span className="block text-sm font-black">{tab.label}</span>
                                <span className="block text-[10px] font-black uppercase tracking-[0.16em] opacity-50">
                                    {tab.key === 'profile' ? 'Local identity' : tab.key === 'integrations' ? 'Provider access' : 'Backup & recovery'}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
