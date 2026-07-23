import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$server/db';
import { attendee, edition, inviteCode, user } from '$server/db/schema';
import { listPeople, setAttending } from '$server/people';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentEdition } = await parent();
	const attendees = await listPeople(currentEdition?.id);
	return { attendees };
};

function requireAdmin(locals: App.Locals) {
	if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
	return null;
}

/** `parent()` isn't available in actions — read the current year straight from the DB. */
async function currentEditionId(): Promise<string | null> {
	const row = await db
		.select({ id: edition.id })
		.from(edition)
		.orderBy(desc(edition.year))
		.get();
	return row?.id ?? null;
}

function randomCode(): string {
	// Human-friendly: 8 chars, no ambiguous 0/O/1/I.
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let out = '';
	for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
	return out;
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
		const person = await db.select().from(attendee).where(eq(attendee.id, id)).get();
		if (!person) return fail(404, { error: 'No such person.' });
		await db.update(attendee).set(patch).where(eq(attendee.id, id));
		// One person, one name: keep their account label in step.
		if (person.userId) {
			await db.update(user).set({ displayName: name }).where(eq(user.id, person.userId));
		}
		return { success: true };
	},

	/** Archive / restore: they've left the crew (or come back) for good, not just this year. */
	toggle: async ({ request, locals }) => {
		const denied = requireAdmin(locals);
		if (denied) return denied;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const active = String(form.get('active') ?? '') === 'true';
		await db.update(attendee).set({ active: !active }).where(eq(attendee.id, id));
		return { success: true };
	},

	/** In or out for the current year — they stay on the list either way. */
	attending: async ({ request, locals }) => {
		const denied = requireAdmin(locals);
		if (denied) return denied;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const attending = String(form.get('attending') ?? '') === 'true';
		const editionId = await currentEditionId();
		if (!editionId) return fail(400, { error: 'Create a year first.' });
		if (!id) return fail(400, { error: 'No such person.' });
		await setAttending(editionId, id, attending);
		return { success: true };
	},

	/** Invite a person who's already on the list — redeeming the code links them to their row. */
	invite: async ({ request, locals }) => {
		const denied = requireAdmin(locals);
		if (denied) return denied;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const person = await db.select().from(attendee).where(eq(attendee.id, id)).get();
		if (!person) return fail(404, { error: 'No such person.' });
		if (person.userId) return fail(400, { error: `${person.name} already has a login.` });

		// Reuse an unclaimed code for this person rather than piling up new ones.
		const existing = await db
			.select()
			.from(inviteCode)
			.where(eq(inviteCode.attendeeId, id))
			.orderBy(desc(inviteCode.createdAt))
			.get();
		if (existing && !existing.usedByUserId) {
			return { success: true, code: existing.code, inviteFor: person.name };
		}

		const code = randomCode();
		await db.insert(inviteCode).values({ code, role: 'member', attendeeId: id });
		return { success: true, code, inviteFor: person.name };
	}
};
