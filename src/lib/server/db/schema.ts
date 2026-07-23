import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Every table uses a text primary key (crypto.randomUUID) so records can be created
 * app-side without a round-trip and cloned across editions without id collisions.
 */
const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const now = () =>
	integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date());

// ─── Auth ────────────────────────────────────────────────────────────────────

export const user = sqliteTable('user', {
	id: id(),
	email: text('email').notNull().unique(),
	displayName: text('display_name').notNull(),
	role: text('role', { enum: ['admin', 'member'] })
		.notNull()
		.default('member'),
	createdAt: now()
});

export const credential = sqliteTable('credential', {
	// The WebAuthn credential ID (base64url), used as the row id.
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	publicKey: text('public_key').notNull(), // base64url-encoded COSE public key
	counter: integer('counter').notNull().default(0),
	transports: text('transports'), // JSON string[] | null
	deviceName: text('device_name'),
	createdAt: now()
});

export const session = sqliteTable('session', {
	id: id(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const inviteCode = sqliteTable('invite_code', {
	code: text('code').primaryKey(),
	role: text('role', { enum: ['admin', 'member'] })
		.notNull()
		.default('member'),
	expiresAt: integer('expires_at', { mode: 'timestamp' }),
	usedByUserId: text('used_by_user_id').references(() => user.id, { onDelete: 'set null' }),
	// Invites are normally sent from a row in the People list; whoever redeems this code is
	// linked to that person instead of creating a second one.
	attendeeId: text('attendee_id').references(() => attendee.id, { onDelete: 'cascade' }),
	createdAt: now()
});

// ─── People ──────────────────────────────────────────────────────────────────

/**
 * The single list of people. One row per human, whether or not they have a login —
 * registering links a user to their row (see edition_absence for per-year availability).
 */
export const attendee = sqliteTable('attendee', {
	id: id(),
	name: text('name').notNull(),
	emoji: text('emoji'),
	color: text('color'), // hex accent for avatar chips
	photo: text('photo'), // resized square avatar as a data: URL (kept small, client-side)
	// false = archived: left the crew for good. For "can't make it this year" use edition_absence.
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
	createdAt: now()
});

// ─── Editions (one per year) ──────────────────────────────────────────────────

export const edition = sqliteTable('edition', {
	id: id(),
	year: integer('year').notNull().unique(),
	title: text('title'),
	eventDate: text('event_date'), // ISO date of the last Six Nations day
	notes: text('notes'),
	championAttendeeId: text('champion_attendee_id').references(() => attendee.id, {
		onDelete: 'set null'
	}),
	// JSON number[]: league points for rank 1,2,3... Ties share the average.
	pointScheme: text('point_scheme').notNull().default('[10,8,6,5,4,3,2,1]'),
	createdAt: now()
});

/**
 * Someone who can't make it in a given year. Absence is the exception, so only the people
 * sitting a year out get a row — everyone active is assumed to be coming.
 */
export const editionAbsence = sqliteTable(
	'edition_absence',
	{
		id: id(),
		editionId: text('edition_id')
			.notNull()
			.references(() => edition.id, { onDelete: 'cascade' }),
		attendeeId: text('attendee_id')
			.notNull()
			.references(() => attendee.id, { onDelete: 'cascade' })
	},
	(t) => [uniqueIndex('edition_absence_unq').on(t.editionId, t.attendeeId)]
);

// ─── Games ─────────────────────────────────────────────────────────────────────

export const game = sqliteTable('game', {
	id: id(),
	editionId: text('edition_id')
		.notNull()
		.references(() => edition.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	// individual: one score per person; rounds: scores per round; tournament: 1v1 bracket;
	// round_robin: everyone plays everyone 1v1, ranked by wins; team: grouped, ranked as teams.
	type: text('type', { enum: ['individual', 'rounds', 'tournament', 'round_robin', 'team'] })
		.notNull()
		.default('individual'),
	// rank: raw scores -> rank -> league points via scheme.
	// direct: the entered number IS the league points (rank derived for display only).
	scoringMode: text('scoring_mode', { enum: ['rank', 'direct'] })
		.notNull()
		.default('rank'),
	// Higher raw score wins by default; set false for time-based / lowest-wins games.
	higherIsBetter: integer('higher_is_better', { mode: 'boolean' }).notNull().default(true),
	pointSchemeOverride: text('point_scheme_override'), // JSON number[] | null
	orderIndex: integer('order_index').notNull().default(0),
	status: text('status', { enum: ['setup', 'live', 'final'] })
		.notNull()
		.default('setup'),
	createdAt: now()
});

export const gameParticipant = sqliteTable(
	'game_participant',
	{
		id: id(),
		gameId: text('game_id')
			.notNull()
			.references(() => game.id, { onDelete: 'cascade' }),
		attendeeId: text('attendee_id')
			.notNull()
			.references(() => attendee.id, { onDelete: 'cascade' }),
		team: text('team') // team label for `team` games; null otherwise
	},
	(t) => [uniqueIndex('game_participant_unq').on(t.gameId, t.attendeeId)]
);

export const round = sqliteTable('round', {
	id: id(),
	gameId: text('game_id')
		.notNull()
		.references(() => game.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	orderIndex: integer('order_index').notNull().default(0)
});

export const score = sqliteTable(
	'score',
	{
		id: id(),
		gameId: text('game_id')
			.notNull()
			.references(() => game.id, { onDelete: 'cascade' }),
		roundId: text('round_id').references(() => round.id, { onDelete: 'cascade' }),
		attendeeId: text('attendee_id')
			.notNull()
			.references(() => attendee.id, { onDelete: 'cascade' }),
		rawValue: real('raw_value'),
		// Cached at finalisation for a fast leaderboard; recomputed from raw on edit.
		rank: integer('rank'),
		leaguePoints: real('league_points')
	},
	(t) => [uniqueIndex('score_unq').on(t.gameId, t.roundId, t.attendeeId)]
);

export const match = sqliteTable('match', {
	id: id(),
	gameId: text('game_id')
		.notNull()
		.references(() => game.id, { onDelete: 'cascade' }),
	roundName: text('round_name').notNull(), // e.g. "Quarter-final"
	roundIndex: integer('round_index').notNull().default(0),
	slot: integer('slot').notNull().default(0), // position within the round
	aAttendeeId: text('a_attendee_id').references(() => attendee.id, { onDelete: 'set null' }),
	bAttendeeId: text('b_attendee_id').references(() => attendee.id, { onDelete: 'set null' }),
	aScore: integer('a_score'),
	bScore: integer('b_score'),
	winnerAttendeeId: text('winner_attendee_id').references(() => attendee.id, {
		onDelete: 'set null'
	}),
	nextMatchId: text('next_match_id'),
	nextSlot: integer('next_slot') // which side of nextMatch the winner feeds
});

// ─── Day-of companion (Phase 2) ─────────────────────────────────────────────────

export const venue = sqliteTable('venue', {
	id: id(),
	editionId: text('edition_id')
		.notNull()
		.references(() => edition.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	category: text('category', { enum: ['pub', 'meal'] })
		.notNull()
		.default('pub'), // meal stops vs pub-crawl stops
	arriveTime: text('arrive_time'), // "14:30"
	address: text('address'),
	mapUrl: text('map_url'),
	notes: text('notes'),
	orderIndex: integer('order_index').notNull().default(0)
});

export const timelineEvent = sqliteTable('timeline_event', {
	id: id(),
	editionId: text('edition_id')
		.notNull()
		.references(() => edition.id, { onDelete: 'cascade' }),
	time: text('time').notNull(), // "15:00"
	title: text('title').notNull(),
	kind: text('kind', { enum: ['game', 'rugby', 'crawl', 'meal', 'other'] })
		.notNull()
		.default('other'),
	refId: text('ref_id') // optional link to game/venue/rugby row
});

export const rugbyMatch = sqliteTable('rugby_match', {
	id: id(),
	editionId: text('edition_id')
		.notNull()
		.references(() => edition.id, { onDelete: 'cascade' }),
	homeTeam: text('home_team').notNull(),
	awayTeam: text('away_team').notNull(),
	homeScore: integer('home_score'),
	awayScore: integer('away_score'),
	kickoff: text('kickoff'), // ISO datetime
	status: text('status', { enum: ['scheduled', 'live', 'finished'] })
		.notNull()
		.default('scheduled'),
	source: text('source', { enum: ['api', 'manual'] })
		.notNull()
		.default('manual'),
	externalId: text('external_id'),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// ─── Historical results (pre-app years) ─────────────────────────────────────────
// For editions run before the app existed: record final standings by hand instead of
// entering every game. The position-1 attendee is written back to edition.championAttendeeId.

export const manualResult = sqliteTable(
	'manual_result',
	{
		id: id(),
		editionId: text('edition_id')
			.notNull()
			.references(() => edition.id, { onDelete: 'cascade' }),
		attendeeId: text('attendee_id')
			.notNull()
			.references(() => attendee.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		points: real('points') // optional historical points total
	},
	(t) => [uniqueIndex('manual_result_unq').on(t.editionId, t.attendeeId)]
);

// ─── Expenses (Phase 3) ──────────────────────────────────────────────────────

export const expense = sqliteTable('expense', {
	id: id(),
	editionId: text('edition_id')
		.notNull()
		.references(() => edition.id, { onDelete: 'cascade' }),
	description: text('description').notNull(),
	amount: real('amount').notNull(),
	paidByAttendeeId: text('paid_by_attendee_id')
		.notNull()
		.references(() => attendee.id, { onDelete: 'cascade' }),
	createdAt: now()
});

export const expenseShare = sqliteTable(
	'expense_share',
	{
		id: id(),
		expenseId: text('expense_id')
			.notNull()
			.references(() => expense.id, { onDelete: 'cascade' }),
		attendeeId: text('attendee_id')
			.notNull()
			.references(() => attendee.id, { onDelete: 'cascade' }),
		weight: real('weight').notNull().default(1)
	},
	(t) => [uniqueIndex('expense_share_unq').on(t.expenseId, t.attendeeId)]
);

// ─── Inferred types ──────────────────────────────────────────────────────────

export type User = typeof user.$inferSelect;
export type Attendee = typeof attendee.$inferSelect;
export type Edition = typeof edition.$inferSelect;
export type InviteCode = typeof inviteCode.$inferSelect;
export type Game = typeof game.$inferSelect;
export type Round = typeof round.$inferSelect;
export type Score = typeof score.$inferSelect;
export type Match = typeof match.$inferSelect;
export type Venue = typeof venue.$inferSelect;
export type TimelineEvent = typeof timelineEvent.$inferSelect;
export type RugbyMatch = typeof rugbyMatch.$inferSelect;
export type Expense = typeof expense.$inferSelect;
export type ExpenseShare = typeof expenseShare.$inferSelect;
export type ManualResult = typeof manualResult.$inferSelect;
