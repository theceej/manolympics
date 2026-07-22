import { json } from '@sveltejs/kit';
import { clearSessionCookie, invalidateSession } from '$server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.sessionId) await invalidateSession(locals.sessionId);
	clearSessionCookie(cookies);
	return json({ ok: true });
};
