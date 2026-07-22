import { db } from './db';
import * as core from './bracket-core';
import * as rr from './roundrobin-core';

/** App-bound wrappers around the injectable bracket core (see bracket-core.ts for logic). */

export const generateBracket = (gameId: string, attendeeIds: string[]) =>
	core.generateBracket(db, gameId, attendeeIds);

export const generateRoundRobin = (gameId: string, attendeeIds: string[]) =>
	rr.generateRoundRobin(db, gameId, attendeeIds);

export const recordMatch = (
	matchId: string,
	winnerAttendeeId: string,
	aScore: number | null,
	bScore: number | null
) => core.recordMatch(db, matchId, winnerAttendeeId, aScore, bScore);
