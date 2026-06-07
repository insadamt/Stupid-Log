import { router } from '@inertiajs/react';
import { useState } from 'react';
import { InAppPurchase, InAppPurchaseForm } from './types';

export type InAppPurchaseActions = ReturnType<typeof useInAppPurchaseActions>;

export function useInAppPurchaseActions({
    libraryGameId,
    purchases,
    firstEditableFinancialDate,
}: {
    libraryGameId: number;
    purchases: InAppPurchase[];
    firstEditableFinancialDate: string | null;
}) {
    const [editingPurchaseId, setEditingPurchaseId] = useState<number | 'new' | null>(null);
    const [purchaseForm, setPurchaseForm] = useState<InAppPurchaseForm>({
        title: '',
        amount_paid: '',
        purchased_at: firstEditableFinancialDate ?? new Date().toISOString().slice(0, 10),
    });
    const [purchaseErrors, setPurchaseErrors] = useState<Record<string, string>>({});
    const [savingPurchase, setSavingPurchase] = useState(false);
    const [deletePurchaseTarget, setDeletePurchaseTarget] = useState<InAppPurchase | null>(null);
    const [deletingPurchase, setDeletingPurchase] = useState(false);
    const editingPurchase = typeof editingPurchaseId === 'number'
        ? purchases.find((purchase) => purchase.id === editingPurchaseId) ?? null
        : null;

    function updatePurchaseForm(patch: Partial<InAppPurchaseForm>) {
        setPurchaseForm((current) => ({ ...current, ...patch }));
    }

    function startAddPurchase() {
        setEditingPurchaseId('new');
        setPurchaseForm({
            title: '',
            amount_paid: '',
            purchased_at: firstEditableFinancialDate ?? new Date().toISOString().slice(0, 10),
        });
        setPurchaseErrors({});
    }

    function startEditPurchase(purchase: InAppPurchase) {
        if (purchase.is_locked) return;

        setEditingPurchaseId(purchase.id);
        setPurchaseForm({
            title: purchase.title,
            amount_paid: String(purchase.amount_paid),
            purchased_at: purchase.purchased_at ?? '',
        });
        setPurchaseErrors({});
    }

    function cancelPurchaseEdit() {
        setEditingPurchaseId(null);
        setPurchaseErrors({});
    }

    function submitPurchase() {
        const payload = {
            title: purchaseForm.title,
            amount_paid: Number(purchaseForm.amount_paid),
            purchased_at: purchaseForm.purchased_at,
        };
        const requestOptions = {
            preserveScroll: true,
            onStart: () => setSavingPurchase(true),
            onFinish: () => setSavingPurchase(false),
            onSuccess: () => cancelPurchaseEdit(),
            onError: (errors: Record<string, string>) => setPurchaseErrors(errors),
        };

        if (editingPurchaseId === 'new') {
            router.post(`/games/${libraryGameId}/in-app-purchases`, payload, requestOptions);
            return;
        }

        if (typeof editingPurchaseId === 'number') {
            router.patch(`/in-app-purchases/${editingPurchaseId}`, payload, requestOptions);
        }
    }

    function requestDeletePurchase(purchase: InAppPurchase) {
        if (!purchase.is_locked) setDeletePurchaseTarget(purchase);
    }

    function cancelDeletePurchase() {
        if (!deletingPurchase) setDeletePurchaseTarget(null);
    }

    function confirmDeletePurchase() {
        if (!deletePurchaseTarget || deletePurchaseTarget.is_locked) return;

        router.delete(`/in-app-purchases/${deletePurchaseTarget.id}`, {
            preserveScroll: true,
            onError: (errors: Record<string, string>) => setPurchaseErrors(errors),
            onStart: () => setDeletingPurchase(true),
            onFinish: () => setDeletingPurchase(false),
            onSuccess: () => setDeletePurchaseTarget(null),
        });
    }

    return {
        editingPurchaseId,
        editingPurchase,
        purchaseForm,
        purchaseErrors,
        savingPurchase,
        deletePurchaseTarget,
        deletingPurchase,
        updatePurchaseForm,
        startAddPurchase,
        startEditPurchase,
        cancelPurchaseEdit,
        submitPurchase,
        requestDeletePurchase,
        cancelDeletePurchase,
        confirmDeletePurchase,
    };
}
