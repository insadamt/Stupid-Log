import { ArrowDownAZ } from 'lucide-react';

export type SortMode = 'title' | 'playtime' | 'progress';

export type LibraryMeta = {
    total: number;
    completed: number;
    playtime_hours: number;
    statuses: Record<string, number>;
    platforms: Record<string, number>;
};

export type SortOption = {
    value: SortMode;
    label: string;
    icon: typeof ArrowDownAZ;
};
