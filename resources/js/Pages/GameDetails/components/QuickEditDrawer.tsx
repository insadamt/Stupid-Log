import { Check, Save, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../../../animation';
import { statusPillStyle } from '../../../statusColors';
import { ReferenceData } from '../../../types';
import { QuickEditForm } from '../types';
import { Field, Select, TextInput } from './FormControls';

const knownErrorKeys = new Set([
    'progress.status_id',
    'progress.playtime_hours',
    'progress.earned_achievements',
    'progress.first_played_at',
    'progress.last_played_at',
    'progress.completed_at',
]);

export default function QuickEditDrawer({
    form,
    errors,
    references,
    selectedStatus,
    gameHasAchievements,
    saving,
    saved,
    updateForm,
    updateStatus,
    submit,
    close,
}: {
    form: QuickEditForm;
    errors: Record<string, string>;
    references: ReferenceData;
    selectedStatus: ReferenceData['statuses'][number] | undefined;
    gameHasAchievements: boolean;
    saving: boolean;
    saved: boolean;
    updateForm: (patch: Partial<QuickEditForm>) => void;
    updateStatus: (statusId: string) => void;
    submit: () => void;
    close: () => void;
}) {
    const backdropRef = useRef<HTMLDivElement>(null);
    const drawerRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const closingRef = useRef(false);
    const unrecognizedErrors = Object.entries(errors).filter(([key]) => !knownErrorKeys.has(key));

    useEffect(() => {
        const backdrop = backdropRef.current;
        const drawer = drawerRef.current;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        if (!backdrop || !drawer) return;

        if (prefersReducedMotion()) {
            gsap.set([backdrop, drawer], { autoAlpha: 1, x: 0 });
        } else {
            gsap.timeline({ defaults: { ease: 'power3.out' } })
                .fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0)
                .fromTo(drawer, { xPercent: 100 }, { xPercent: 0, duration: 0.32 }, 0);
        }

        closeButtonRef.current?.focus();

        return () => {
            gsap.killTweensOf([backdrop, drawer]);
            previouslyFocused?.focus();
        };
    }, []);

    useEffect(() => {
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') requestClose();
        }

        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    });

    function requestClose() {
        if (closingRef.current) return;
        closingRef.current = true;

        const backdrop = backdropRef.current;
        const drawer = drawerRef.current;
        if (!backdrop || !drawer || prefersReducedMotion()) {
            close();
            return;
        }

        gsap.timeline({ defaults: { ease: 'power2.in' }, onComplete: close })
            .to(drawer, { xPercent: 100, duration: 0.24 }, 0)
            .to(backdrop, { autoAlpha: 0, duration: 0.18 }, 0.06);
    }

    return (
        <div
            ref={backdropRef}
            className="fixed inset-0 z-[70] flex justify-end bg-black/60 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) requestClose();
            }}
        >
            <section
                ref={drawerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="quick-edit-title"
                className="grid h-full w-full max-w-[520px] grid-rows-[auto_minmax(0,1fr)_auto] border-l border-white/10 bg-black text-white shadow-[-30px_0_90px_rgb(0_0_0/0.42)]"
            >
                <header className="flex items-start justify-between gap-4 border-b border-white/10 px-7 py-6">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.26em] text-[#b7ff63]">Progress Only</div>
                        <h2 id="quick-edit-title" className="mt-2 text-4xl font-black leading-none tracking-[-0.055em]">Quick Edit</h2>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={requestClose}
                        aria-label="Close quick edit"
                        className="grid size-11 place-items-center rounded-full bg-white/10 text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b7ff63]"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="overflow-y-auto px-7 py-6">
                    <div className="grid gap-5">
                        <Field label="Status" error={errors['progress.status_id']}>
                            <Select value={form.status_id} onChange={(event) => updateStatus(event.target.value)}>
                                {references.statuses
                                    .filter((status) => gameHasAchievements || status.name !== '100%')
                                    .map((status) => <option key={status.id} value={status.id} className="text-black">{status.name}</option>)}
                            </Select>
                            {selectedStatus && (
                                <span
                                    className="mt-1 inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]"
                                    style={statusPillStyle({ status: selectedStatus.name, status_color_hex: selectedStatus.color_hex })}
                                >
                                    {selectedStatus.name}
                                </span>
                            )}
                        </Field>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Playtime Hours" error={errors['progress.playtime_hours']}>
                                <TextInput type="number" min="0" step="0.1" value={form.playtime_hours} onChange={(event) => updateForm({ playtime_hours: event.target.value })} />
                            </Field>
                            <Field label="Earned Achievements" error={errors['progress.earned_achievements']}>
                                <TextInput type="number" min="0" value={form.earned_achievements} onChange={(event) => updateForm({ earned_achievements: event.target.value })} />
                            </Field>
                            <Field label="First Played Date" error={errors['progress.first_played_at']}>
                                <TextInput type="date" value={form.first_played_at} onChange={(event) => updateForm({ first_played_at: event.target.value })} />
                            </Field>
                            <Field label="Last Played Date" error={errors['progress.last_played_at']}>
                                <TextInput type="date" value={form.last_played_at} onChange={(event) => updateForm({ last_played_at: event.target.value })} />
                            </Field>
                        </div>

                        {(selectedStatus?.name === 'Completed' || selectedStatus?.name === '100%') && (
                            <Field label="Completed Date" error={errors['progress.completed_at']}>
                                <TextInput type="date" value={form.completed_at} onChange={(event) => updateForm({ completed_at: event.target.value })} />
                            </Field>
                        )}

                        {!gameHasAchievements && (
                            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white/55">
                                100% is unavailable because this game has no achievement total.
                            </div>
                        )}

                        {unrecognizedErrors.length > 0 && (
                            <div className="rounded-2xl border border-[#ff6068]/40 bg-[#ff6068]/10 px-4 py-3 text-sm font-black text-[#ff8b91]">
                                {unrecognizedErrors.map(([key, message]) => <div key={key}>{message}</div>)}
                            </div>
                        )}
                    </div>
                </div>

                <footer className="flex items-center justify-between gap-4 border-t border-white/10 px-7 py-5">
                    <div className="flex min-h-6 items-center gap-2 text-sm font-black text-[#b7ff63]" aria-live="polite">
                        {saved && <><Check size={18} /> Saved</>}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={requestClose} className="rounded-[18px] bg-white/10 px-5 py-3 text-sm font-black text-white">
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={saving}
                            className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-5 py-3 text-sm font-black text-black disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Saving' : 'Save'}
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}
