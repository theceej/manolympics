import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$server/db';
import { attendee } from '$server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const attendees = await db.select().from(attendee).orderBy(asc(attendee.name)).all();
	return { attendees };
};

function requireAdmin(locals: App.Locals) {
	if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
	return null;
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const denied = requireAdmin(locals);
		if (denied) return denied;
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const emoji = String(form.get('emoji') ?? '').trim() || null;
		const color = String(form.get('color') ?? '').trim() || null;
		const photo = String(form.get('photo') ?? '').trim() || null;
		if (!name) return fail(400, { error: 'Name is required.' });
		await db.insert(attendee).values({ name, emoji, color, photo });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const denied = requireAdmin(locals);
		if (denied) return denied;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		const emoji = String(form.get('emoji') ?? '').trim() || null;
		const color = String(form.get('color') ?? '').trim() || null;
		if (!id || !name) return fail(400, { error: 'Name is required.' });
		const patch: Record<string, unknown> = { name, emoji, color };
		// Only touch the photo when the form says it changed (set new, or clear on remove).
		if (String(form.get('photoChanged') ?? '') === '1') {
			patch.photo = String(form.get('photo') ?? '').trim() || null;
		}
		await db.update(attendee).set(patch).where(eq(attendee.id, id));
		return { success: true };
	},

	toggle: async ({ request, locals }) => {
		const denied = requireAdmin(locals);
		if (denied) return denied;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const active = String(form.get('active') ?? '') === 'true';
		await db.update(attendee).set({ active: !active }).where(eq(attendee.id, id));
		return { success: true };
	}
};
