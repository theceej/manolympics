import { error, fail, redirect } from '@sveltejs/kit';
import { desc, eq, isNull } from 'drizzle-orm';
import { db } from '$server/db';
import { attendee, inviteCode, user } from '$server/db/schema';
import { listPeople } from '$server/people';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	if (locals.user.role !== 'admin') throw error(403, 'Admins only');

	const users = await db.select().from(user).all();
	const rows = await db
		.select({ invite: inviteCode, name: attendee.name })
		.from(inviteCode)
		.leftJoin(attendee, eq(inviteCode.attendeeId, attendee.id))
		.where(isNull(inviteCode.usedByUserId))
		.orderBy(desc(inviteCode.createdAt))
		.all();
	const invites = rows.map((r) => ({ ...r.invite, forName: r.name }));
	// Anyone on the list who hasn't set up a login yet can be invited straight from here.
	const people = (await listPeople()).filter((p) => p.active && !p.userId);
	return { users, invites, people };
};

function randomCode(): string {
	// Human-friendly: 8 chars, no ambiguous 0/O/1/I.
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let out = '';
	for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
	return out;
}

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const role = String(form.get('role') ?? 'member') as 'admin' | 'member';
		const attendeeId = String(form.get('attendeeId') ?? '') || null;

		// Tying the code to someone on the People list means signing up links to their entry
		// instead of creating a second one. Without it, registering adds a new person.
		let forName: string | null = null;
		if (attendeeId) {
			const person = await db.select().from(attendee).where(eq(attendee.id, attendeeId)).get();
			if (!person) return fail(400, { error: 'No such person.' });
			if (person.userId) return fail(400, { error: `${person.name} already has a login.` });
			forName = person.name;
		}

		const code = randomCode();
		await db.insert(inviteCode).values({ code, role, attendeeId });
		return { success: true, code, inviteFor: forName };
	},

	revoke: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const code = String(form.get('code') ?? '');
		await db.delete(inviteCode).where(eq(inviteCode.code, code));
		return { success: true };
	},

	setRole: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');
		const role = String(form.get('role') ?? 'member') as 'admin' | 'member';
		await db.update(user).set({ role }).where(eq(user.id, userId));
		return { success: true };
	}
};
