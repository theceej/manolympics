/**
 * The scoring core. Every game type funnels through here: raw results become a ranking,
 * and the ranking becomes league points via a per-edition (or per-game) points scheme.
 * The overall leaderboard is just the sum of league points across an edition's games.
 *
 * This is the one place rank->points lives — game UIs and the leaderboard both call it.
 */

export type Ranked = {
	attendeeId: string;
	/** Raw score/time, or null if the person didn't post a result. */
	rawValue: number | null;
};

export type RankedResult = Ranked & {
	/** 1-based competition rank; ties share the best rank (1,2,2,4). */
	rank: number;
	leaguePoints: number;
};

export function parseScheme(json: string | null | undefined, fallback: number[]): number[] {
	if (!json) return fallback;
	try {
		const parsed = JSON.parse(json);
		if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) return parsed;
	} catch {
		/* fall through */
	}
	return fallback;
}

/**
 * League points for a given 1-based rank. Ranks beyond the scheme score 0. Ties are handled
 * by the caller by averaging the points across the tied positions.
 */
function pointsForRank(rank: number, scheme: number[]): number {
	return scheme[rank - 1] ?? 0;
}

/**
 * Rank a set of results and assign league points.
 *
 * @param results       one entry per participant
 * @param higherIsBetter true for point-scoring games, false for time/lowest-wins games
 * @param scheme        league points indexed by rank-1
 *
 * Ties share the best competition rank AND split the summed points of the positions they
 * occupy, so total points awarded is stable regardless of ties. Non-finishers (null raw)
 * are ranked last and score 0.
 */
export function rankAndScore(
	results: Ranked[],
	higherIsBetter: boolean,
	scheme: number[]
): RankedResult[] {
	const finishers = results.filter((r) => r.rawValue !== null);
	const nonFinishers = results.filter((r) => r.rawValue === null);

	finishers.sort((a, b) =>
		higherIsBetter ? (b.rawValue as number) - (a.rawValue as number) : (a.rawValue as number) - (b.rawValue as number)
	);

	const out: RankedResult[] = [];
	let i = 0;
	while (i < finishers.length) {
		// Collect the tie group sharing this raw value.
		let j = i;
		while (j < finishers.length && finishers[j].rawValue === finishers[i].rawValue) j++;
		const groupSize = j - i;
		const competitionRank = i + 1; // 1-based; ties share the best rank

		// Average the points of the positions this group occupies (positions i..j-1, 1-based).
		let pointsSum = 0;
		for (let pos = i + 1; pos <= j; pos++) pointsSum += pointsForRank(pos, scheme);
		const sharedPoints = pointsSum / groupSize;

		for (let k = i; k < j; k++) {
			out.push({
				attendeeId: finishers[k].attendeeId,
				rawValue: finishers[k].rawValue,
				rank: competitionRank,
				leaguePoints: sharedPoints
			});
		}
		i = j;
	}

	// Non-finishers all share the next rank after the finishers, worth 0.
	const dnfRank = finishers.length + 1;
	for (const r of nonFinishers) {
		out.push({ attendeeId: r.attendeeId, rawValue: null, rank: dnfRank, leaguePoints: 0 });
	}

	return out;
}

/**
 * Direct-points mode: the entered raw value IS the league points. Rank is derived purely
 * for display (higher points = better). No scheme is consulted.
 */
export function directScore(results: Ranked[]): RankedResult[] {
	const withPoints = results.map((r) => ({
		attendeeId: r.attendeeId,
		rawValue: r.rawValue,
		leaguePoints: r.rawValue ?? 0
	}));
	withPoints.sort((a, b) => b.leaguePoints - a.leaguePoints);

	const out: RankedResult[] = [];
	let i = 0;
	while (i < withPoints.length) {
		let j = i;
		while (j < withPoints.length && withPoints[j].leaguePoints === withPoints[i].leaguePoints) j++;
		for (let k = i; k < j; k++) {
			out.push({ ...withPoints[k], rank: i + 1 });
		}
		i = j;
	}
	return out;
}

/**
 * A single leaderboard row: total league points across all of an edition's finalised games,
 * plus per-game breakdown for the expandable detail view.
 */
export type LeaderboardRow = {
	attendeeId: string;
	total: number;
	perGame: Record<string, number>;
	gamesPlayed: number;
};

/**
 * Aggregate finalised per-game league points into an overall standings table.
 * `scored` maps gameId -> that game's finalised RankedResults.
 */
export function buildLeaderboard(
	attendeeIds: string[],
	scored: Record<string, RankedResult[]>
): LeaderboardRow[] {
	const rows = new Map<string, LeaderboardRow>();
	for (const attendeeId of attendeeIds) {
		rows.set(attendeeId, { attendeeId, total: 0, perGame: {}, gamesPlayed: 0 });
	}

	for (const [gameId, results] of Object.entries(scored)) {
		for (const r of results) {
			let row = rows.get(r.attendeeId);
			if (!row) {
				row = { attendeeId: r.attendeeId, total: 0, perGame: {}, gamesPlayed: 0 };
				rows.set(r.attendeeId, row);
			}
			row.perGame[gameId] = r.leaguePoints;
			row.total += r.leaguePoints;
			row.gamesPlayed += 1;
		}
	}

	return [...rows.values()].sort((a, b) => b.total - a.total || b.gamesPlayed - a.gamesPlayed);
}
