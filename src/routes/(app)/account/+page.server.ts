import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$server/db';
import { attendee, user } from '$server/db/schema';
import type { Actions, PageServerLoad } from './$types';

/** Your own profile: the account name plus the People-list entry it's linked to. */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	const me = await db.select().from(attendee).where(eq(attendee.userId, locals.user.id)).get();
	return { me: me ?? null };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Sign in first.' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name is required.' });

		await db.update(user).set({ displayName: name }).where(eq(user.id, locals.user.id));

		// Your name on the People list is the same name — keep the two in step.
		const me = await db.select().from(attendee).where(eq(attendee.userId, locals.user.id)).get();
		if (me) {
			const patch: Record<string, unknown> = {
				name,
				emoji: String(form.get('emoji') ?? '').trim() || null,
				color: String(form.get('color') ?? '').trim() || null
			};
			if (String(form.get('photoChanged') ?? '') === '1') {
				patch.photo = String(form.get('photo') ?? '').trim() || null;
			}
			await db.update(attendee).set(patch).where(eq(attendee.id, me.id));
		}
		return { success: true };
	}
};
