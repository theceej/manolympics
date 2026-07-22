import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, validateSession } from '$server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(SESSION_COOKIE) ?? null;
	event.locals.sessionId = sessionId;
	event.locals.user = sessionId ? await validateSession(sessionId) : null;
	return resolve(event);
};
