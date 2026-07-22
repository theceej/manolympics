import { describe, expect, it } from 'vitest';
import { buildLeaderboard, directScore, rankAndScore } from './scoring';

const scheme = [10, 8, 6, 5, 4, 3, 2, 1];

describe('rankAndScore', () => {
	it('ranks higher-is-better and awards scheme points', () => {
		const out = rankAndScore(
			[
				{ attendeeId: 'a', rawValue: 5 },
				{ attendeeId: 'b', rawValue: 9 },
				{ attendeeId: 'c', rawValue: 7 }
			],
			true,
			scheme
		);
		const byId = Object.fromEntries(out.map((r) => [r.attendeeId, r]));
		expect(byId.b.rank).toBe(1);
		expect(byId.b.leaguePoints).toBe(10);
		expect(byId.c.rank).toBe(2);
		expect(byId.c.leaguePoints).toBe(8);
		expect(byId.a.rank).toBe(3);
		expect(byId.a.leaguePoints).toBe(6);
	});

	it('ranks lower-is-better (times) correctly', () => {
		const out = rankAndScore(
			[
				{ attendeeId: 'fast', rawValue: 10.2 },
				{ attendeeId: 'slow', rawValue: 15.9 }
			],
			false,
			scheme
		);
		const byId = Object.fromEntries(out.map((r) => [r.attendeeId, r]));
		expect(byId.fast.rank).toBe(1);
		expect(byId.slow.rank).toBe(2);
	});

	it('shares rank and averages points on ties', () => {
		// Two tied for 1st occupy positions 1 & 2 -> (10+8)/2 = 9 each; next is rank 3.
		const out = rankAndScore(
			[
				{ attendeeId: 'a', rawValue: 9 },
				{ attendeeId: 'b', rawValue: 9 },
				{ attendeeId: 'c', rawValue: 4 }
			],
			true,
			scheme
		);
		const byId = Object.fromEntries(out.map((r) => [r.attendeeId, r]));
		expect(byId.a.rank).toBe(1);
		expect(byId.b.rank).toBe(1);
		expect(byId.a.leaguePoints).toBe(9);
		expect(byId.b.leaguePoints).toBe(9);
		expect(byId.c.rank).toBe(3);
		expect(byId.c.leaguePoints).toBe(6);
	});

	it('total points awarded is stable across ties', () => {
		const noTie = rankAndScore(
			[
				{ attendeeId: 'a', rawValue: 10 },
				{ attendeeId: 'b', rawValue: 9 }
			],
			true,
			scheme
		);
		const tie = rankAndScore(
			[
				{ attendeeId: 'a', rawValue: 9 },
				{ attendeeId: 'b', rawValue: 9 }
			],
			true,
			scheme
		);
		const sum = (rs: { leaguePoints: number }[]) => rs.reduce((n, r) => n + r.leaguePoints, 0);
		expect(sum(tie)).toBe(sum(noTie)); // 18 either way
	});

	it('non-finishers rank last and score 0', () => {
		const out = rankAndScore(
			[
				{ attendeeId: 'a', rawValue: 5 },
				{ attendeeId: 'dnf', rawValue: null }
			],
			true,
			scheme
		);
		const byId = Object.fromEntries(out.map((r) => [r.attendeeId, r]));
		expect(byId.dnf.rank).toBe(2);
		expect(byId.dnf.leaguePoints).toBe(0);
	});

	it('handles a subset of attendees (game not everyone plays)', () => {
		const out = rankAndScore(
			[
				{ attendeeId: 'a', rawValue: 3 },
				{ attendeeId: 'b', rawValue: 1 }
			],
			true,
			scheme
		);
		expect(out).toHaveLength(2);
	});
});

describe('directScore', () => {
	it('uses the raw value as league points', () => {
		const out = directScore([
			{ attendeeId: 'a', rawValue: 25 },
			{ attendeeId: 'b', rawValue: 40 }
		]);
		const byId = Object.fromEntries(out.map((r) => [r.attendeeId, r]));
		expect(byId.b.leaguePoints).toBe(40);
		expect(byId.b.rank).toBe(1);
		expect(byId.a.leaguePoints).toBe(25);
		expect(byId.a.rank).toBe(2);
	});
});

describe('buildLeaderboard', () => {
	it('sums league points across games and sorts descending', () => {
		const rows = buildLeaderboard(
			['a', 'b', 'c'],
			{
				g1: [
					{ attendeeId: 'a', rawValue: 1, rank: 1, leaguePoints: 10 },
					{ attendeeId: 'b', rawValue: 1, rank: 2, leaguePoints: 8 }
				],
				g2: [
					{ attendeeId: 'b', rawValue: 1, rank: 1, leaguePoints: 10 },
					{ attendeeId: 'c', rawValue: 1, rank: 2, leaguePoints: 8 }
				]
			}
		);
		expect(rows[0].attendeeId).toBe('b');
		expect(rows[0].total).toBe(18);
		expect(rows[0].gamesPlayed).toBe(2);
		expect(rows.find((r) => r.attendeeId === 'a')?.total).toBe(10);
	});
});
