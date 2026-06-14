import { router } from '@inertiajs/react';
import { Dispatch, SetStateAction, useState } from 'react';
import { GameCardData, ReferenceData } from '../../types';
import { GameEditForm, QuickEditForm } from './types';

function formFromGame(libraryGame: GameCardData, references: ReferenceData): QuickEditForm {
    return {
        status_id: String(references.statuses.find((status) => status.name === libraryGame.status)?.id ?? references.statuses[0]?.id ?? ''),
        playtime_hours: String(libraryGame.playtime_hours ?? 0),
        earned_achievements: String(libraryGame.earned_achievements ?? 0),
        first_played_at: libraryGame.first_played_at ?? '',
        last_played_at: libraryGame.last_played_at ?? '',
        completed_at: libraryGame.completed_at ?? '',
    };
}

export function useQuickEdit({
    libraryGame,
    references,
    setGameForm,
}: {
    libraryGame: GameCardData;
    references: ReferenceData;
    setGameForm: Dispatch<SetStateAction<GameEditForm>>;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState<QuickEditForm>(() => formFromGame(libraryGame, references));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const selectedStatus = references.statuses.find((status) => String(status.id) === form.status_id);

    function open() {
        setForm(formFromGame(libraryGame, references));
        setErrors({});
        setIsSaved(false);
        setIsOpen(true);
    }

    function close() {
        setIsOpen(false);
    }

    function updateForm(patch: Partial<QuickEditForm>) {
        setForm((current) => ({ ...current, ...patch }));
        setIsSaved(false);
    }

    function updateStatus(statusId: string) {
        const nextStatus = references.statuses.find((status) => String(status.id) === statusId);
        const isComplete = nextStatus?.name === 'Completed' || nextStatus?.name === '100%';

        setForm((current) => ({
            ...current,
            status_id: statusId,
            earned_achievements: nextStatus?.name === '100%' && libraryGame.total_achievements > 0
                ? String(libraryGame.total_achievements)
                : current.earned_achievements,
            completed_at: isComplete ? (current.completed_at || new Date().toISOString().slice(0, 10)) : '',
        }));
        setIsSaved(false);
    }

    function save() {
        router.patch(`/games/${libraryGame.id}`, {
            progress: {
                status_id: Number(form.status_id),
                playtime_hours: form.playtime_hours === '' ? 0 : Number(form.playtime_hours),
                earned_achievements: form.earned_achievements === '' ? null : Number(form.earned_achievements),
                first_played_at: form.first_played_at || null,
                last_played_at: form.last_played_at || null,
                completed_at: form.completed_at || null,
            },
        }, {
            preserveScroll: true,
            onStart: () => {
                setIsSaving(true);
                setIsSaved(false);
            },
            onFinish: () => setIsSaving(false),
            onSuccess: () => {
                setErrors({});
                setIsSaved(true);
                setGameForm((current) => ({ ...current, ...form }));
            },
            onError: (validationErrors: Record<string, string>) => {
                setErrors(validationErrors);
                setIsSaved(false);
            },
        });
    }

    return {
        isOpen,
        form,
        errors,
        isSaving,
        isSaved,
        selectedStatus,
        open,
        close,
        updateForm,
        updateStatus,
        save,
    };
}
