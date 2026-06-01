import { createContext, useContext } from 'react';

export const StatsRevealDelayContext = createContext(0);

export function useStatsRevealDelay() {
    return useContext(StatsRevealDelayContext);
}
