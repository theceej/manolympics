import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$server/db';
import { edition, rugbyMatch, timelineEvent, venue } from '$server/db/schema';
import { mapsUrl } from '$lib/utils';
import type { Actions, PageServerLoad } from './$types';

export type TimelineItem = {
	id: string;
	minutes: number; // sort key; 24*60 for unknown -> sinks to bottom
	time: string;
	title: string;
	kind: 'game' | 'rugby' | 'crawl' | 'meal' | 'other';
	subtitle?: string | null;
	mapUrl?: string | null;
	score?: string | null;
	manual: boolean; // true => a deletable timeline_event row
};

function hhmm(s: string | null | undefined): { time: string; minutes: number } {
	if (!s) return { time: '', minutes: 24 * 60 };
	// Accept "HH:MM" or an ISO datetime.
	const iso = s.includes('T') || s.includes(' ') ? new Date(s.replace(' ', 'T')) : null;
	if (iso && !isNaN(iso.getTime())) {
		const t = iso.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
		const [h, m] = t.split(':').map(Number);
		return { time: t, minutes: h * 60 + m };
	}
	const match = /^(\d{1,2}):(\d{2})/.exec(s);
	if (match) return { time: s.slice(0, 5), minutes: Number(match[1]) * 60 + Number(match[2]) };
	return { time: s, minutes: 24 * 60 };
}

export const load: PageServerLoad = async ({ parent }) => {
	const { currentEdition } = await parent();
	if (!currentEdition) return { items: [] as TimelineItem[] };

	const [events, venues, rugby] = await Promise.all([
		db.select().from(timelineEvent).where(eq(timelineEvent.editionId, currentEdition.id)).all(),
		db.select().from(venue).where(eq(venue.editionId, currentEdition.id)).all(),
		db.select().from(rugbyMatch).where(eq(rugbyMatch.editionId, currentEdition.id)).all()
	]);

	const items: TimelineItem[] = [];

	for (const e of events) {
		const { time, minutes } = hhmm(e.time);
		items.push({ id: e.id, minutes, time, title: e.title, kind: e.kind, manual: true });
	}
	for (const v of venues) {
		const { time, minutes } = hhmm(v.arriveTime);
		items.push({
			id: `venue-${v.id}`,
			minutes,
			time,
			title: v.name,
			kind: v.category === 'meal' ? 'meal' : 'crawl',
			subtitle: v.address,
			mapUrl: v.mapUrl || mapsUrl(v.address || v.name),
			manual: false
		});
	}
	for (const r of rugby) {
		const { time, minutes } = hhmm(r.kickoff);
		const score = r.homeScore !== null || r.awayScore !== null ? `${r.homeScore ?? 0}–${r.awayScore ?? 0}` : null;
		items.push({
			id: `rugby-${r.id}`,
			minutes,
			time,
			title: `${r.homeTeam} v ${r.awayTeam}`,
			kind: 'rugby',
			subtitle: r.status,
			score,
			manual: false
		});
	}

	items.sort((a, b) => a.minutes - b.minutes);
	return { items, eventDate: currentEdition.eventDate };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const e = await db.select({ id: edition.id }).from(edition).orderBy(desc(edition.year)).get();
		if (!e) return fail(400, { error: 'Create a year first.' });
		const form = await request.formData();
		const time = String(form.get('time') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const kind = String(form.get('kind') ?? 'other') as TimelineItem['kind'];
		if (!time || !title) return fail(400, { error: 'Time and title required.' });
		await db.insert(timelineEvent).values({ editionId: e.id, time, title, kind });
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		await db.delete(timelineEvent).where(eq(timelineEvent.id, String(form.get('id') ?? '')));
		return { success: true };
	}
};
