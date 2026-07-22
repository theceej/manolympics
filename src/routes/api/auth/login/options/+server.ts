import { json } from '@sveltejs/kit';
import { setChallenge } from '$server/auth';
import { authenticationOptions } from '$server/webauthn';
import type { RequestHandler } from './$types';

/** Begin passkey login using discoverable credentials (the browser picks the passkey). */
export const POST: RequestHandler = async ({ cookies }) => {
	const options = await authenticationOptions([]);
	setChallenge(cookies, { challenge: options.challenge });
	return json(options);
};
