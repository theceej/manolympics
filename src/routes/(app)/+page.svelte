<script lang="ts">
	import AttendeeChip from '$components/AttendeeChip.svelte';
	import { fmtPoints, medalFor } from '$lib/utils';
	import type { PageData } from './$types';
	import type { LayoutData } from './$types';

	let { data }: { data: PageData & LayoutData } = $props();

	const statusLabel = { setup: 'Setup', live: 'Live', final: 'Done' } as const;
	const statusClass = {
		setup: 'bg-slate-700 text-slate-300',
		live: 'bg-emerald-600/30 text-emerald-300',
		final: 'bg-brand-600/30 text-brand-300'
	} as const;
</script>

{#if !data.currentEdition}
	<div class="mt-10 flex flex-col items-center gap-4 text-center">
		<div class="text-5xl">🏟️</div>
		<h1 class="text-xl font-bold">No event yet</h1>
		<p class="max-w-xs text-sm text-slate-400">
			{#if data.user?.role === 'admin'}
				Create this year's edition to start adding games and scoring.
			{:else}
				An admin needs to set up this year's edition.
			{/if}
		</p>
		{#if data.user?.role === 'admin'}
			<a href="/years" class="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold">Set up a year</a>
		{/if}
	</div>
{:else}
	<div class="flex flex-col gap-6">
		<section>
			<div class="flex items-baseline justify-between">
				<h1 class="text-2xl font-black">{data.currentEdition.title ?? `Manolympics ${data.currentEdition.year}`}</h1>
			</div>
			{#if data.currentEdition.eventDate}
				<p class="text-sm text-slate-400">{data.currentEdition.eventDate}</p>
			{/if}
		</section>

		<!-- Standings preview -->
		<section class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="font-bold">Standings</h2>
				<a href="/leaderboard" class="text-sm font-semibold text-brand-500">Full board →</a>
			</div>
			{#if data.leaders.length === 0}
				<p class="text-sm text-slate-400">No scores in yet.</p>
			{:else}
				<ol class="flex flex-col gap-2">
					{#each data.leaders as row, i (row.attendeeId)}
						<li class="flex items-center gap-3">
							<span class="w-6 text-center text-lg">{medalFor(i + 1) ?? i + 1}</span>
							{#if row.attendee}
								<AttendeeChip name={row.attendee.name} emoji={row.attendee.emoji} color={row.attendee.color} photo={row.attendee.photo} size="sm" />
								<span class="flex-1 truncate">{row.attendee.name}</span>
							{:else}
								<span class="flex-1 text-slate-500">Unknown</span>
							{/if}
							<span class="font-bold tabular-nums">{fmtPoints(row.total)}</span>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		<!-- Games -->
		<section>
			<div class="mb-3 flex items-center justify-between">
				<h2 class="font-bold">Games</h2>
				<a href="/games" class="text-sm font-semibold text-brand-500">All games →</a>
			</div>
			{#if data.games.length === 0}
				<p class="rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-400">
					No games yet{data.user?.role === 'admin' ? ' — add one from the Games tab.' : '.'}
				</p>
			{:else}
				<ul class="grid grid-cols-2 gap-3">
					{#each data.games as g (g.id)}
						<li>
							<a href={`/games/${g.id}`} class="flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-3 active:scale-[0.98]">
								<span class="font-semibold leading-tight">{g.name}</span>
								<span class="mt-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold {statusClass[g.status]}">
									{statusLabel[g.status]}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
{/if}
