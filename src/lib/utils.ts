/** Shared client/server-safe helpers. */

export function initials(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? '')
		.join('');
}

/** Deterministic accent colour from a string, for attendee chips without a set colour. */
export function autoColor(seed: string): string {
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
	return `hsl(${h} 65% 45%)`;
}

export const MEDALS = ['🥇', '🥈', '🥉'] as const;

export function medalFor(rank: number): string | null {
	return rank >= 1 && rank <= 3 ? MEDALS[rank - 1] : null;
}

export function ordinal(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Format a number without trailing ".0" (league points can be fractional on ties). */
export function fmtPoints(n: number): string {
	return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function mapsUrl(query: string): string {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
