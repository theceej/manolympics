import { describe, expect, it } from 'vitest';
import { computeBalances, settleUp } from './expenses';

describe('computeBalances', () => {
	it('splits a single expense equally', () => {
		const net = computeBalances([
			{ amount: 30, paidBy: 'a', shares: [{ attendeeId: 'a', weight: 1 }, { attendeeId: 'b', weight: 1 }, { attendeeId: 'c', weight: 1 }] }
		]);
		expect(net.a).toBe(20); // paid 30, owes 10
		expect(net.b).toBe(-10);
		expect(net.c).toBe(-10);
	});

	it('honours uneven weights', () => {
		const net = computeBalances([
			{ amount: 40, paidBy: 'a', shares: [{ attendeeId: 'a', weight: 3 }, { attendeeId: 'b', weight: 1 }] }
		]);
		// a owes 30, b owes 10; a paid 40 -> a +10, b -10
		expect(net.a).toBe(10);
		expect(net.b).toBe(-10);
	});

	it('nets multiple expenses and sums to ~0', () => {
		const net = computeBalances([
			{ amount: 30, paidBy: 'a', shares: [{ attendeeId: 'a', weight: 1 }, { attendeeId: 'b', weight: 1 }, { attendeeId: 'c', weight: 1 }] },
			{ amount: 15, paidBy: 'b', shares: [{ attendeeId: 'a', weight: 1 }, { attendeeId: 'b', weight: 1 }, { attendeeId: 'c', weight: 1 }] }
		]);
		const sum = Object.values(net).reduce((s, n) => s + n, 0);
		expect(Math.abs(sum)).toBeLessThan(0.01);
	});
});

describe('settleUp', () => {
	it('produces transfers that clear all balances', () => {
		const balances = { a: 20, b: -10, c: -10 };
		const t = settleUp(balances);
		// Apply transfers and confirm everyone lands at 0.
		const after: Record<string, number> = { ...balances };
		for (const x of t) {
			after[x.from] += x.amount;
			after[x.to] -= x.amount;
		}
		for (const v of Object.values(after)) expect(Math.abs(v)).toBeLessThan(0.01);
	});

	it('keeps the transfer count small', () => {
		const balances = { a: 20, b: -10, c: -10 };
		expect(settleUp(balances).length).toBe(2);
	});

	it('ignores dust and empty balances', () => {
		expect(settleUp({ a: 0, b: 0 })).toEqual([]);
	});
});
