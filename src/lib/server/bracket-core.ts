import { eq } from 'drizzle-orm';
import { match } from './db/schema';
import type { Db } from './results-core';

const ROUND_NAMES: Record<number, string> = {
	1: 'Final',
	2: 'Semi-final',
	4: 'Quarter-final',
	8: 'Round of 16',
	16: 'Round of 32'
};

function roundName(matchesInRound: number): string {
	return ROUND_NAMES[matchesInRound] ?? `Round of ${matchesInRound * 2}`;
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

type Row = typeof match.$inferInsert & { id: string };

function advance(byId: Map<string, Row>, m: Row, winner: string) {
	m.winnerAttendeeId = winner;
	if (!m.nextMatchId) return;
	const next = byId.get(m.nextMatchId);
	if (!next) return;
	if (m.nextSlot === 0) next.aAttendeeId = winner;
	else next.bAttendeeId = winner;
}

/**
 * Build a single-elimination bracket, replacing any existing matches for the game.
 * Byes (when count isn't a power of two) auto-advance and propagate immediately.
 */
export async function generateBracket(db: Db, gameId: string, attendeeIds: string[]): Promise<void> {
	await db.delete(match).where(eq(match.gameId, gameId));
	if (attendeeIds.length < 2) return;

	let size = 1;
	while (size < attendeeIds.length) size *= 2;
	const totalRounds = Math.log2(size);
	const players = shuffle(attendeeIds);
	const slots: (string | null)[] = [...players, ...Array(size - players.length).fill(null)];

	const rows: Row[][] = [];
	for (let r = 0; r < totalRounds; r++) {
		const count = size / 2 ** (r + 1);
		const roundRows: Row[] = [];
		for (let i = 0; i < count; i++) {
			roundRows.push({ id: crypto.randomUUID(), gameId, roundName: roundName(count), roundIndex: r, slot: i });
		}
		rows.push(roundRows);
	}
	for (let r = 0; r < totalRounds - 1; r++) {
		for (let i = 0; i < rows[r].length; i++) {
			rows[r][i].nextMatchId = rows[r + 1][Math.floor(i / 2)].id;
			rows[r][i].nextSlot = i % 2;
		}
	}
	for (let i = 0; i < rows[0].length; i++) {
		rows[0][i].aAttendeeId = slots[i * 2] ?? null;
		rows[0][i].bAttendeeId = slots[i * 2 + 1] ?? null;
	}

	const flat = rows.flat();
	const byId = new Map(flat.map((m) => [m.id, m]));
	for (const m of rows[0]) {
		const a = m.aAttendeeId ?? null;
		const b = m.bAttendeeId ?? null;
		if (a && !b) advance(byId, m, a);
		else if (b && !a) advance(byId, m, b);
	}

	await db.insert(match).values(flat);
}

/** Record a match result and push the winner into the next round. */
export async function recordMatch(
	db: Db,
	matchId: string,
	winnerAttendeeId: string,
	aScore: number | null,
	bScore: number | null
): Promise<void> {
	const m = await db.select().from(match).where(eq(match.id, matchId)).get();
	if (!m) return;
	await db.update(match).set({ winnerAttendeeId, aScore, bScore }).where(eq(match.id, matchId));
	if (m.nextMatchId) {
		const patch =
			m.nextSlot === 0 ? { aAttendeeId: winnerAttendeeId } : { bAttendeeId: winnerAttendeeId };
		await db.update(match).set(patch).where(eq(match.id, m.nextMatchId));
	}
}
