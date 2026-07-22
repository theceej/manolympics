import { db } from './db';
import * as core from './results-core';

/** App-bound wrappers around the injectable results core (see results-core.ts for logic). */

export const computeGameResults = (gameId: string) => core.computeGameResults(db, gameId);
export const editionLeaderboard = (editionId: string) => core.editionLeaderboard(db, editionId);
export const gameRounds = (gameId: string) => core.gameRounds(db, gameId);
