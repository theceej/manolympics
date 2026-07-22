import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSixNationsEvents } from './rugby';

function mockFetch(body: unknown, ok = true) {
	// rugby.ts reads the body as text (to strip control chars) then JSON.parses it.
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ({ ok, text: async () => JSON.stringify(body) }) as unknown as Response)
	);
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchSixNationsEvents', () => {
	it('parses and normalises Six Nations events', async () => {
		mockFetch({
			events: [
				{
					idEvent: '2092911',
					strLeague: 'Six Nations Championship',
					strHomeTeam: 'Italy Rugby',
					strAwayTeam: 'Ireland Rugby',
					intHomeScore: '17',
					intAwayScore: '22',
					strStatus: 'FT',
					strTimestamp: '2025-03-15T14:15:00'
				}
			]
		});
		const out = await fetchSixNationsEvents('2025-03-15');
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({
			externalId: '2092911',
			homeTeam: 'Italy', // " Rugby" suffix stripped
			awayTeam: 'Ireland',
			homeScore: 17,
			awayScore: 22,
			status: 'finished'
		});
	});

	it('filters out non-Six-Nations rugby', async () => {
		mockFetch({
			events: [
				{ idEvent: '1', strLeague: 'United Rugby Championship', strHomeTeam: 'A', strAwayTeam: 'B' }
			]
		});
		expect(await fetchSixNationsEvents('2025-03-15')).toHaveLength(0);
	});

	it('maps not-started and live statuses', async () => {
		mockFetch({
			events: [
				{ idEvent: '1', strLeague: 'Six Nations', strHomeTeam: 'Wales', strAwayTeam: 'England', strStatus: 'NS' },
				{ idEvent: '2', strLeague: 'Six Nations', strHomeTeam: 'France', strAwayTeam: 'Scotland', strStatus: '2H', intHomeScore: '10', intAwayScore: '7' }
			]
		});
		const out = await fetchSixNationsEvents('2025-03-15');
		expect(out.find((e) => e.externalId === '1')?.status).toBe('scheduled');
		expect(out.find((e) => e.externalId === '2')?.status).toBe('live');
	});

	it('returns [] on a bad date without fetching', async () => {
		const spy = vi.fn();
		vi.stubGlobal('fetch', spy);
		expect(await fetchSixNationsEvents('not-a-date')).toEqual([]);
		expect(spy).not.toHaveBeenCalled();
	});

	it('returns [] when the API errors', async () => {
		mockFetch({}, false);
		expect(await fetchSixNationsEvents('2025-03-15')).toEqual([]);
	});

	it('returns [] when the network throws', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
		expect(await fetchSixNationsEvents('2025-03-15')).toEqual([]);
	});
});
