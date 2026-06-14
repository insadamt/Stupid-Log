import { StatsArchiveGame } from '../../types';

export type RankMovement =
    | { state: 'up'; places: number }
    | { state: 'down'; places: number }
    | { state: 'same'; places: 0 }
    | { state: 'new'; places: null }
    | { state: 'unavailable'; places: null };

export type ArchiveRow = {
    game: StatsArchiveGame;
    rank: number;
    value: number;
    movement: RankMovement;
};

type GameIdentity = {
    library_game_id?: number | null;
    game_id: number;
    platform: string;
};

function getFallbackGameKey(game: GameIdentity) {
    return `game:${game.game_id}:platform:${game.platform.trim().toLocaleLowerCase()}`;
}

function compareGameIdentity(left: GameIdentity, right: GameIdentity) {
    if (left.library_game_id !== null && left.library_game_id !== undefined && right.library_game_id !== null && right.library_game_id !== undefined) {
        return left.library_game_id - right.library_game_id;
    }

    return left.game_id - right.game_id || left.platform.localeCompare(right.platform);
}

export function getGameKey(game: GameIdentity) {
    if (game.library_game_id !== null && game.library_game_id !== undefined) {
        return `library:${game.library_game_id}`;
    }

    return getFallbackGameKey(game);
}

export function buildRankMap(games: StatsArchiveGame[]) {
    const fallbackCounts = games.reduce((counts, game) => {
        const key = getFallbackGameKey(game);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        return counts;
    }, new Map<string, number>());
    const ranks = new Map<string, number>();

    games.forEach((game, index) => {
        ranks.set(getGameKey(game), index + 1);

        const fallbackKey = getFallbackGameKey(game);
        if (fallbackCounts.get(fallbackKey) === 1) {
            ranks.set(fallbackKey, index + 1);
        }
    });

    return ranks;
}

export function getRankMovement(
    currentGame: StatsArchiveGame,
    currentRank: number,
    previousRankMap: Map<string, number> | null,
): RankMovement {
    if (!previousRankMap) return { state: 'unavailable', places: null };

    const previousRank = previousRankMap.get(getGameKey(currentGame))
        ?? previousRankMap.get(getFallbackGameKey(currentGame));
    if (previousRank === undefined) return { state: 'new', places: null };

    const places = previousRank - currentRank;
    if (places > 0) return { state: 'up', places };
    if (places < 0) return { state: 'down', places: Math.abs(places) };
    return { state: 'same', places: 0 };
}

function rankRows(
    games: StatsArchiveGame[],
    value: (game: StatsArchiveGame) => number,
    previousRanks: Map<string, number> | null,
    limit = 8,
): ArchiveRow[] {
    return [...games]
        .sort((left, right) => value(right) - value(left) || compareGameIdentity(left, right))
        .slice(0, limit)
        .map((game, index) => ({
            game,
            rank: index + 1,
            value: value(game),
            movement: getRankMovement(game, index + 1, previousRanks),
        }));
}

export function buildMostPlayedCumulativeRows(current: StatsArchiveGame[], previous?: StatsArchiveGame[] | null) {
    const previousTopGames = previous
        ? rankRows(previous, (game) => game.playtime_hours, null).map((row) => row.game)
        : null;

    return rankRows(current, (game) => game.playtime_hours, previousTopGames ? buildRankMap(previousTopGames) : null);
}

export function buildMostPlayedDeltaRows(
    current: StatsArchiveGame[],
    previous: StatsArchiveGame[],
    previousPrevious?: StatsArchiveGame[] | null,
) {
    const previousPlaytime = buildPlaytimeMap(previous);
    const deltaValue = (game: StatsArchiveGame) => game.playtime_hours - getPreviousPlaytime(game, previousPlaytime);
    const previousPreviousPlaytime = previousPrevious
        ? buildPlaytimeMap(previousPrevious)
        : null;
    const previousDeltaRanks = previousPreviousPlaytime
        ? buildRankMap(rankRows(previous, (game) => game.playtime_hours - getPreviousPlaytime(game, previousPreviousPlaytime), null).map((row) => row.game))
        : null;

    return rankRows(current, deltaValue, previousDeltaRanks);
}

function buildPlaytimeMap(games: StatsArchiveGame[]) {
    const values = new Map<string, number>();
    const fallbackCounts = new Map<string, number>();

    games.forEach((game) => {
        const fallbackKey = getFallbackGameKey(game);
        fallbackCounts.set(fallbackKey, (fallbackCounts.get(fallbackKey) ?? 0) + 1);
        values.set(getGameKey(game), game.playtime_hours);
    });

    games.forEach((game) => {
        const fallbackKey = getFallbackGameKey(game);
        if (fallbackCounts.get(fallbackKey) === 1) {
            values.set(fallbackKey, game.playtime_hours);
        }
    });

    return values;
}

function getPreviousPlaytime(game: StatsArchiveGame, playtime: Map<string, number>) {
    return playtime.get(getGameKey(game)) ?? playtime.get(getFallbackGameKey(game)) ?? 0;
}

export function buildArchiveRows(
    current: StatsArchiveGame[],
    previous: StatsArchiveGame[] | null,
    value: (game: StatsArchiveGame) => number,
) {
    return rankRows(current, value, previous ? buildRankMap(previous) : null);
}
