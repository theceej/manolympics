import { json, error } from '@sveltejs/kit';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$server/db';
import { attendee, credential, inviteCode, user } from '$server/db/schema';
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

	// There's one list of people, so signing up either claims an existing row (the invite was
	// sent from it, or the name matches someone without a login) or adds one. Nobody has to be
	// added to the People list by hand afterwards.
	const claimable = pending.attendeeId
		? await db
				.select()
				.from(attendee)
				.where(and(eq(attendee.id, pending.attendeeId), isNull(attendee.userId)))
				.get()
		: await db
				.select()
				.from(attendee)
				.where(
					and(
						sql`lower(${attendee.name}) = ${pending.displayName.toLowerCase()}`,
						isNull(attendee.userId)
					)
				)
				.get();

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
		if (claimable) {
			await tx
				.update(attendee)
				.set({ userId: pending.userId!, active: true })
				.where(eq(attendee.id, claimable.id));
		} else {
			await tx.insert(attendee).values({ name: pending.displayName!, userId: pending.userId! });
		}
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
