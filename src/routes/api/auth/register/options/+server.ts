import { json, error } from '@sveltejs/kit';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$server/db';
import { inviteCode, user } from '$server/db/schema';
import { setChallenge } from '$server/auth';
import { registrationOptions } from '$server/webauthn';
import type { RequestHandler } from './$types';

/**
 * Begin passkey registration. Access is gated: the very first account may register only if
 * its email matches BOOTSTRAP_ADMIN_EMAIL; everyone after needs a valid invite code.
 * The user row itself is not created until the ceremony verifies.
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json().catch(() => ({}));
	const email = String(body.email ?? '')
		.trim()
		.toLowerCase();
	const displayName = String(body.displayName ?? '').trim();
	const invite = String(body.invite ?? '').trim();

	if (!email || !displayName) throw error(400, 'Email and display name are required.');

	const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).get();
	if (existing) throw error(409, 'That email already has an account — sign in instead.');

	const userCount = (await db.select({ n: sql<number>`count(*)` }).from(user).get())?.n ?? 0;

	let role: 'admin' | 'member' = 'member';
	if (userCount === 0 && email === (env.BOOTSTRAP_ADMIN_EMAIL ?? '').toLowerCase()) {
		role = 'admin';
	} else {
		if (!invite) throw error(403, 'An invite code is required to register.');
		const code = await db
			.select()
			.from(inviteCode)
			.where(and(eq(inviteCode.code, invite), isNull(inviteCode.usedByUserId)))
			.get();
		if (!code) throw error(403, 'Invalid or already-used invite code.');
		if (code.expiresAt && code.expiresAt.getTime() < Date.now())
			throw error(403, 'That invite code has expired.');
		role = code.role;
	}

	const userId = crypto.randomUUID();
	const options = await registrationOptions({ userId, email, displayName, existing: [] });
	setChallenge(cookies, {
		challenge: options.challenge,
		userId,
		email,
		displayName,
		role,
		invite: invite || undefined
	});

	return json(options);
};
