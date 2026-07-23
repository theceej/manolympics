import { and, asc, eq, sql } from 'drizzle-orm';
import { attendee, editionAbsence, user, type Attendee } from './db/schema';
import type { Db } from './results-core';

/**
 * One list of people, annotated for the year being viewed.
 * - `here`       — active in the crew AND not marked absent for this edition.
 * - `loginEmail` — the account linked to this person, if they've signed up.
 */
export type Person = Attendee & { here: boolean; absent: boolean; loginEmail: string | null };

export async function listPeople(db: Db, editionId?: string | null): Promise<Person[]> {
	const rows = await db
		.select({ a: attendee, absentId: editionAbsence.id, loginEmail: user.email })
		.from(attendee)
		.leftJoin(
			editionAbsence,
			editionId
				? and(
						eq(editionAbsence.attendeeId, attendee.id),
						eq(editionAbsence.editionId, editionId)
					)
				: // No edition yet: nobody can be absent from a year that doesn't exist.
					sql`0 = 1`
		)
		.leftJoin(user, eq(attendee.userId, user.id))
		.orderBy(asc(attendee.name))
		.all();

	return rows.map((r) => ({
		...r.a,
		absent: r.absentId !== null,
		here: r.a.active && r.absentId === null,
		loginEmail: r.loginEmail
	}));
}

/** The default participant pool for a year: everyone active who hasn't been marked absent. */
export async function attendingPeople(db: Db, editionId?: string | null): Promise<Attendee[]> {
	const people = await listPeople(db, editionId);
	return people.filter((p) => p.here);
}

/** Mark someone in or out for a year. Absent people keep their history, they just sit it out. */
export async function setAttending(
	db: Db,
	editionId: string,
	attendeeId: string,
	attending: boolean
): Promise<void> {
	const where = and(
		eq(editionAbsence.editionId, editionId),
		eq(editionAbsence.attendeeId, attendeeId)
	);
	if (attending) {
		await db.delete(editionAbsence).where(where);
		return;
	}
	const existing = await db.select({ id: editionAbsence.id }).from(editionAbsence).where(where).get();
	if (!existing) await db.insert(editionAbsence).values({ editionId, attendeeId });
}
