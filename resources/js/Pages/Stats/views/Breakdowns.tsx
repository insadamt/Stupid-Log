import { useState } from 'react';
import { PlatformBreakdown, StatusBreakdown } from '../../../types';
import { Switch } from '../components/Controls';
import GameUiChart from '../components/GameUiChart';
import { ChartConfig, StatView } from '../types';
import { growth, hours, metricGrowth, money, n, num, slices } from '../utils';

export default function Breakdowns({ stats, previous }: { stats: StatView; previous?: StatView | null }) {
    const [chart, setChart] = useState<'games' | 'playtime' | 'achievements' | 'value'>('achievements');
    const [gamesMode, setGamesMode] = useState<'platform' | 'status'>('platform');
    const [achievementMode, setAchievementMode] = useState<'earned' | 'total'>('earned');
    const [valueMode, setValueMode] = useState<'base' | 'paid'>('base');
    const [includeDlcs, setIncludeDlcs] = useState(true);
    const [includeSubscriptions, setIncludeSubscriptions] = useState(true);
    const [includeInAppPurchases, setIncludeInAppPurchases] = useState(true);

    const platforms = stats.breakdowns.platforms;
    const prevPlatforms = previous?.breakdowns.platforms ?? [];
    const statuses = stats.breakdowns.statuses;
    const prevStatuses = previous?.breakdowns.statuses ?? [];

    const platformBaseValue = (item: PlatformBreakdown) => {
        if (item.copy_base_value !== undefined || item.dlc_base_value !== undefined) {
            return n(item.copy_base_value) + (includeDlcs ? n(item.dlc_base_value) : 0);
        }

        return includeDlcs ? n(item.base_value) : n(item.base_value_without_dlcs ?? item.base_value);
    };

    const platformPaidValue = (item: PlatformBreakdown) => {
        const hasComponentValues = item.copy_purchased_value !== undefined
            || item.dlc_purchased_value !== undefined
            || item.subscription_total_value !== undefined
            || item.in_app_purchase_total_value !== undefined;

        if (!hasComponentValues) {
            return includeDlcs ? n(item.purchased_value) : n(item.purchased_value_without_dlcs ?? item.purchased_value);
        }

        const subscriptionValue = item.subscription_total_value ?? item.subscription_allocated_value;
        const inAppPurchaseValue = item.in_app_purchase_total_value ?? item.in_app_purchase_value;

        return n(item.copy_purchased_value)
            + (includeDlcs ? n(item.dlc_purchased_value) : 0)
            + (includeSubscriptions ? n(subscriptionValue) : 0)
            + (includeInAppPurchases ? n(inAppPurchaseValue) : 0);
    };

    const valueGetter = (item: PlatformBreakdown) => valueMode === 'base'
        ? platformBaseValue(item)
        : platformPaidValue(item);

    const valueCenterLabel = () => {
        if (valueMode === 'base') {
            return includeDlcs ? 'with DLCs' : 'no DLCs';
        }

        const included = [
            includeDlcs ? 'DLCs' : null,
            includeSubscriptions ? 'subs' : null,
            includeInAppPurchases ? 'IAP' : null,
        ].filter(Boolean);

        return included.length ? included.join(' + ') : 'copies only';
    };

    const chartConfig: ChartConfig = (() => {
        if (chart === 'games') {
            const data = gamesMode === 'platform' ? slices<PlatformBreakdown>(platforms, (item) => item.library_games, prevPlatforms) : slices<StatusBreakdown>(statuses, (item) => item.library_games, prevStatuses);
            return { title: 'Total Games', eyebrow: gamesMode === 'platform' ? 'By platform' : 'By status', data, total: num(stats.library_games), center: 'games', delta: metricGrowth('library_games', stats, previous), format: (value: number) => num(value), showPlatformIcons: gamesMode === 'platform' };
        }
        if (chart === 'playtime') {
            return { title: 'Playtime Pool', eyebrow: 'Only by platform', data: slices<PlatformBreakdown>(platforms, (item) => item.playtime_hours, prevPlatforms), total: hours(stats.playtime_hours), center: 'hours played', delta: metricGrowth('playtime_hours', stats, previous), format: hours, showPlatformIcons: true };
        }
        if (chart === 'achievements') {
            const key = achievementMode === 'total' ? 'total_achievements' : 'earned_achievements';
            return { title: 'Achievement Pool', eyebrow: `Only by platform · ${achievementMode}`, data: slices<PlatformBreakdown>(platforms, (item) => n(item[key]), prevPlatforms), total: num(achievementMode === 'total' ? stats.total_achievements : stats.earned_achievements), center: achievementMode === 'total' ? 'available achievements' : 'earned achievements', delta: metricGrowth(achievementMode === 'total' ? 'total_achievements' : 'earned_achievements', stats, previous), format: (value: number) => num(value), showPlatformIcons: true };
        }
        const data = slices<PlatformBreakdown>(platforms, valueGetter, prevPlatforms);
        const total = data.reduce((sum, item) => sum + item.value, 0);
        const prevTotal = prevPlatforms.reduce((sum, item) => sum + valueGetter(item), 0);
        return { title: 'Library Value', eyebrow: `Only by platform · ${valueMode}`, data, total: money(total), center: valueCenterLabel(), delta: previous ? growth(total, prevTotal) : null, format: money, showPlatformIcons: true };
    })();

    return (
        <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
            <div className="flex min-h-0 flex-wrap items-center justify-between gap-2 rounded-[24px] border border-black/8 bg-[#eef4eb]/80 p-3 shadow-[0_14px_40px_rgb(9_14_12/0.05)]">
                <Switch value={chart} options={[{ value: 'games', label: 'Games' }, { value: 'playtime', label: 'Playtime' }, { value: 'achievements', label: 'Achievements' }, { value: 'value', label: 'Value' }]} onChange={setChart} />
                <div className="flex flex-wrap items-center gap-2">
                    {chart === 'games' && <Switch value={gamesMode} options={[{ value: 'platform', label: 'By Platform' }, { value: 'status', label: 'By Status' }]} onChange={setGamesMode} />}
                    {chart === 'achievements' && <Switch value={achievementMode} options={[{ value: 'earned', label: 'Earned' }, { value: 'total', label: 'Total' }]} onChange={setAchievementMode} />}
                    {chart === 'value' && <Switch value={valueMode} options={[{ value: 'base', label: 'Base' }, { value: 'paid', label: 'Paid' }]} onChange={setValueMode} />}
                    {chart === 'value' && <button type="button" onClick={() => setIncludeDlcs((value) => !value)} className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] ring-1 ring-black/10 ${includeDlcs ? 'bg-[#b7ff63] text-black' : 'bg-white/75 text-black/45 hover:text-black'}`}>{includeDlcs ? 'DLCs included' : 'DLCs excluded'}</button>}
                    {chart === 'value' && valueMode === 'paid' && <button type="button" onClick={() => setIncludeSubscriptions((value) => !value)} className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] ring-1 ring-black/10 ${includeSubscriptions ? 'bg-[#b7ff63] text-black' : 'bg-white/75 text-black/45 hover:text-black'}`}>{includeSubscriptions ? 'Subscriptions included' : 'Subscriptions excluded'}</button>}
                    {chart === 'value' && valueMode === 'paid' && <button type="button" onClick={() => setIncludeInAppPurchases((value) => !value)} className={`rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] ring-1 ring-black/10 ${includeInAppPurchases ? 'bg-[#b7ff63] text-black' : 'bg-white/75 text-black/45 hover:text-black'}`}>{includeInAppPurchases ? 'In-app purchases included' : 'In-app purchases excluded'}</button>}
                </div>
            </div>
            <GameUiChart config={chartConfig} />
        </div>
    );
}
