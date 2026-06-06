import { SubscriptionEntry, SubscriptionForm } from './types';

export function emptySubscriptionForm(firstOwnershipTypeId?: number, firstEditableDate?: string | null): SubscriptionForm {
    const today = new Date().toISOString().slice(0, 10);
    const defaultDate = firstEditableDate && firstEditableDate > today ? firstEditableDate : today;

    return {
        ownership_type_id: firstOwnershipTypeId ? String(firstOwnershipTypeId) : '',
        amount_paid: '',
        started_at: defaultDate,
        finished_at: defaultDate,
    };
}

export function subscriptionFormFromEntry(entry: SubscriptionEntry): SubscriptionForm {
    return {
        ownership_type_id: String(entry.ownership_type_id),
        amount_paid: String(entry.amount_paid),
        started_at: entry.started_at,
        finished_at: entry.finished_at,
    };
}

export function subscriptionPayload(form: SubscriptionForm, selectedCopyIds: number[]) {
    return {
        ownership_type_id: Number(form.ownership_type_id),
        amount_paid: Number(form.amount_paid),
        started_at: form.started_at,
        finished_at: form.finished_at,
        ownership_copy_ids: selectedCopyIds,
    };
}
