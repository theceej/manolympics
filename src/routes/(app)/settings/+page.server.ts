import { error, fail, redirect } from '@sveltejs/kit';
import { desc, eq, isNull } from 'drizzle-orm';
import { db } from '$server/db';
import { inviteCode, user } from '$server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	if (locals.user.role !== 'admin') throw error(403, 'Admins only');

	const users = await db.select().from(user).all();
	const invites = await db
		.select()
		.from(inviteCode)
		.where(isNull(inviteCode.usedByUserId))
		.orderBy(desc(inviteCode.createdAt))
		.all();
	return { users, invites };
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
		const code = randomCode();
		await db.insert(inviteCode).values({ code, role });
		return { success: true, code };
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
