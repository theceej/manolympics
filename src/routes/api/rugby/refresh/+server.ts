import { json, error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$server/db';
import { edition, rugbyMatch } from '$server/db/schema';
import { fetchSixNationsEvents } from '$server/rugby';
import type { RequestHandler } from './$types';

/**
 * Best-effort sync of Six Nations scores from TheSportsDB for an edition's event date.
 * Rows an admin marked `manual` are never overwritten — manual override always wins.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Sign in first.');
	const body = await request.json().catch(() => ({}));
	const editionId = String(body.editionId ?? '');
	if (!editionId) throw error(400, 'Missing editionId.');

	const ed = await db.select().from(edition).where(eq(edition.id, editionId)).get();
	if (!ed) throw error(404, 'Edition not found.');
	if (!ed.eventDate) return json({ updated: 0, reason: 'no-event-date' });

	const events = await fetchSixNationsEvents(ed.eventDate);
	let updated = 0;

	for (const ev of events) {
		// Prefer matching by the API's stable event id, else by the team pairing.
		let existing = await db
			.select()
			.from(rugbyMatch)
			.where(and(eq(rugbyMatch.editionId, editionId), eq(rugbyMatch.externalId, ev.externalId)))
			.get();
		if (!existing) {
			existing = await db
				.select()
				.from(rugbyMatch)
				.where(
					and(
						eq(rugbyMatch.editionId, editionId),
						eq(rugbyMatch.homeTeam, ev.homeTeam),
						eq(rugbyMatch.awayTeam, ev.awayTeam)
					)
				)
				.get();
		}

		if (existing) {
			if (existing.source === 'manual') continue; // respect manual override
			await db
				.update(rugbyMatch)
				.set({
					homeTeam: ev.homeTeam,
					awayTeam: ev.awayTeam,
					homeScore: ev.homeScore,
					awayScore: ev.awayScore,
					kickoff: ev.kickoff,
					status: ev.status,
					source: 'api',
					externalId: ev.externalId,
					updatedAt: new Date()
				})
				.where(eq(rugbyMatch.id, existing.id));
			updated++;
		} else {
			await db.insert(rugbyMatch).values({
				editionId,
				homeTeam: ev.homeTeam,
				awayTeam: ev.awayTeam,
				homeScore: ev.homeScore,
				awayScore: ev.awayScore,
				kickoff: ev.kickoff,
				status: ev.status,
				source: 'api',
				externalId: ev.externalId
			});
			updated++;
		}
	}

	const matches = await db
		.select()
		.from(rugbyMatch)
		.where(eq(rugbyMatch.editionId, editionId))
		.all();
	return json({ updated, count: events.length, matches });
};
