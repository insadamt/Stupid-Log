import { Database, Sparkles, UserRound } from 'lucide-react';

export const steps = [
    {
        eyebrow: 'Profile',
        title: 'Name the save.',
        detail: 'Create the local profile that owns your library.',
        icon: UserRound,
    },
    {
        eyebrow: 'Signals',
        title: 'Connect scanners.',
        detail: 'Add optional provider keys now, or leave them blank and add them later.',
        icon: Database,
    },
    {
        eyebrow: 'Launch',
        title: 'Open the log.',
        detail: 'Review the profile and enter your library.',
        icon: Sparkles,
    },
];
