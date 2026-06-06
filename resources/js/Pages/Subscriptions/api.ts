import { SubscriptionForm, SubscriptionPreviewYear } from './types';
import { subscriptionPayload } from './helpers';

export async function loadSubscriptionPreview(
    form: SubscriptionForm,
    selectedCopyIds: number[],
    subscriptionEntryId?: number,
): Promise<SubscriptionPreviewYear[]> {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch('/subscriptions/preview', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrf,
        },
        body: JSON.stringify({
            ...subscriptionPayload(form, selectedCopyIds),
            subscription_entry_id: subscriptionEntryId,
        }),
    });

    const payload = await response.json();

    if (!response.ok) {
        const errors = payload.errors ?? {};
        throw new Error(Object.values(errors).flat()[0] as string ?? 'Unable to preview subscription.');
    }

    return payload.years ?? [];
}
