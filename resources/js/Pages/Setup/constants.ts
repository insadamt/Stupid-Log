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
        detail: 'Add optional IGDB credentials. Steam metadata uses public endpoints and needs no API key.',
        icon: Database,
    },
    {
        eyebrow: 'Launch',
        title: 'Open the log.',
        detail: 'Review the profile and enter your library.',
        icon: Sparkles,
    },
];
