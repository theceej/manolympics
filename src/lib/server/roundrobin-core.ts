import { eq } from 'drizzle-orm';
import { match } from './db/schema';
import type { Match } from './db/schema';
import { rankAndScore, type RankedResult } from './scoring';
import type { Db } from './results-core';

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * Generate a full round-robin schedule (everyone plays everyone once), replacing any
 * existing matches. Uses the circle method so each "round" is a set of simultaneous 1v1s
 * with nobody double-booked — handy for running the games in waves.
 */
export async function generateRoundRobin(
	db: Db,
	gameId: string,
	attendeeIds: string[]
): Promise<void> {
	await db.delete(match).where(eq(match.gameId, gameId));
	if (attendeeIds.length < 2) return;

	const arr: (string | null)[] = shuffle(attendeeIds);
	if (arr.length % 2 === 1) arr.push(null); // bye marker for odd counts
	const n = arr.length;
	const rounds = n - 1;
	const half = n / 2;

	const rows: (typeof match.$inferInsert)[] = [];
	let rotating = arr.slice(1); // arr[0] is fixed
	for (let r = 0; r < rounds; r++) {
		const lineup = [arr[0], ...rotating];
		let slot = 0;
		for (let i = 0; i < half; i++) {
			const a = lineup[i];
			const b = lineup[n - 1 - i];
			if (a !== null && b !== null) {
				rows.push({
					gameId,
					roundName: `Round ${r + 1}`,
					roundIndex: r,
					slot: slot++,
					aAttendeeId: a,
					bAttendeeId: b
				});
			}
		}
		// rotate: move the last element to the front of the rotating part
		rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
	}

	await db.insert(match).values(rows);
}

/**
 * Rank round-robin participants by wins, breaking ties by head-to-head record among the
 * players tied on wins. Returns nothing until at least one match has a decided winner.
 * League points come from the scheme via the shared rankAndScore (ties share averaged points).
 */
export function rankRoundRobin(
	participantIds: string[],
	matches: Match[],
	scheme: number[]
): RankedResult[] {
	const decided = matches.filter((m) => m.winnerAttendeeId);
	if (decided.length === 0) return [];

	const wins = new Map<string, number>(participantIds.map((p) => [p, 0]));
	for (const m of decided) {
		wins.set(m.winnerAttendeeId!, (wins.get(m.winnerAttendeeId!) ?? 0) + 1);
	}

	// Group players on equal win totals, then compute head-to-head wins within each group.
	const byWins = new Map<number, string[]>();
	for (const p of participantIds) {
		const w = wins.get(p) ?? 0;
		byWins.set(w, [...(byWins.get(w) ?? []), p]);
	}
	const h2h = new Map<string, number>(participantIds.map((p) => [p, 0]));
	for (const group of byWins.values()) {
		if (group.length < 2) continue;
		const g = new Set(group);
		for (const m of decided) {
			const winner = m.winnerAttendeeId!;
			if (!g.has(winner)) continue;
			const loser = winner === m.aAttendeeId ? m.bAttendeeId : m.aAttendeeId;
			if (loser && g.has(loser)) h2h.set(winner, (h2h.get(winner) ?? 0) + 1);
		}
	}

	// Composite sort key keeps wins dominant and h2h as the tie-break, so equal (wins, h2h)
	// stays a true tie that rankAndScore shares points across. Restore wins for display.
	const inputs = participantIds.map((p) => ({
		attendeeId: p,
		rawValue: (wins.get(p) ?? 0) * 1000 + (h2h.get(p) ?? 0)
	}));
	return rankAndScore(inputs, true, scheme).map((r) => ({
		...r,
		rawValue: wins.get(r.attendeeId) ?? 0
	}));
}
