import { redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$server/db';
import { user } from '$server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(303, '/');
	const userCount = (await db.select({ n: sql<number>`count(*)` }).from(user).get())?.n ?? 0;
	// First account is the bootstrap admin; subsequent accounts need an invite code.
	// A shared link (…/register?invite=CODE) pre-fills the code.
	return {
		isBootstrap: userCount === 0,
		invite: (url.searchParams.get('invite') ?? '').trim().toUpperCase()
	};
};
