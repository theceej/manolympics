/**
 * Applies pending Drizzle migrations against DATABASE_URL — works for a local file
 * (`file:…`) or a remote Turso database (`libsql://…` + DATABASE_AUTH_TOKEN). Run manually
 * (`npm run db:migrate`) or on container start via the Docker entrypoint.
 */
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const url = process.env.DATABASE_URL || 'file:./data/manolympics.db';
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

if (url.startsWith('file:')) {
	const path = url.slice('file:'.length);
	const dir = dirname(path);
	if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
}

const client = createClient({ url, authToken });
const db = drizzle(client);
await migrate(db, { migrationsFolder: './drizzle' });
console.log(`Migrations applied to ${url}`);
client.close();
