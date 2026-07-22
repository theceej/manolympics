import { json, error } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$server/db';
import { credential, inviteCode, user } from '$server/db/schema';
import {
	clearChallenge,
	createSession,
	readChallenge,
	setSessionCookie
} from '$server/auth';
import { verifyRegistration } from '$server/webauthn';
import type { RequestHandler } from './$types';

/** Complete passkey registration: verify attestation, create the user + credential, sign in. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const pending = readChallenge(cookies);
	if (!pending?.userId || !pending.email || !pending.displayName || !pending.role) {
		throw error(400, 'Registration session expired — please start again.');
	}

	const response = await request.json();
	const verified = await verifyRegistration({ response, expectedChallenge: pending.challenge });
	if (!verified) throw error(400, 'Passkey verification failed.');

	// Guard against a race: re-check the invite and email at commit time.
	const clash = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, pending.email))
		.get();
	if (clash) throw error(409, 'That email was just registered — sign in instead.');

	await db.transaction(async (tx) => {
		await tx.insert(user).values({
			id: pending.userId!,
			email: pending.email!,
			displayName: pending.displayName!,
			role: pending.role!
		});
		await tx.insert(credential).values({
			id: verified.id,
			userId: pending.userId!,
			publicKey: verified.publicKey,
			counter: verified.counter,
			transports: verified.transports,
			deviceName: 'Passkey'
		});
		if (pending.invite) {
			await tx
				.update(inviteCode)
				.set({ usedByUserId: pending.userId! })
				.where(and(eq(inviteCode.code, pending.invite), isNull(inviteCode.usedByUserId)));
		}
	});

	clearChallenge(cookies);
	const s = await createSession(pending.userId);
	setSessionCookie(cookies, s.id, s.expiresAt);
	return json({ ok: true });
};
