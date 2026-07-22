import { and, asc, eq } from 'drizzle-orm';
import { db } from '$server/db';
import { attendee, game } from '$server/db/schema';
import { editionLeaderboard } from '$server/results';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { currentEdition } = await parent();
	if (!currentEdition) return { leaders: [], games: [], attendees: [] };

	const { rows, games } = await editionLeaderboard(currentEdition.id);
	const attendees = await db.select().from(attendee).all();
	const byId = new Map(attendees.map((a) => [a.id, a]));

	const leaders = rows.slice(0, 5).map((r) => ({ ...r, attendee: byId.get(r.attendeeId) ?? null }));

	const gameList = await db
		.select()
		.from(game)
		.where(eq(game.editionId, currentEdition.id))
		.orderBy(asc(game.orderIndex))
		.all();

	return { leaders, games: gameList, attendees };
};
