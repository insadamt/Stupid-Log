import { InAppPurchaseActions } from '../useInAppPurchaseActions';
import DeleteInAppPurchaseDialog from './DeleteInAppPurchaseDialog';
import InAppPurchaseModal from './InAppPurchaseModal';

export default function InAppPurchaseDialogs({
    actions,
    firstEditableFinancialDate,
}: {
    actions: InAppPurchaseActions;
    firstEditableFinancialDate: string | null;
}) {
    return (
        <>
            {actions.editingPurchaseId !== null && (
                <InAppPurchaseModal
                    purchase={actions.editingPurchase}
                    form={actions.purchaseForm}
                    errors={actions.purchaseErrors}
                    saving={actions.savingPurchase}
                    firstEditableFinancialDate={firstEditableFinancialDate}
                    updateForm={actions.updatePurchaseForm}
                    close={actions.cancelPurchaseEdit}
                    submit={actions.submitPurchase}
                />
            )}

            {actions.deletePurchaseTarget && (
                <DeleteInAppPurchaseDialog
                    purchase={actions.deletePurchaseTarget}
                    deleting={actions.deletingPurchase}
                    close={actions.cancelDeletePurchase}
                    confirm={actions.confirmDeletePurchase}
                />
            )}
        </>
    );
}
