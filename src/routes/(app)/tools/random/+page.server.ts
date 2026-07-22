import { asc, eq } from 'drizzle-orm';
import { db } from '$server/db';
import { attendee } from '$server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const attendees = await db
		.select()
		.from(attendee)
		.where(eq(attendee.active, true))
		.orderBy(asc(attendee.name))
		.all();
	return { attendees };
};
