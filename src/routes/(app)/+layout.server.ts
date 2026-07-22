import { redirect } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { db } from '$server/db';
import { edition } from '$server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	const editions = await db.select().from(edition).orderBy(desc(edition.year)).all();
	const current = editions[0] ?? null;

	return { user: locals.user, editions, currentEdition: current };
};
