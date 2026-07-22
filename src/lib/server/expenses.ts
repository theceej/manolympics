/**
 * Group-spending maths: net balances from a list of expenses, then a minimal-ish set of
 * "who pays whom" transfers to settle up. Pure and unit-tested; UI/DB live elsewhere.
 */

export type ExpenseInput = {
	amount: number;
	paidBy: string;
	/** Who the cost is split between, with relative weights (equal by default). */
	shares: { attendeeId: string; weight: number }[];
};

export type Transfer = { from: string; to: string; amount: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Net position per attendee in the given currency units. Positive = they are owed money
 * (paid more than their share); negative = they owe. Sums to ~0.
 */
export function computeBalances(expenses: ExpenseInput[]): Record<string, number> {
	const net: Record<string, number> = {};
	const add = (id: string, delta: number) => {
		net[id] = (net[id] ?? 0) + delta;
	};

	for (const e of expenses) {
		const totalWeight = e.shares.reduce((s, x) => s + x.weight, 0);
		if (totalWeight <= 0) continue;
		add(e.paidBy, e.amount); // they fronted the whole cost
		for (const s of e.shares) {
			add(s.attendeeId, -(e.amount * s.weight) / totalWeight); // and owe their portion
		}
	}
	for (const k of Object.keys(net)) net[k] = round2(net[k]);
	return net;
}

/**
 * Greedy settle-up: repeatedly match the biggest debtor with the biggest creditor. Not
 * guaranteed globally minimal (that's NP-hard) but produces few, sensible transfers.
 */
export function settleUp(balances: Record<string, number>): Transfer[] {
	const debtors: { id: string; amt: number }[] = [];
	const creditors: { id: string; amt: number }[] = [];
	for (const [id, bal] of Object.entries(balances)) {
		if (bal < -0.005) debtors.push({ id, amt: -bal });
		else if (bal > 0.005) creditors.push({ id, amt: bal });
	}
	debtors.sort((a, b) => b.amt - a.amt);
	creditors.sort((a, b) => b.amt - a.amt);

	const transfers: Transfer[] = [];
	let i = 0;
	let j = 0;
	while (i < debtors.length && j < creditors.length) {
		const pay = round2(Math.min(debtors[i].amt, creditors[j].amt));
		if (pay > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
		debtors[i].amt = round2(debtors[i].amt - pay);
		creditors[j].amt = round2(creditors[j].amt - pay);
		if (debtors[i].amt <= 0.005) i++;
		if (creditors[j].amt <= 0.005) j++;
	}
	return transfers;
}
