import { fail } from '@sveltejs/kit';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '$server/db';
import { edition, expense, expenseShare } from '$server/db/schema';
import { computeBalances, settleUp, type ExpenseInput } from '$server/expenses';
import { listPeople } from '$server/people';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentEdition } = await parent();
	// Everyone, flagged with who's here this year — past payers still need naming.
	const attendees = await listPeople(currentEdition?.id);
	if (!currentEdition) return { expenses: [], attendees, balances: [], transfers: [] };

	const expenses = await db
		.select()
		.from(expense)
		.where(eq(expense.editionId, currentEdition.id))
		.orderBy(desc(expense.createdAt))
		.all();
	const shares = expenses.length
		? await db
				.select()
				.from(expenseShare)
				.where(inArray(expenseShare.expenseId, expenses.map((e) => e.id)))
				.all()
		: [];

	const sharesByExpense = new Map<string, typeof shares>();
	for (const s of shares) sharesByExpense.set(s.expenseId, [...(sharesByExpense.get(s.expenseId) ?? []), s]);

	const inputs: ExpenseInput[] = expenses.map((e) => ({
		amount: e.amount,
		paidBy: e.paidByAttendeeId,
		shares: (sharesByExpense.get(e.id) ?? []).map((s) => ({ attendeeId: s.attendeeId, weight: s.weight }))
	}));

	const balances = computeBalances(inputs);
	const transfers = settleUp(balances);
	const byId = new Map(attendees.map((a) => [a.id, a]));

	return {
		attendees,
		expenses: expenses.map((e) => ({
			...e,
			payer: byId.get(e.paidByAttendeeId) ?? null,
			sharerIds: (sharesByExpense.get(e.id) ?? []).map((s) => s.attendeeId)
		})),
		balances: Object.entries(balances)
			.map(([id, net]) => ({ attendee: byId.get(id) ?? null, net }))
			.filter((b) => b.attendee)
			.sort((a, b) => b.net - a.net),
		transfers: transfers.map((t) => ({ ...t, fromA: byId.get(t.from) ?? null, toA: byId.get(t.to) ?? null }))
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Sign in first.' });
		const e = await db.select({ id: edition.id }).from(edition).orderBy(desc(edition.year)).get();
		if (!e) return fail(400, { error: 'Create a year first.' });

		const form = await request.formData();
		const description = String(form.get('description') ?? '').trim();
		const amount = Number(form.get('amount'));
		const paidBy = String(form.get('paidBy') ?? '');
		const sharers = form.getAll('sharers').map(String).filter(Boolean);
		if (!description || !Number.isFinite(amount) || amount <= 0 || !paidBy) {
			return fail(400, { error: 'Description, positive amount and payer are required.' });
		}
		if (sharers.length === 0) return fail(400, { error: 'Pick who it was split between.' });

		const id = crypto.randomUUID();
		await db.insert(expense).values({ id, editionId: e.id, description, amount, paidByAttendeeId: paidBy });
		for (const attendeeId of sharers) {
			await db.insert(expenseShare).values({ expenseId: id, attendeeId, weight: 1 });
		}
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Sign in first.' });
		const form = await request.formData();
		await db.delete(expense).where(eq(expense.id, String(form.get('id') ?? '')));
		return { success: true };
	}
};
