import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from './db/schema';
import { attendee, edition, game, gameParticipant, match, round, score } from './db/schema';
import { computeGameResults, editionLeaderboard, type Db } from './results-core';
import { generateBracket, recordMatch } from './bracket-core';
import { generateRoundRobin, rankRoundRobin } from './roundrobin-core';
import type { Match } from './db/schema';

let db: Db;
const ids = { a: 'A', b: 'B', c: 'C', d: 'D' };

function playAll(gameId: string) {
	return Object.values(ids).map((attendeeId) => ({ gameId, attendeeId }));
}

beforeEach(async () => {
	const client = createClient({ url: ':memory:' });
	db = drizzle(client, { schema });
	await migrate(db, { migrationsFolder: './drizzle' });

	await db.insert(attendee).values([
		{ id: ids.a, name: 'Alice' },
		{ id: ids.b, name: 'Bob' },
		{ id: ids.c, name: 'Carol' },
		{ id: ids.d, name: 'Dan' }
	]);
	await db.insert(edition).values({ id: 'E', year: 2026 });
});

describe('individual game', () => {
	it('ranks by raw score and awards scheme points', async () => {
		await db.insert(game).values({ id: 'g1', editionId: 'E', name: 'Darts', type: 'individual' });
		await db.insert(gameParticipant).values(playAll('g1'));
		await db.insert(score).values([
			{ gameId: 'g1', attendeeId: ids.a, rawValue: 10 },
			{ gameId: 'g1', attendeeId: ids.b, rawValue: 8 },
			{ gameId: 'g1', attendeeId: ids.c, rawValue: 6 },
			{ gameId: 'g1', attendeeId: ids.d, rawValue: 4 }
		]);
		const res = await computeGameResults(db, 'g1');
		const byId = Object.fromEntries(res.map((r) => [r.attendeeId, r]));
		expect(byId.A.rank).toBe(1);
		expect(byId.A.leaguePoints).toBe(10);
		expect(byId.D.rank).toBe(4);
		expect(byId.D.leaguePoints).toBe(5);
	});

	it('honours lower-is-better (time) games', async () => {
		await db.insert(game).values({
			id: 'g1',
			editionId: 'E',
			name: 'Sprint',
			type: 'individual',
			higherIsBetter: false
		});
		await db.insert(gameParticipant).values(playAll('g1'));
		await db.insert(score).values([
			{ gameId: 'g1', attendeeId: ids.a, rawValue: 12.5 },
			{ gameId: 'g1', attendeeId: ids.b, rawValue: 11.1 }
		]);
		const res = await computeGameResults(db, 'g1');
		const byId = Object.fromEntries(res.map((r) => [r.attendeeId, r]));
		expect(byId.B.rank).toBe(1); // faster time wins
		expect(byId.A.rank).toBe(2);
	});
});

describe('rounds game', () => {
	it('sums raw across rounds before ranking', async () => {
		await db.insert(game).values({ id: 'g2', editionId: 'E', name: 'Quiz', type: 'rounds' });
		await db.insert(gameParticipant).values(playAll('g2'));
		await db.insert(round).values([
			{ id: 'r1', gameId: 'g2', name: 'R1', orderIndex: 0 },
			{ id: 'r2', gameId: 'g2', name: 'R2', orderIndex: 1 }
		]);
		// Alice 3+9=12 total beats Bob 8+1=9.
		await db.insert(score).values([
			{ gameId: 'g2', roundId: 'r1', attendeeId: ids.a, rawValue: 3 },
			{ gameId: 'g2', roundId: 'r2', attendeeId: ids.a, rawValue: 9 },
			{ gameId: 'g2', roundId: 'r1', attendeeId: ids.b, rawValue: 8 },
			{ gameId: 'g2', roundId: 'r2', attendeeId: ids.b, rawValue: 1 }
		]);
		const res = await computeGameResults(db, 'g2');
		const byId = Object.fromEntries(res.map((r) => [r.attendeeId, r]));
		expect(byId.A.rank).toBe(1);
		expect(byId.B.rank).toBe(2);
	});
});

describe('team game', () => {
	it('ranks teams and gives each member the team points', async () => {
		await db.insert(game).values({ id: 'g3', editionId: 'E', name: 'Tug', type: 'team' });
		await db.insert(gameParticipant).values([
			{ gameId: 'g3', attendeeId: ids.a, team: 'Red' },
			{ gameId: 'g3', attendeeId: ids.b, team: 'Red' },
			{ gameId: 'g3', attendeeId: ids.c, team: 'Blue' },
			{ gameId: 'g3', attendeeId: ids.d, team: 'Blue' }
		]);
		// Red total 5+5=10 beats Blue 1+1=2.
		await db.insert(score).values([
			{ gameId: 'g3', attendeeId: ids.a, rawValue: 5 },
			{ gameId: 'g3', attendeeId: ids.b, rawValue: 5 },
			{ gameId: 'g3', attendeeId: ids.c, rawValue: 1 },
			{ gameId: 'g3', attendeeId: ids.d, rawValue: 1 }
		]);
		const res = await computeGameResults(db, 'g3');
		const byId = Object.fromEntries(res.map((r) => [r.attendeeId, r]));
		expect(byId.A.rank).toBe(1);
		expect(byId.B.rank).toBe(1);
		expect(byId.A.leaguePoints).toBe(10); // both Red members get 1st-place points
		expect(byId.B.leaguePoints).toBe(10);
		expect(byId.C.rank).toBe(2);
		expect(byId.C.leaguePoints).toBe(8);
	});
});

