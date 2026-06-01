export type Dlc = {
    id: number;
    owned_dlc_id: number | null;
    title: string;
    base_price: string | number | null;
    state: string;
    purchased_price: string | number | null;
    purchased_at: string | null;
};

export type Mode = 'overview' | 'ownership' | 'dlcs';
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
