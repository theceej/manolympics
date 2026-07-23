import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from './db/schema';
import { attendee, edition, user } from './db/schema';
import { attendingPeople, listPeople, setAttending } from './people-core';
import type { Db } from './results-core';

let db: Db;

beforeEach(async () => {
	const client = createClient({ url: ':memory:' });
	db = drizzle(client, { schema });
	await migrate(db, { migrationsFolder: './drizzle' });

	await db.insert(attendee).values([
		{ id: 'A', name: 'Alice' },
		{ id: 'B', name: 'Bob' },
		{ id: 'C', name: 'Carol' }
	]);
	await db.insert(edition).values([
		{ id: 'E26', year: 2026 },
		{ id: 'E27', year: 2027 }
	]);
});

const names = (people: { name: string }[]) => people.map((p) => p.name);

describe('listPeople', () => {
	it('returns everyone, alphabetically, all present by default', async () => {
		const people = await listPeople(db, 'E26');
		expect(names(people)).toEqual(['Alice', 'Bob', 'Carol']);
		expect(people.every((p) => p.here && !p.absent)).toBe(true);
	});

	it('marks who is out for the year without dropping them from the list', async () => {
		await setAttending(db, 'E26', 'B', false);
		const people = await listPeople(db, 'E26');
		expect(names(people)).toEqual(['Alice', 'Bob', 'Carol']);
		expect(people.find((p) => p.id === 'B')).toMatchObject({ absent: true, here: false });
		expect(names(await attendingPeople(db, 'E26'))).toEqual(['Alice', 'Carol']);
	});

	it('keeps absence to the one year', async () => {
		await setAttending(db, 'E26', 'B', false);
		expect(names(await attendingPeople(db, 'E27'))).toEqual(['Alice', 'Bob', 'Carol']);
	});

	it('excludes archived people from the pool but keeps them listed', async () => {
		await db.update(attendee).set({ active: false }).where(eq(attendee.id, 'C'));
		const people = await listPeople(db, 'E26');
		expect(names(people)).toEqual(['Alice', 'Bob', 'Carol']);
		expect(people.find((p) => p.id === 'C')).toMatchObject({ here: false, absent: false });
		expect(names(await attendingPeople(db, 'E26'))).toEqual(['Alice', 'Bob']);
	});

	it('reports the linked login and copes with no edition at all', async () => {
		await db
			.insert(user)
			.values({ id: 'u1', email: 'bob@example.com', displayName: 'Bob', role: 'member' });
		await db.update(attendee).set({ userId: 'u1' }).where(eq(attendee.id, 'B'));

		const people = await listPeople(db, null);
		expect(people.find((p) => p.id === 'B')?.loginEmail).toBe('bob@example.com');
		expect(people.find((p) => p.id === 'A')?.loginEmail).toBe(null);
		expect(people.every((p) => p.here)).toBe(true);
	});
});

describe('setAttending', () => {
	it('is idempotent in both directions', async () => {
		await setAttending(db, 'E26', 'A', false);
		await setAttending(db, 'E26', 'A', false);
		expect(names(await attendingPeople(db, 'E26'))).toEqual(['Bob', 'Carol']);

		await setAttending(db, 'E26', 'A', true);
		await setAttending(db, 'E26', 'A', true);
		expect(names(await attendingPeople(db, 'E26'))).toEqual(['Alice', 'Bob', 'Carol']);
	});
});
