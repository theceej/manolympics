import { fail } from '@sveltejs/kit';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '$server/db';
import { edition, rugbyMatch } from '$server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentEdition } = await parent();
	if (!currentEdition) return { matches: [], eventDate: null };
	const matches = await db
		.select()
		.from(rugbyMatch)
		.where(eq(rugbyMatch.editionId, currentEdition.id))
		.orderBy(asc(rugbyMatch.kickoff))
		.all();
	return { matches, eventDate: currentEdition.eventDate };
};

function guardAdmin(locals: App.Locals) {
	if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
	return null;
}
function guardUser(locals: App.Locals) {
	if (!locals.user) return fail(401, { error: 'Sign in first.' });
	return null;
}
function toNum(v: FormDataEntryValue | null): number | null {
	const s = String(v ?? '').trim();
	if (s === '') return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const denied = guardAdmin(locals);
		if (denied) return denied;
		const e = await db.select({ id: edition.id }).from(edition).orderBy(desc(edition.year)).get();
		if (!e) return fail(400, { error: 'Create a year first.' });
		const form = await request.formData();
		const homeTeam = String(form.get('homeTeam') ?? '').trim();
		const awayTeam = String(form.get('awayTeam') ?? '').trim();
		if (!homeTeam || !awayTeam) return fail(400, { error: 'Both teams required.' });
		await db.insert(rugbyMatch).values({
			editionId: e.id,
			homeTeam,
			awayTeam,
			kickoff: String(form.get('kickoff') ?? '').trim() || null,
			source: 'manual'
		});
		return { success: true };
	},

	// Open to any signed-in user; marks the row manual so a later API refresh won't clobber it.
	score: async ({ request, locals }) => {
		const denied = guardUser(locals);
		if (denied) return denied;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const status = String(form.get('status') ?? 'live') as 'scheduled' | 'live' | 'finished';
		await db
			.update(rugbyMatch)
			.set({
				homeScore: toNum(form.get('homeScore')),
				awayScore: toNum(form.get('awayScore')),
				status,
				source: 'manual',
				updatedAt: new Date()
			})
			.where(eq(rugbyMatch.id, id));
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const denied = guardAdmin(locals);
		if (denied) return denied;
		const form = await request.formData();
		await db.delete(rugbyMatch).where(eq(rugbyMatch.id, String(form.get('id') ?? '')));
		return { success: true };
	}
};
