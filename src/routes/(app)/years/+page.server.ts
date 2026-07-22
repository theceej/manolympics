import { fail } from '@sveltejs/kit';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '$server/db';
import {
	attendee,
	edition,
	game,
	gameParticipant,
	manualResult,
	round,
	venue
} from '$server/db/schema';
import { editionLeaderboard } from '$server/results';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const editions = await db.select().from(edition).orderBy(desc(edition.year)).all();
	const attendees = await db.select().from(attendee).orderBy(asc(attendee.name)).all();
	const byId = new Map(attendees.map((a) => [a.id, a]));
	const results = await db.select().from(manualResult).all();
	const gameCounts = await db
		.select({ editionId: game.editionId, n: sql<number>`count(*)` })
		.from(game)
		.groupBy(game.editionId)
		.all();
	const gamesByEdition = new Map(gameCounts.map((g) => [g.editionId, g.n]));

	const withChampion = editions.map((e) => ({
		...e,
		champion: e.championAttendeeId ? (byId.get(e.championAttendeeId) ?? null) : null,
		gameCount: gamesByEdition.get(e.id) ?? 0,
		manualResults: results
			.filter((r) => r.editionId === e.id)
			.sort((a, b) => a.position - b.position)
			.map((r) => ({ ...r, attendee: byId.get(r.attendeeId) ?? null }))
	}));
	return { editions: withChampion, attendees };
};

function guard(locals: App.Locals) {
	if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
	return null;
}

/** Deep-copy an edition's games (with rounds + participants) and venues into a new edition. */
async function cloneInto(sourceEditionId: string, targetEditionId: string) {
	const games = await db.select().from(game).where(eq(game.editionId, sourceEditionId)).all();
	for (const g of games) {
		const newGameId = crypto.randomUUID();
		await db.insert(game).values({
			id: newGameId,
			editionId: targetEditionId,
			name: g.name,
			description: g.description,
			type: g.type,
			scoringMode: g.scoringMode,
			higherIsBetter: g.higherIsBetter,
			pointSchemeOverride: g.pointSchemeOverride,
			orderIndex: g.orderIndex,
			status: 'setup'
		});
		const rounds = await db.select().from(round).where(eq(round.gameId, g.id)).all();
		for (const r of rounds) {
			await db
				.insert(round)
				.values({ gameId: newGameId, name: r.name, orderIndex: r.orderIndex });
		}
		const parts = await db
			.select()
			.from(gameParticipant)
			.where(eq(gameParticipant.gameId, g.id))
			.all();
		for (const p of parts) {
			await db
				.insert(gameParticipant)
				.values({ gameId: newGameId, attendeeId: p.attendeeId, team: p.team });
		}
	}
	const venues = await db.select().from(venue).where(eq(venue.editionId, sourceEditionId)).all();
	for (const v of venues) {
		await db.insert(venue).values({
			editionId: targetEditionId,
			name: v.name,
			arriveTime: v.arriveTime,
			address: v.address,
			mapUrl: v.mapUrl,
			notes: v.notes,
			orderIndex: v.orderIndex
		});
	}
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		const year = Number(form.get('year'));
		const title = String(form.get('title') ?? '').trim() || null;
		const eventDate = String(form.get('eventDate') ?? '').trim() || null;
		const copyFrom = String(form.get('copyFrom') ?? '').trim();
		if (!year || year < 1990 || year > 2100) return fail(400, { error: 'Enter a valid year.' });

		const existing = await db.select().from(edition).where(eq(edition.year, year)).get();
		if (existing) return fail(409, { error: `An edition for ${year} already exists.` });

		let pointScheme = '[10,8,6,5,4,3,2,1]';
		if (copyFrom) {
			const src = await db.select().from(edition).where(eq(edition.id, copyFrom)).get();
			if (src) pointScheme = src.pointScheme;
		}

		const id = crypto.randomUUID();
		await db.insert(edition).values({ id, year, title, eventDate, pointScheme });
		if (copyFrom) await cloneInto(copyFrom, id);
		return { success: true };
	},

	recomputeChampion: async ({ request, locals }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		const editionId = String(form.get('editionId') ?? '');
		const { rows } = await editionLeaderboard(editionId);
		const winner = rows[0]?.attendeeId ?? null;
		await db.update(edition).set({ championAttendeeId: winner }).where(eq(edition.id, editionId));
		return { success: true };
	},

	// ── Historical (pre-app) results ──
	addResult: async ({ request, locals }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		const editionId = String(form.get('editionId') ?? '');
		const attendeeId = String(form.get('attendeeId') ?? '');
		const position = Number(form.get('position'));
		const pointsRaw = String(form.get('points') ?? '').trim();
		const points = pointsRaw === '' ? null : Number(pointsRaw);
		if (!editionId || !attendeeId || !Number.isInteger(position) || position < 1) {
			return fail(400, { error: 'Pick a person and a finishing position.' });
		}
		// Upsert this person's finishing position for the edition.
		const existing = await db
			.select({ id: manualResult.id })
			.from(manualResult)
			.where(and(eq(manualResult.editionId, editionId), eq(manualResult.attendeeId, attendeeId)))
			.get();
		if (existing) {
			await db.update(manualResult).set({ position, points }).where(eq(manualResult.id, existing.id));
		} else {
			await db.insert(manualResult).values({ editionId, attendeeId, position, points });
		}
		await setChampionFromResults(editionId);
		return { success: true };
	},

	deleteResult: async ({ request, locals }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const row = await db.select().from(manualResult).where(eq(manualResult.id, id)).get();
		await db.delete(manualResult).where(eq(manualResult.id, id));
		if (row) await setChampionFromResults(row.editionId);
		return { success: true };
	}
};

/** Set an edition's champion to whoever holds position 1 in its historical results. */
async function setChampionFromResults(editionId: string) {
	const top = await db
		.select()
		.from(manualResult)
		.where(eq(manualResult.editionId, editionId))
		.orderBy(asc(manualResult.position))
		.get();
	await db
		.update(edition)
		.set({ championAttendeeId: top?.attendeeId ?? null })
		.where(eq(edition.id, editionId));
}
