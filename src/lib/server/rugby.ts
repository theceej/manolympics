/**
 * Best-effort live Six Nations scores via TheSportsDB's free API. Parse-only (no DB) so it
 * stays env-free and testable; the refresh endpoint does the upsert. Any failure returns an
 * empty list — manual score entry is always the fallback.
 */

export type RugbyEvent = {
	externalId: string;
	homeTeam: string;
	awayTeam: string;
	homeScore: number | null;
	awayScore: number | null;
	kickoff: string | null;
	status: 'scheduled' | 'live' | 'finished';
};

// Statuses TheSportsDB reports as fully finished.
const FINISHED = new Set(['FT', 'AET', 'FT_PEN', 'Match Finished', 'Full Time']);
const NOT_STARTED = new Set(['NS', 'Not Started', '', 'TBD']);

function cleanTeam(name: string): string {
	return name.replace(/\s+Rugby$/i, '').trim();
}

function mapStatus(raw: string | null | undefined, hasScore: boolean): RugbyEvent['status'] {
	const s = (raw ?? '').trim();
	if (FINISHED.has(s)) return 'finished';
	if (NOT_STARTED.has(s)) return 'scheduled';
	// Anything else with a live-looking status (1H, HT, 2H, "Live"…) counts as live.
	return hasScore || s ? 'live' : 'scheduled';
}

function toNum(v: unknown): number | null {
	if (v === null || v === undefined || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

/**
 * Fetch Six Nations rugby events for a given ISO date (YYYY-MM-DD). Filters TheSportsDB's
 * daily rugby fixtures down to the Six Nations Championship.
 */
export async function fetchSixNationsEvents(
	dateISO: string,
	key = process.env.THESPORTSDB_KEY || '3'
): Promise<RugbyEvent[]> {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return [];
	const url = `https://www.thesportsdb.com/api/v1/json/${key}/eventsday.php?d=${dateISO}&s=Rugby`;

	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 8000);
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(timer);
		if (!res.ok) return [];
		// TheSportsDB sometimes emits raw control characters inside string values (e.g.
		// newlines in strResult), which is invalid JSON. Strip them before parsing.
		const text = (await res.text()).replace(/[\u0000-\u001F]+/g, ' ');
		const data = JSON.parse(text) as { events?: unknown[] | null };
		const events = Array.isArray(data.events) ? data.events : [];
		return events
			.map((e) => e as Record<string, unknown>)
			.filter((e) => String(e.strLeague ?? '').toLowerCase().includes('six nations'))
			.map((e): RugbyEvent => {
				const homeScore = toNum(e.intHomeScore);
				const awayScore = toNum(e.intAwayScore);
				return {
					externalId: String(e.idEvent ?? ''),
					homeTeam: cleanTeam(String(e.strHomeTeam ?? '')),
					awayTeam: cleanTeam(String(e.strAwayTeam ?? '')),
					homeScore,
					awayScore,
					kickoff: (e.strTimestamp as string) || (e.dateEvent as string) || null,
					status: mapStatus(e.strStatus as string, homeScore !== null || awayScore !== null)
				};
			})
			.filter((e) => e.externalId && e.homeTeam && e.awayTeam);
	} catch {
		return [];
	}
}
