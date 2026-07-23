import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from './db';
import { session, user } from './db/schema';

export const SESSION_COOKIE = 'mano_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
	id: string;
	email: string;
	displayName: string;
	role: 'admin' | 'member';
};

export async function createSession(userId: string): Promise<{ id: string; expiresAt: Date }> {
	const id = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	await db.insert(session).values({ id, userId, expiresAt });
	return { id, expiresAt };
}

export async function validateSession(sessionId: string): Promise<SessionUser | null> {
	const row = await db
		.select({
			sessionId: session.id,
			expiresAt: session.expiresAt,
			id: user.id,
			email: user.email,
			displayName: user.displayName,
			role: user.role
		})
		.from(session)
		.innerJoin(user, eq(session.userId, user.id))
		.where(eq(session.id, sessionId))
		.get();

	if (!row) return null;
	if (row.expiresAt.getTime() < Date.now()) {
		await db.delete(session).where(eq(session.id, sessionId));
		return null;
	}
	return { id: row.id, email: row.email, displayName: row.displayName, role: row.role };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(session).where(eq(session.id, sessionId));
}

export function setSessionCookie(cookies: Cookies, id: string, expiresAt: Date): void {
	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires: expiresAt
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

// ─── WebAuthn challenge cookie ────────────────────────────────────────────────
// Short-lived httpOnly cookie holding the in-flight ceremony challenge (+ userId for
// registration). Verified server-side against the authenticator's echoed challenge.

const CHALLENGE_COOKIE = 'mano_challenge';

export type ChallengePayload = {
	challenge: string;
	// Registration-only: the pending user is created only once the ceremony verifies.
	userId?: string;
	email?: string;
	displayName?: string;
	role?: 'admin' | 'member';
	invite?: string;
	// The People-list row this invite was sent from; the new account links to it.
	attendeeId?: string;
};

export function setChallenge(cookies: Cookies, data: ChallengePayload): void {
	cookies.set(CHALLENGE_COOKIE, JSON.stringify(data), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 300
	});
}

export function readChallenge(cookies: Cookies): ChallengePayload | null {
	const raw = cookies.get(CHALLENGE_COOKIE);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

export function clearChallenge(cookies: Cookies): void {
	cookies.delete(CHALLENGE_COOKIE, { path: '/' });
}

/** Throws a redirect-friendly guard helper for load functions / actions. */
export function requireUser(locals: App.Locals): SessionUser {
	if (!locals.user) throw new Error('UNAUTHENTICATED');
	return locals.user;
}

export function requireAdmin(locals: App.Locals): SessionUser {
	const u = requireUser(locals);
	if (u.role !== 'admin') throw new Error('FORBIDDEN');
	return u;
}
