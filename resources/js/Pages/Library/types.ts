import { ArrowDownAZ } from 'lucide-react';

export type SortMode = 'title' | 'playtime' | 'progress';
export type PresenceFilter = 'all' | 'has' | 'none';
export type CoverFilter = 'all' | 'has' | 'missing';

export type LibraryFilters = {
    status: string;
    platform: string;
    ownershipType: string;
    device: string;
    achievements: PresenceFilter;
    cover: CoverFilter;
    firstPlayedYear: string;
    completedYear: string;
};

export type LibraryMeta = {
    total: number;
    completed: number;
    playtime_hours: number;
    statuses: Record<string, number>;
    platforms: Record<string, number>;
    first_played_years: number[];
    completed_years: number[];
};

export type SortOption = {
    value: SortMode;
    label: string;
    icon: typeof ArrowDownAZ;
};
