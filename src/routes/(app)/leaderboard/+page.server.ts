import { db } from '$server/db';
import { attendee } from '$server/db/schema';
import { editionLeaderboard } from '$server/results';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentEdition } = await parent();
	if (!currentEdition) return { rows: [], games: [] };

	const { rows, games } = await editionLeaderboard(currentEdition.id);
	const attendees = await db.select().from(attendee).all();
	const byId = new Map(attendees.map((a) => [a.id, a]));
	return {
		rows: rows.map((r) => ({ ...r, attendee: byId.get(r.attendeeId) ?? null })),
		games
	};
};
