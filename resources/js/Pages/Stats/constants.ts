import { TabKey } from './types';

export const tabs: Array<{ key: TabKey; title: string; sub: string }> = [
    { key: 'overview', title: 'Overview', sub: 'core totals' },
    { key: 'breakdowns', title: 'Breakdowns', sub: 'charts' },
    { key: 'progression', title: 'Progression', sub: 'completion' },
    { key: 'best-games', title: 'Best Games', sub: 'top picks' },
    { key: 'archive', title: 'Game Archive', sub: 'records' },
];

export const palette = ['#9BE44D', '#61C7DF', '#E86D78', '#DFC96B', '#A382DB', '#5CC193', '#D88F45', '#CED8D2'];
export const donutRevealTotalDuration = 1.35;
export const chartRowsRevealGap = 0.18;
