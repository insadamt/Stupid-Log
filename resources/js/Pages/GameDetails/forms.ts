import { OwnershipCopyDetails, OwnershipForm } from './types';

export function formFromCopy(copy?: OwnershipCopyDetails, fallbackTypeId?: number): OwnershipForm {
    return {
        ownership_type_id: String(copy?.ownership_type_id ?? fallbackTypeId ?? ''),
        physical_status_id: String(copy?.physical_status_id ?? ''),
        edition_name: copy?.edition_name ?? '',
        base_price: copy?.base_price === null || copy?.base_price === undefined ? '' : String(copy.base_price),
        purchased_price: copy?.purchased_price === null || copy?.purchased_price === undefined ? '' : String(copy.purchased_price),
        purchased_at: copy?.purchased_at ?? '',
    };
}
