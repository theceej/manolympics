import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

/**
 * One libSQL client for every target:
 *   • local / Docker  → DATABASE_URL=file:./data/manolympics.db  (a plain SQLite file)
 *   • Turso (Vercel)  → DATABASE_URL=libsql://<db>.turso.io + DATABASE_AUTH_TOKEN=…
 * Same SQL, same Drizzle schema — only the URL differs.
 */
const url = env.DATABASE_URL || 'file:./data/manolympics.db';
const authToken = env.DATABASE_AUTH_TOKEN || undefined;

// Ensure the folder exists for local file databases (no-op for remote Turso URLs).
if (url.startsWith('file:')) {
	const path = url.slice('file:'.length);
	const dir = dirname(path);
	if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
}

const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });
export { schema };
