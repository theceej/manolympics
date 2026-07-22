import { redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$server/db';
import { user } from '$server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/');
	const userCount = (await db.select({ n: sql<number>`count(*)` }).from(user).get())?.n ?? 0;
	// First account is the bootstrap admin; subsequent accounts need an invite code.
	return { isBootstrap: userCount === 0 };
};