describe('tournament game', () => {
	it('generates a bracket and crowns a champion via recorded matches', async () => {
		await db.insert(game).values({ id: 'g4', editionId: 'E', name: 'Arm wrestle', type: 'tournament' });
		await db.insert(gameParticipant).values(playAll('g4'));
		await generateBracket(db, 'g4', Object.values(ids));

		// Play out every match: lower letter always wins, so A should be champion.
		let pending = true;
		while (pending) {
			pending = false;
			const matches = await db.select().from(match).where(eq(match.gameId, 'g4')).all();
			for (const m of matches) {
				if (m.aAttendeeId && m.bAttendeeId && !m.winnerAttendeeId) {
					const winner = [m.aAttendeeId, m.bAttendeeId].sort()[0];
					await recordMatch(db, m.id, winner, null, null);
					pending = true;
				}
			}
		}

		const res = await computeGameResults(db, 'g4');
		const byId = Object.fromEntries(res.map((r) => [r.attendeeId, r]));
		expect(byId.A.rank).toBe(1); // champion
		expect(byId.A.leaguePoints).toBe(10);
		// Everyone got a finishing position (no nulls once bracket complete).
		expect(res.every((r) => r.rawValue !== null)).toBe(true);
	});
});

describe('round robin', () => {
	const scheme = [10, 8, 6, 5, 4, 3, 2, 1];
	// Minimal Match stand-ins; only the three fields rankRoundRobin reads are set.
	const m = (a: string, b: string, winner: string): Match =>
		({ aAttendeeId: a, bAttendeeId: b, winnerAttendeeId: winner }) as Match;

	it('generates every pairing exactly once', async () => {
		await db.insert(game).values({ id: 'rr', editionId: 'E', name: 'Darts', type: 'round_robin' });
		await db.insert(gameParticipant).values(playAll('rr'));
		await generateRoundRobin(db, 'rr', Object.values(ids));
		const matches = await db.select().from(match).where(eq(match.gameId, 'rr')).all();
		expect(matches).toHaveLength(6); // C(4,2)
		const pairs = new Set(matches.map((x) => [x.aAttendeeId, x.bAttendeeId].sort().join('-')));
		expect(pairs.size).toBe(6); // all distinct, no repeats
	});

	it('ranks purely by win count', () => {
		// A beats everyone, B beats C&D, C beats D, D none.
		const matches = [
			m('A', 'B', 'A'), m('A', 'C', 'A'), m('A', 'D', 'A'),
			m('B', 'C', 'B'), m('B', 'D', 'B'), m('C', 'D', 'C')
		];
		const res = rankRoundRobin(['A', 'B', 'C', 'D'], matches, scheme);
		const byId = Object.fromEntries(res.map((r) => [r.attendeeId, r]));
		expect(byId.A).toMatchObject({ rank: 1, rawValue: 3, leaguePoints: 10 });
		expect(byId.B).toMatchObject({ rank: 2, rawValue: 2, leaguePoints: 8 });
		expect(byId.D).toMatchObject({ rank: 4, rawValue: 0, leaguePoints: 5 });
	});

	it('breaks ties on wins by head-to-head', () => {
		// A & B tie on 2 wins (A beat B); C & D tie on 1 win (C beat D).
		const matches = [
			m('A', 'B', 'A'), m('A', 'C', 'A'), m('A', 'D', 'D'),
			m('B', 'C', 'B'), m('B', 'D', 'B'), m('C', 'D', 'C')
		];
		const res = rankRoundRobin(['A', 'B', 'C', 'D'], matches, scheme);
		const byId = Object.fromEntries(res.map((r) => [r.attendeeId, r]));
		expect(byId.A.rank).toBe(1); // beat B head-to-head
		expect(byId.B.rank).toBe(2);
		expect(byId.C.rank).toBe(3); // beat D head-to-head
		expect(byId.D.rank).toBe(4);
	});

	it('returns nothing until a match is decided', () => {
		expect(rankRoundRobin(['A', 'B'], [], scheme)).toEqual([]);
	});
});

describe('editionLeaderboard', () => {
	it('sums league points across all games in the edition', async () => {
		await db.insert(game).values([
			{ id: 'g1', editionId: 'E', name: 'A', type: 'individual', orderIndex: 0 },
			{ id: 'g2', editionId: 'E', name: 'B', type: 'individual', orderIndex: 1 }
		]);
		await db.insert(gameParticipant).values([...playAll('g1'), ...playAll('g2')]);
		await db.insert(score).values([
			{ gameId: 'g1', attendeeId: ids.a, rawValue: 10 },
			{ gameId: 'g1', attendeeId: ids.b, rawValue: 5 },
			{ gameId: 'g2', attendeeId: ids.a, rawValue: 1 },
			{ gameId: 'g2', attendeeId: ids.b, rawValue: 9 }
		]);
		const { rows } = await editionLeaderboard(db, 'E');
		const byId = Object.fromEntries(rows.map((r) => [r.attendeeId, r]));
		// g1: A=10(1st),B=8(2nd),C&D dnf 0. g2: B=10,A=8. Totals A=18, B=18.
		expect(byId.A.total).toBe(18);
		expect(byId.B.total).toBe(18);
		expect(byId.A.gamesPlayed).toBe(2);
		expect(rows[0].total).toBe(18); // sorted desc
	});
});
