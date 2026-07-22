import { fail } from '@sveltejs/kit';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '$server/db';
import { attendee, edition, game, gameParticipant, round } from '$server/db/schema';
import type { Actions, PageServerLoad } from './$types';

// The event's usual line-up — seeded on demand, then carried forward each year via
// "copy games from a previous year".
type Starter = {
	name: string;
	type: 'individual' | 'rounds' | 'tournament' | 'round_robin' | 'team';
	scoringMode?: 'rank' | 'direct';
	higherIsBetter?: boolean;
	description: string;
	rounds?: string[];
};
const STARTER_GAMES: Starter[] = [
	{ name: 'Beer Pong', type: 'round_robin', description: 'Everyone plays everyone 1v1. Most wins wins.' },
	{
		name: 'Mario Kart',
		type: 'rounds',
		scoringMode: 'rank',
		higherIsBetter: true,
		description: '4 racers per race. Enter each racer’s finish points per race; totals are summed then ranked.',
		rounds: ['Race 1', 'Race 2', 'Race 3']
	},
	{ name: 'Darts', type: 'round_robin', description: 'Everyone plays everyone 1v1. Most wins wins.' },
	{ name: 'Pool', type: 'round_robin', description: 'Everyone plays everyone 1v1. Most wins wins.' },
	{ name: 'Skittles', type: 'individual', scoringMode: 'rank', higherIsBetter: true, description: 'One big game — everyone plays. Highest score wins.' }
];

export const load: PageServerLoad = async ({ parent }) => {
	const { currentEdition } = await parent();
	if (!currentEdition) return { games: [] };
	const games = await db
		.select()
		.from(game)
		.where(eq(game.editionId, currentEdition.id))
		.orderBy(asc(game.orderIndex))
		.all();
	return { games };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const currentEdition = await db.select().from(edition).orderBy(desc(edition.year)).get();
		if (!currentEdition) return fail(400, { error: 'Create a year first.' });

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const type = String(form.get('type') ?? 'individual') as
			| 'individual'
			| 'rounds'
			| 'tournament'
			| 'team';
		const scoringMode = String(form.get('scoringMode') ?? 'rank') as 'rank' | 'direct';
		const higherIsBetter = String(form.get('higherIsBetter') ?? 'true') === 'true';
		const description = String(form.get('description') ?? '').trim() || null;
		if (!name) return fail(400, { error: 'Name is required.' });

		const maxOrder =
			(
				await db
					.select({ m: sql<number>`coalesce(max(${game.orderIndex}), -1)` })
					.from(game)
					.where(eq(game.editionId, currentEdition.id))
					.get()
			)?.m ?? -1;

		const id = crypto.randomUUID();
		await db.insert(game).values({
			id,
			editionId: currentEdition.id,
			name,
			description,
			type,
			scoringMode,
			higherIsBetter,
			orderIndex: maxOrder + 1
		});

		// Default: everyone active is a participant; the game page can trim this.
		const actives = await db.select().from(attendee).where(eq(attendee.active, true)).all();
		for (const a of actives) {
			await db.insert(gameParticipant).values({ gameId: id, attendeeId: a.id });
		}
		return { success: true, id };
	},

	// Seed the usual line-up into the current edition. Skips any game whose name already
	// exists there, so it's safe to run more than once.
	starter: async ({ locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const currentEdition = await db.select().from(edition).orderBy(desc(edition.year)).get();
		if (!currentEdition) return fail(400, { error: 'Create a year first.' });

		const existing = await db
			.select({ name: game.name })
			.from(game)
			.where(eq(game.editionId, currentEdition.id))
			.all();
		const have = new Set(existing.map((g) => g.name.toLowerCase()));
		const actives = await db.select().from(attendee).where(eq(attendee.active, true)).all();

		let order =
			((await db
				.select({ m: sql<number>`coalesce(max(${game.orderIndex}), -1)` })
				.from(game)
				.where(eq(game.editionId, currentEdition.id))
				.get())?.m ?? -1) + 1;

		let added = 0;
		for (const g of STARTER_GAMES) {
			if (have.has(g.name.toLowerCase())) continue;
			const id = crypto.randomUUID();
			await db.insert(game).values({
				id,
				editionId: currentEdition.id,
				name: g.name,
				description: g.description,
				type: g.type,
				scoringMode: g.scoringMode ?? 'rank',
				higherIsBetter: g.higherIsBetter ?? true,
				orderIndex: order++
			});
			for (const a of actives) {
				await db.insert(gameParticipant).values({ gameId: id, attendeeId: a.id });
			}
			for (const [i, name] of (g.rounds ?? []).entries()) {
				await db.insert(round).values({ gameId: id, name, orderIndex: i });
			}
			added++;
		}
		return { success: true, added };
	}
};
