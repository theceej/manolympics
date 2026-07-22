<script lang="ts">
	import AttendeeChip from '$components/AttendeeChip.svelte';
	import InfoTip from '$components/InfoTip.svelte';
	import { fmtPoints, medalFor } from '$lib/utils';
	import type { PageData } from './$types';
	import type { LayoutData } from '../$types';

	let { data }: { data: PageData & LayoutData } = $props();
	let expanded = $state<string | null>(null);
	const gameById = $derived(Object.fromEntries(data.games.map((g) => [g.id, g])));
</script>

<h1 class="text-2xl font-black">
	Leaderboard
	<InfoTip text="League points from every game, added up. Each game turns finishing position into points (1st=10, 2nd=8, 3rd=6…). Tap a person to see their per-game breakdown." />
</h1>
{#if data.currentEdition}
	<p class="text-sm text-slate-400">{data.currentEdition.title ?? `Manolympics ${data.currentEdition.year}`}</p>
{/if}

{#if !data.currentEdition}
	<p class="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No event yet.</p>
{:else if data.rows.length === 0}
	<p class="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No scores yet.</p>
{:else}
	<ol class="mt-4 flex flex-col gap-2">
		{#each data.rows as row, i (row.attendeeId)}
			<li class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
				<button onclick={() => (expanded = expanded === row.attendeeId ? null : row.attendeeId)} class="flex w-full items-center gap-3 p-3 text-left">
					<span class="w-7 text-center text-lg font-bold">{medalFor(i + 1) ?? i + 1}</span>
					{#if row.attendee}
						<AttendeeChip name={row.attendee.name} emoji={row.attendee.emoji} color={row.attendee.color} photo={row.attendee.photo} />
						<span class="flex-1 truncate font-semibold">{row.attendee.name}</span>
					{:else}<span class="flex-1 text-slate-500">Unknown</span>{/if}
					<span class="text-xs text-slate-500">{row.gamesPlayed} games</span>
					<span class="w-12 text-right text-lg font-black tabular-nums">{fmtPoints(row.total)}</span>
				</button>
				{#if expanded === row.attendeeId}
					<div class="border-t border-slate-800 bg-slate-950/50 px-3 py-2">
						{#each Object.entries(row.perGame) as [gameId, pts] (gameId)}
							<div class="flex justify-between py-0.5 text-sm">
								<span class="text-slate-400">{gameById[gameId]?.name ?? 'Game'}</span>
								<span class="tabular-nums">{fmtPoints(pts)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</li>
		{/each}
	</ol>
{/if}
