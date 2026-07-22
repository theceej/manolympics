import { asc, eq, inArray } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './db/schema';
import { edition, game, gameParticipant, match, round, score } from './db/schema';
import type { Game } from './db/schema';
import {
	buildLeaderboard,
	directScore,
	parseScheme,
	rankAndScore,
	type LeaderboardRow,
	type Ranked,
	type RankedResult
} from './scoring';
import { rankRoundRobin } from './roundrobin-core';

export type Db = LibSQLDatabase<typeof schema>;

const DEFAULT_SCHEME = [10, 8, 6, 5, 4, 3, 2, 1];

function schemeFor(g: Game, editionScheme: string): number[] {
	return parseScheme(
		g.pointSchemeOverride ?? editionScheme,
		parseScheme(editionScheme, DEFAULT_SCHEME)
	);
}

/**
 * Derive a 1st..Nth ranking from a single-elimination bracket. Later exit = better; the
 * champion (winner of the highest-round decided match) beats the finalist. Incomplete
 * bracket => unranked players count as not-yet-finished (null).
 */
function tournamentRanking(matches: schema.Match[]): Ranked[] {
	if (matches.length === 0) return [];
	const maxRound = Math.max(...matches.map((m) => m.roundIndex));
	const exitRound = new Map<string, number>();
	const seen = new Set<string>();

	for (const m of matches) {
		if (m.aAttendeeId) seen.add(m.aAttendeeId);
		if (m.bAttendeeId) seen.add(m.bAttendeeId);
		if (m.winnerAttendeeId) {
			const loser = m.winnerAttendeeId === m.aAttendeeId ? m.bAttendeeId : m.aAttendeeId;
			if (loser) exitRound.set(loser, m.roundIndex);
		}
	}
	const final = matches.filter((m) => m.roundIndex === maxRound && m.winnerAttendeeId).at(0);
	if (final?.winnerAttendeeId) exitRound.set(final.winnerAttendeeId, maxRound + 1);

	return [...seen].map((pid) => ({
		attendeeId: pid,
		rawValue: exitRound.has(pid) ? exitRound.get(pid)! : null
	}));
}

/** Compute ranked league-point results for one game, live from its raw data. */
export async function computeGameResults(db: Db, gameId: string): Promise<RankedResult[]> {
	const g = await db.select().from(game).where(eq(game.id, gameId)).get();
	if (!g) return [];
	const ed = await db
		.select({ scheme: edition.pointScheme })
		.from(edition)
		.where(eq(edition.id, g.editionId))
		.get();
	const scheme = schemeFor(g, ed?.scheme ?? JSON.stringify(DEFAULT_SCHEME));

	if (g.type === 'tournament') {
		const matches = await db.select().from(match).where(eq(match.gameId, gameId)).all();
		return rankAndScore(tournamentRanking(matches), true, scheme);
	}

	const participants = await db
		.select({ attendeeId: gameParticipant.attendeeId, team: gameParticipant.team })
		.from(gameParticipant)
		.where(eq(gameParticipant.gameId, gameId))
		.all();

	if (g.type === 'round_robin') {
		const matches = await db.select().from(match).where(eq(match.gameId, gameId)).all();
		return rankRoundRobin(
			participants.map((p) => p.attendeeId),
			matches,
			scheme
		);
	}
	const scores = await db.select().from(score).where(eq(score.gameId, gameId)).all();

	// Raw value per attendee: sum across rounds for `rounds`, else the single score.
	const rawByAttendee = new Map<string, number | null>();
	for (const p of participants) rawByAttendee.set(p.attendeeId, null);
	for (const s of scores) {
		if (s.rawValue === null) continue;
		const prev = rawByAttendee.get(s.attendeeId) ?? null;
		rawByAttendee.set(s.attendeeId, (prev ?? 0) + s.rawValue);
	}

	if (g.type === 'team') {
		const teamRaw = new Map<string, number | null>();
		const membersByTeam = new Map<string, string[]>();
		for (const p of participants) {
			const team = p.team ?? 'No team';
			membersByTeam.set(team, [...(membersByTeam.get(team) ?? []), p.attendeeId]);
			const r = rawByAttendee.get(p.attendeeId);
			if (r !== null && r !== undefined) teamRaw.set(team, (teamRaw.get(team) ?? 0) + r);
			else if (!teamRaw.has(team)) teamRaw.set(team, null);
		}
		const teamInputs = [...teamRaw].map(([team, v]) => ({ attendeeId: team, rawValue: v }));
		const teamRanked =
			g.scoringMode === 'direct'
				? directScore(teamInputs)
				: rankAndScore(teamInputs, g.higherIsBetter, scheme);
		const out: RankedResult[] = [];
		for (const t of teamRanked) {
			for (const member of membersByTeam.get(t.attendeeId) ?? []) {
				out.push({ ...t, attendeeId: member });
			}
		}
		return out;
	}

	const inputs: Ranked[] = participants.map((p) => ({
		attendeeId: p.attendeeId,
		rawValue: rawByAttendee.get(p.attendeeId) ?? null
	}));
	return g.scoringMode === 'direct'
		? directScore(inputs)
		: rankAndScore(inputs, g.higherIsBetter, scheme);
}

/** Live overall standings for an edition: sum league points across every game with results. */
export async function editionLeaderboard(
	db: Db,
	editionId: string
): Promise<{ rows: LeaderboardRow[]; games: Game[] }> {
	const games = await db
		.select()
		.from(game)
		.where(eq(game.editionId, editionId))
		.orderBy(asc(game.orderIndex))
		.all();

	const participantRows = games.length
		? await db
				.select({ attendeeId: gameParticipant.attendeeId })
				.from(gameParticipant)
				.where(
					inArray(
						gameParticipant.gameId,
						games.map((g) => g.id)
					)
				)
				.all()
		: [];
	const attendeeIds = [...new Set(participantRows.map((p) => p.attendeeId))];

	const scored: Record<string, RankedResult[]> = {};
	for (const g of games) {
		const results = await computeGameResults(db, g.id);
		if (results.some((r) => r.leaguePoints > 0 || r.rawValue !== null)) scored[g.id] = results;
	}

	return { rows: buildLeaderboard(attendeeIds, scored), games };
}

export async function gameRounds(db: Db, gameId: string) {
	return db.select().from(round).where(eq(round.gameId, gameId)).orderBy(asc(round.orderIndex)).all();
}
