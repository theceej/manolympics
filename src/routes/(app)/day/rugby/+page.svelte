<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import type { LayoutData } from '../../$types';

	let { data, form }: { data: PageData & LayoutData; form: { error?: string } | null } = $props();
	const isAdmin = $derived(data.user?.role === 'admin');
	let adding = $state(false);
	let refreshing = $state(false);
	let refreshMsg = $state<string | null>(null);

	async function refresh() {
		if (!data.currentEdition) return;
		refreshing = true;
		refreshMsg = null;
		try {
			const res = await fetch('/api/rugby/refresh', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ editionId: data.currentEdition.id })
			});
			const body = await res.json();
			if (body.reason === 'no-event-date') refreshMsg = 'Set the event date on this year first.';
			else refreshMsg = body.count ? `Synced ${body.updated} of ${body.count} match(es).` : 'No live Six Nations data found.';
			await invalidateAll();
		} catch {
			refreshMsg = 'Live sync failed — enter scores manually.';
		} finally {
			refreshing = false;
		}
	}

	const statusPill = {
		scheduled: 'bg-slate-700 text-slate-300',
		live: 'bg-emerald-600/30 text-emerald-300 animate-pulse',
		finished: 'bg-brand-600/30 text-brand-300'
	} as const;
	const fmtTime = (iso: string | null) => {
		if (!iso) return '';
		const d = new Date(iso.replace(' ', 'T'));
		return isNaN(d.getTime()) ? iso : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};
</script>

{#if !data.currentEdition}
	<p class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">Create a year first.</p>
{:else}
	<div class="flex items-center justify-between">
		<h2 class="font-bold">Six Nations</h2>
		<button onclick={refresh} disabled={refreshing} class="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
			{refreshing ? 'Syncing…' : '↻ Live sync'}
		</button>
	</div>
	{#if refreshMsg}<p class="mt-2 text-xs text-slate-400">{refreshMsg}</p>{/if}
	{#if form?.error}<p class="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{form.error}</p>{/if}

	<div class="mt-4 flex flex-col gap-3">
		{#each data.matches as m (m.id)}
			<form method="POST" action="?/score" use:enhance class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
				<input type="hidden" name="id" value={m.id} />
				<div class="mb-2 flex items-center justify-between">
					<span class="text-xs text-slate-500">{fmtTime(m.kickoff)}{m.source === 'api' ? ' · live' : ''}</span>
					<select name="status" value={m.status} class="rounded-full px-2 py-0.5 text-[11px] font-semibold {statusPill[m.status]}">
						<option value="scheduled">scheduled</option>
						<option value="live">live</option>
						<option value="finished">finished</option>
					</select>
				</div>
				<div class="grid grid-cols-[1fr_auto] items-center gap-2">
					<span class="font-semibold">{m.homeTeam}</span>
					<input name="homeScore" type="number" inputmode="numeric" value={m.homeScore ?? ''} placeholder="–" class="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-center text-lg font-bold" />
					<span class="font-semibold">{m.awayTeam}</span>
					<input name="awayScore" type="number" inputmode="numeric" value={m.awayScore ?? ''} placeholder="–" class="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-center text-lg font-bold" />
				</div>
				<div class="mt-3 flex items-center gap-2">
					<button class="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-semibold">Save score</button>
					{#if isAdmin}
						<button type="submit" formaction="?/delete" class="rounded-lg bg-slate-800 px-3 py-2 text-sm text-red-300">Delete</button>
					{/if}
				</div>
			</form>
		{:else}
			<p class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
				No matches yet. {isAdmin ? 'Add them below or hit Live sync.' : ''}
			</p>
		{/each}
	</div>

	{#if isAdmin}
		<div class="mt-4">
			<button onclick={() => (adding = !adding)} class="text-sm font-semibold text-brand-500">{adding ? 'Close' : '+ Add match manually'}</button>
			{#if adding}
				<form method="POST" action="?/add" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') adding = false; }} class="mt-2 flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
					<div class="flex gap-2">
						<input name="homeTeam" placeholder="Home team" required class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
						<input name="awayTeam" placeholder="Away team" required class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
					</div>
					<input name="kickoff" type="datetime-local" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
					<button class="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold">Add match</button>
				</form>
			{/if}
		</div>
	{/if}
{/if}
