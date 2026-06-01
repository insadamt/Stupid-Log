import { ConfirmedYearStats, GrowthMetric, StatsData } from '../../types';

export type TabKey = 'overview' | 'breakdowns' | 'progression' | 'best-games' | 'archive';
export type MetricKey = 'library_games' | 'completed' | 'hundred_percent' | 'playtime_hours' | 'earned_achievements' | 'total_achievements' | 'achievement_progress' | 'base_value' | 'purchased_value';
export type StatView = StatsData & { year?: number; growth?: Record<string, GrowthMetric>; best_games?: ConfirmedYearStats['best_games'] };
export type Slice = { label: string; value: number; color: string; growth?: GrowthMetric | null };
export type ChartConfig = { title: string; eyebrow: string; data: Slice[]; total: string; center: string; delta?: GrowthMetric | null; format: (value: number) => string; showPlatformIcons?: boolean };
export type DonutArcLayout = { label: string; value: number; color: string; start: number; end: number };
export type DonutTweenSlice = { label: string; from: number; to: number; color: string };
export type StackSegment = { label: string; value: number; color: string };
