export type SubscriptionEntry = {
    id: number;
    ownership_type_id: number;
    ownership_type: string;
    amount_paid: string | number;
    started_at: string;
    finished_at: string;
    selected_ownership_copy_ids: number[];
    selected_count: number;
    has_locked_years: boolean;
    locked_ownership_copy_ids: number[];
    years: SubscriptionYear[];
};

export type SubscriptionYear = {
    id: number;
    year: number;
    amount_allocated: string | number;
    is_locked: boolean;
    locked_by_snapshot_year: number | null;
    allocations: Array<{
        ownership_copy_id: number;
        allocated_amount: string | number;
    }>;
};

export type SubscriptionOwnershipType = {
    id: number;
    name: string;
    is_subscription: boolean;
};

export type SubscriptionOwnershipCopy = {
    id: number;
    ownership_type_id: number;
    ownership_type: string;
    library_game_id: number;
    game_title: string;
    platform: string;
    cover_url?: string | null;
};

export type SubscriptionForm = {
    ownership_type_id: string;
    amount_paid: string;
    started_at: string;
    finished_at: string;
};

export type SubscriptionPreviewYear = {
    year: number;
    amount_allocated: string | number;
    is_locked: boolean;
    locked_by_snapshot_year: number | null;
    selected_copy_count: number;
    unallocated_amount: string | number;
    allocations: Array<{
        ownership_copy_id: number;
        allocated_amount: string | number;
        game_title: string;
        platform: string;
    }>;
};

export type SubscriptionFilter = 'all' | 'editable' | 'locked';
