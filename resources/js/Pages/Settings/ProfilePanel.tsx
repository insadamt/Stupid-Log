import { Save } from 'lucide-react';
import { FormEvent } from 'react';
import { FeedbackMessage, SettingsButton, SettingsField } from './SettingsControls';

export default function ProfilePanel({
    username,
    saving,
    errors,
    feedback,
    onSubmit,
}: {
    username: string;
    saving: boolean;
    errors: Record<string, string>;
    feedback: { ok: boolean; message: string } | null;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <section id="settings-panel-profile" role="tabpanel" aria-labelledby="settings-tab-profile" className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-black/35">Local identity</div>
            <h2 className="mt-1 text-4xl font-black tracking-[-0.05em]">Profile</h2>
            <p className="mt-2 text-sm font-bold text-black/45">Set the name shown throughout this local installation.</p>

            <form onSubmit={onSubmit} className="mt-6 border-t border-black/10 pt-6">
                <div className="max-w-xl">
                    <SettingsField
                        label="Username"
                        name="username"
                        defaultValue={username}
                        error={errors.username}
                    />
                </div>

                <div className="mt-6 flex items-center gap-3">
                    <SettingsButton type="submit" tone="green" busy={saving}>
                        <Save size={16} strokeWidth={3} />
                        {saving ? 'Saving' : 'Save profile'}
                    </SettingsButton>
                    <span className="text-xs font-bold text-black/35">Backups preserve the current local username.</span>
                </div>

                <div className="mt-4 max-w-xl">
                    <FeedbackMessage result={feedback} />
                </div>
            </form>
        </section>
    );
}
