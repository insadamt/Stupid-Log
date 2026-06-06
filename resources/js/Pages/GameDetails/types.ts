export type Dlc = {
    id: number;
    owned_dlc_id: number | null;
    title: string;
    base_price: string | number | null;
    state: string;
    purchased_price: string | number | null;
    purchased_at: string | null;
};

export type Mode = 'overview' | 'ownership' | 'dlcs' | 'purchases';
export type EditTab = 'basics' | 'progress' | 'platform' | 'description';

export type OwnershipCopyDetails = {
    id: number;
    ownership_type_id: number;
    ownership_type: string | null;
    physical_status_id: number | null;
    physical_status: string | null;
    edition_name: string | null;
    base_price: string | number | null;
    purchased_price: string | number | null;
    purchased_at: string | null;
};

export type Details = {
    platform_id: number;
    device_ids: number[];
    ownership_copies: OwnershipCopyDetails[];
    platform_ownership_types: Array<{ id: number; name: string }>;
};

export type OwnershipForm = {
    ownership_type_id: string;
    physical_status_id: string;
    edition_name: string;
    base_price: string;
    purchased_price: string;
    purchased_at: string;
};

export type DlcForm = {
    acquisition_type: string;
    purchased_price: string;
    purchased_at: string;
};

export type InAppPurchase = {
    id: number;
    title: string;
    amount_paid: string | number;
    purchased_at: string | null;
    is_locked: boolean;
    locked_by_snapshot_run_id: number | null;
    locked_by_snapshot_year: number | null;
};

export type InAppPurchaseForm = {
    title: string;
    amount_paid: string;
    purchased_at: string;
};

export type PaidBreakdown = {
    copy_purchased_value: number;
    dlc_purchased_value: number;
    subscription_allocated_value: number;
    in_app_purchase_value: number;
    total_purchased_value: number;
    subscription_allocations: Array<{
        subscription_entry_id: number;
        year: number;
        ownership_type: string;
        yearly_amount: string | number;
        allocated_amount: number;
        is_locked: boolean;
        locked_by_snapshot_run_id: number | null;
        locked_by_snapshot_year: number | null;
    }>;
    in_app_purchases: InAppPurchase[];
};

export type GameEditForm = {
    title: string;
    publisher: string;
    description: string;
    base_price_default: string;
    total_achievements: string;
    status_id: string;
    playtime_hours: string;
    earned_achievements: string;
    completed_at: string;
};
