<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { LayoutData } from '../$types';

	let { data, form }: { data: PageData & LayoutData; form: { error?: string } | null } = $props();
	const isAdmin = $derived(data.user?.role === 'admin');
	let adding = $state(false);
	let type = $state<'individual' | 'rounds' | 'tournament' | 'round_robin' | 'team'>('individual');
	// Match-based types don't take a raw-score scoring mode.
	const isMatchType = $derived(type === 'tournament' || type === 'round_robin');

	const typeLabel = {
		individual: 'Individual',
		rounds: 'Rounds',
		tournament: '1v1 Tournament',
		round_robin: 'Round robin',
		team: 'Teams'
	} as const;
	const statusClass = {
		setup: 'bg-slate-700 text-slate-300',
		live: 'bg-emerald-600/30 text-emerald-300',
		final: 'bg-brand-600/30 text-brand-300'
	} as const;
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-black">Games</h1>
	{#if isAdmin && data.currentEdition}
		<button onclick={() => (adding = !adding)} class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold">
			{adding ? 'Close' : '+ Add game'}
		</button>
	{/if}
</div>

{#if !data.currentEdition}
	<p class="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
		Create a year first, over in <a href="/years" class="font-semibold text-brand-500">Years</a>.
	</p>
{:else}
	{#if form?.error}
		<p class="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{form.error}</p>
	{/if}

	{#if adding && isAdmin}
		<form
			method="POST"
			action="?/create"
			use:enhance={() => async ({ update, result }) => {
				if (result.type === 'success' && result.data?.id) {
					await goto(`/games/${result.data.id}`);
				} else {
					await update();
				}
			}}
			class="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
		>
			<input name="name" placeholder="Game name" required class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
			<label class="text-sm text-slate-300">Type
				<select name="type" bind:value={type} class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5">
					<option value="individual">Individual — one score each</option>
					<option value="rounds">Rounds — scores per round</option>
					<option value="tournament">1v1 Tournament — knockout bracket</option>
					<option value="round_robin">Round robin — everyone plays everyone, most wins</option>
					<option value="team">Teams — grouped scores</option>
				</select>
			</label>
			{#if !isMatchType}
				<label class="text-sm text-slate-300">Scoring
					<select name="scoringMode" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5">
						<option value="rank">Rank → league points (via scheme)</option>
						<option value="direct">Direct — entered number is the points</option>
					</select>
				</label>
				<label class="flex items-center gap-2 text-sm text-slate-300">
					<select name="higherIsBetter" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5">
						<option value="true">Higher is better (points)</option>
						<option value="false">Lower is better (time)</option>
					</select>
				</label>
			{/if}
			<textarea name="description" placeholder="Description / rules (optional)" rows="2" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5"></textarea>
			<button type="submit" class="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold">Create & set up</button>
		</form>
	{/if}

	<ul class="mt-4 flex flex-col gap-2">
		{#each data.games as g (g.id)}
			<li>
				<a href={`/games/${g.id}`} class="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 active:scale-[0.99]">
					<div class="flex-1">
						<div class="font-semibold">{g.name}</div>
						<div class="text-xs text-slate-400">{typeLabel[g.type]}</div>
					</div>
					<span class="rounded-full px-2 py-0.5 text-[11px] font-semibold {statusClass[g.status]}">{g.status}</span>
					<span class="text-slate-600">›</span>
				</a>
			</li>
		{:else}
			<li class="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
				<p>No games yet.</p>
				{#if isAdmin}
					<form method="POST" action="?/starter" use:enhance class="mt-3">
						<button class="rounded-xl bg-brand-600 px-4 py-2.5 font-semibold text-white">✨ Add our usual games</button>
					</form>
					<p class="mt-2 text-xs text-slate-500">Beer Pong, Mario Kart, Darts, Pool & Skittles</p>
				{/if}
			</li>
		{/each}
	</ul>

	{#if isAdmin && data.games.length > 0 && !data.games.some((g) => g.name.toLowerCase() === 'skittles')}
		<form method="POST" action="?/starter" use:enhance class="mt-4">
			<button class="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-semibold text-slate-300">✨ Add our usual games</button>
		</form>
	{/if}
{/if}
