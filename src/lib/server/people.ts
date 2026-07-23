import { db } from './db';
import * as core from './people-core';

/** App-bound wrappers around the injectable people core (see people-core.ts for logic). */

export type { Person } from './people-core';

export const listPeople = (editionId?: string | null) => core.listPeople(db, editionId);
export const attendingPeople = (editionId?: string | null) => core.attendingPeople(db, editionId);
export const setAttending = (editionId: string, attendeeId: string, attending: boolean) =>
	core.setAttending(db, editionId, attendeeId, attending);
