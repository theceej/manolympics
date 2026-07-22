import type { SessionUser } from '$server/auth';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			sessionId: string | null;
		}
		// interface Error {}
		interface PageData {
			user?: SessionUser | null;
		}
		// interface Platform {}
	}
}

export {};
