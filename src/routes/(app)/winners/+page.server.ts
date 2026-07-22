import { desc } from 'drizzle-orm';
import { db } from '$server/db';
import { attendee, edition } from '$server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const editions = await db.select().from(edition).orderBy(desc(edition.year)).all();
	const attendees = await db.select().from(attendee).all();
	const byId = new Map(attendees.map((a) => [a.id, a]));

	// Tally how many times each attendee has been champion.
	const titleCount = new Map<string, number>();
	for (const e of editions) {
		if (e.championAttendeeId) titleCount.set(e.championAttendeeId, (titleCount.get(e.championAttendeeId) ?? 0) + 1);
	}
	const hall = [...titleCount.entries()]
		.map(([id, count]) => ({ attendee: byId.get(id) ?? null, count }))
		.filter((h) => h.attendee)
		.sort((a, b) => b.count - a.count);

	return {
		years: editions.map((e) => ({ ...e, champion: e.championAttendeeId ? (byId.get(e.championAttendeeId) ?? null) : null })),
		hall
	};
};
