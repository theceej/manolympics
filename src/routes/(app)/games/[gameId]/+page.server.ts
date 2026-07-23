import { error, fail } from '@sveltejs/kit';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$server/db';
import { edition, game, gameParticipant, match, round, score } from '$server/db/schema';
import { listPeople } from '$server/people';
import { computeGameResults, gameRounds } from '$server/results';
import { generateBracket, generateRoundRobin, recordMatch } from '$server/bracket';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const g = await db.select().from(game).where(eq(game.id, params.gameId)).get();
	if (!g) throw error(404, 'Game not found');

	const ed = await db.select().from(edition).where(eq(edition.id, g.editionId)).get();
	// Flagged with who's around for this game's year, so the picker can hide the rest.
	const attendees = await listPeople(g.editionId);
	const attendeeById = Object.fromEntries(attendees.map((a) => [a.id, a]));

	const participants = await db
		.select()
		.from(gameParticipant)
		.where(eq(gameParticipant.gameId, g.id))
		.all();
	const rounds = await gameRounds(g.id);
	const scores = await db.select().from(score).where(eq(score.gameId, g.id)).all();
	const matches = await db
		.select()
		.from(match)
		.where(eq(match.gameId, g.id))
		.orderBy(asc(match.roundIndex), asc(match.slot))
		.all();

	const results = await computeGameResults(g.id);
	const resultsWithAttendee = results.map((r) => ({ ...r, attendee: attendeeById[r.attendeeId] ?? null }));

	// key: `${attendeeId}:${roundId ?? ''}` -> rawValue
	const scoreMap: Record<string, number | null> = {};
	for (const s of scores) scoreMap[`${s.attendeeId}:${s.roundId ?? ''}`] = s.rawValue;

	return {
		game: g,
		edition: ed,
		attendees,
		participants,
		rounds,
		matches,
		scoreMap,
		results: resultsWithAttendee
	};
};

function guard(locals: App.Locals) {
	if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
	return null;
}

// Score entry is open to any signed-in helper; structural changes stay admin-only.
function guardScorer(locals: App.Locals) {
	if (!locals.user) return fail(401, { error: 'Sign in first.' });
	return null;
}

async function upsertScore(gameId: string, attendeeId: string, roundId: string | null, raw: number | null) {
	const whereRound = roundId ? eq(score.roundId, roundId) : isNull(score.roundId);
	const existing = await db
		.select({ id: score.id })
		.from(score)
		.where(and(eq(score.gameId, gameId), eq(score.attendeeId, attendeeId), whereRound))
		.get();
	if (existing) {
		await db.update(score).set({ rawValue: raw }).where(eq(score.id, existing.id));
	} else {
		await db.insert(score).values({ gameId, attendeeId, roundId, rawValue: raw });
	}
}

function parseNum(v: FormDataEntryValue | null): number | null {
	const s = String(v ?? '').trim();
	if (s === '') return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

export const actions: Actions = {
	setStatus: async ({ request, locals, params }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		const status = String(form.get('status') ?? 'setup') as 'setup' | 'live' | 'final';
		await db.update(game).set({ status }).where(eq(game.id, params.gameId));
		return { success: true };
	},

	saveScores: async ({ request, locals, params }) => {
		const denied = guardScorer(locals);
		if (denied) return denied;
		const form = await request.formData();
		// Keys look like `s:<attendeeId>:<roundId>` (roundId empty for non-round games).
		for (const [key, value] of form.entries()) {
			if (!key.startsWith('s:')) continue;
			const [, attendeeId, roundId] = key.split(':');
			await upsertScore(params.gameId, attendeeId, roundId || null, parseNum(value));
		}
		return { success: true };
	},

	saveTeams: async ({ request, locals, params }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		for (const [key, value] of form.entries()) {
			if (!key.startsWith('t:')) continue;
			const attendeeId = key.slice(2);
			const team = String(value ?? '').trim() || null;
			await db
				.update(gameParticipant)
				.set({ team })
				.where(and(eq(gameParticipant.gameId, params.gameId), eq(gameParticipant.attendeeId, attendeeId)));
		}
		return { success: true };
	},

	toggleParticipant: async ({ request, locals, params }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		const attendeeId = String(form.get('attendeeId') ?? '');
		const on = String(form.get('on') ?? '') === 'true';
		if (on) {
			const exists = await db
				.select({ id: gameParticipant.id })
				.from(gameParticipant)
				.where(and(eq(gameParticipant.gameId, params.gameId), eq(gameParticipant.attendeeId, attendeeId)))
				.get();
			if (!exists) await db.insert(gameParticipant).values({ gameId: params.gameId, attendeeId });
		} else {
			await db
				.delete(gameParticipant)
				.where(and(eq(gameParticipant.gameId, params.gameId), eq(gameParticipant.attendeeId, attendeeId)));
		}
		return { success: true };
	},

	addRound: async ({ request, locals, params }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Round name required.' });
		const maxOrder =
			(
				await db
					.select({ m: sql<number>`coalesce(max(${round.orderIndex}), -1)` })
					.from(round)
					.where(eq(round.gameId, params.gameId))
					.get()
			)?.m ?? -1;
		await db.insert(round).values({ gameId: params.gameId, name, orderIndex: maxOrder + 1 });
		return { success: true };
	},

	deleteRound: async ({ request, locals }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		await db.delete(round).where(eq(round.id, id));
		return { success: true };
	},

	generateBracket: async ({ locals, params }) => {
		const denied = guard(locals);
		if (denied) return denied;
		const g = await db.select({ type: game.type }).from(game).where(eq(game.id, params.gameId)).get();
		const parts = await db
			.select({ attendeeId: gameParticipant.attendeeId })
			.from(gameParticipant)
			.where(eq(gameParticipant.gameId, params.gameId))
			.all();
		const ids = parts.map((p) => p.attendeeId);
		if (g?.type === 'round_robin') await generateRoundRobin(params.gameId, ids);
		else await generateBracket(params.gameId, ids);
		return { success: true };
	},

	recordMatch: async ({ request, locals }) => {
		const denied = guardScorer(locals);
		if (denied) return denied;
		const form = await request.formData();
		const matchId = String(form.get('matchId') ?? '');
		const winner = String(form.get('winner') ?? '');
		if (!matchId || !winner) return fail(400, { error: 'Pick a winner.' });
		await recordMatch(matchId, winner, parseNum(form.get('aScore')), parseNum(form.get('bScore')));
		return { success: true };
	}
};
