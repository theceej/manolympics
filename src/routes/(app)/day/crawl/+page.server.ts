import { fail } from '@sveltejs/kit';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '$server/db';
import { edition, venue } from '$server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentEdition } = await parent();
	if (!currentEdition) return { venues: [] };
	const venues = await db
		.select()
		.from(venue)
		.where(eq(venue.editionId, currentEdition.id))
		.orderBy(asc(venue.orderIndex))
		.all();
	return { venues };
};

function guard(locals: App.Locals) {
	if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
	return null;
}

async function currentEditionId(): Promise<string | null> {
	const e = await db.select({ id: edition.id }).from(edition).orderBy(desc(edition.year)).get();
	return e?.id ?? null;
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const editionId = await currentEditionId();
		if (!editionId) return fail(400, { error: 'Create a year first.' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name required.' });
		const maxOrder =
			(
				await db
					.select({ m: sql<number>`coalesce(max(${venue.orderIndex}), -1)` })
					.from(venue)
					.where(eq(venue.editionId, editionId))
					.get()
			)?.m ?? -1;
		await db.insert(venue).values({
			editionId,
			name,
			category: String(form.get('category') ?? 'pub') === 'meal' ? 'meal' : 'pub',
			arriveTime: String(form.get('arriveTime') ?? '').trim() || null,
			address: String(form.get('address') ?? '').trim() || null,
			mapUrl: String(form.get('mapUrl') ?? '').trim() || null,
			notes: String(form.get('notes') ?? '').trim() || null,
			orderIndex: maxOrder + 1
		});
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		if (!id || !name) return fail(400, { error: 'Name required.' });
		await db
			.update(venue)
			.set({
				name,
				category: String(form.get('category') ?? 'pub') === 'meal' ? 'meal' : 'pub',
				arriveTime: String(form.get('arriveTime') ?? '').trim() || null,
				address: String(form.get('address') ?? '').trim() || null,
				mapUrl: String(form.get('mapUrl') ?? '').trim() || null,
				notes: String(form.get('notes') ?? '').trim() || null
			})
			.where(eq(venue.id, id));
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		await db.delete(venue).where(eq(venue.id, String(form.get('id') ?? '')));
		return { success: true };
	},

	move: async ({ request, locals }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const dir = String(form.get('dir') ?? '');
		const row = await db.select().from(venue).where(eq(venue.id, id)).get();
		if (!row) return fail(404, { error: 'Not found.' });
		const all = await db
			.select()
			.from(venue)
			.where(eq(venue.editionId, row.editionId))
			.orderBy(asc(venue.orderIndex))
			.all();
		const idx = all.findIndex((v) => v.id === id);
		const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= all.length) return { success: true };
		const other = all[swapIdx];
		// Swap order indices.
		await db.update(venue).set({ orderIndex: other.orderIndex }).where(eq(venue.id, row.id));
		await db.update(venue).set({ orderIndex: row.orderIndex }).where(eq(venue.id, other.id));
		return { success: true };
	}
};
