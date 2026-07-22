import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$server/db';
import { credential } from '$server/db/schema';
import {
	clearChallenge,
	createSession,
	readChallenge,
	setSessionCookie
} from '$server/auth';
import { verifyAuthentication } from '$server/webauthn';
import type { RequestHandler } from './$types';

/** Complete passkey login: find the credential by id, verify the assertion, open a session. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const pending = readChallenge(cookies);
	if (!pending?.challenge) throw error(400, 'Login session expired — please try again.');

	const response = await request.json();
	const cred = await db.select().from(credential).where(eq(credential.id, response.id)).get();
	if (!cred) throw error(400, 'Unknown passkey — register first.');

	const result = await verifyAuthentication({
		response,
		expectedChallenge: pending.challenge,
		credential: {
			id: cred.id,
			publicKey: cred.publicKey,
			counter: cred.counter,
			transports: cred.transports
		}
	});
	if (!result) throw error(400, 'Passkey verification failed.');

	await db
		.update(credential)
		.set({ counter: result.newCounter })
		.where(eq(credential.id, cred.id));

	clearChallenge(cookies);
	const s = await createSession(cred.userId);
	setSessionCookie(cookies, s.id, s.expiresAt);
	return json({ ok: true });
};
