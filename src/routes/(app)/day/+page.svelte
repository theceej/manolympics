<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import type { LayoutData } from '../$types';

	let { data, form }: { data: PageData & LayoutData; form: { error?: string } | null } = $props();
	const isAdmin = $derived(data.user?.role === 'admin');
	let adding = $state(false);

	const kindIcon = { game: '🎯', rugby: '🏉', crawl: '🍻', meal: '🍽️', other: '📌' } as const;
	const kindRing = {
		game: 'bg-brand-600/20 text-brand-300',
		rugby: 'bg-emerald-600/20 text-emerald-300',
		crawl: 'bg-amber-600/20 text-amber-300',
		meal: 'bg-orange-600/20 text-orange-300',
		other: 'bg-slate-700 text-slate-300'
	} as const;
</script>

{#if !data.currentEdition}
	<p class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">Create a year first.</p>
{:else}
	<div class="flex items-center justify-between">
		<h2 class="font-bold">Schedule{data.eventDate ? ` · ${data.eventDate}` : ''}</h2>
		{#if isAdmin}
			<button onclick={() => (adding = !adding)} class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold">{adding ? 'Close' : '+ Event'}</button>
		{/if}
	</div>

	{#if form?.error}<p class="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{form.error}</p>{/if}

	{#if adding && isAdmin}
		<form method="POST" action="?/add" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') adding = false; }} class="mt-3 flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<div class="flex gap-2">
				<input name="time" type="time" required class="w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
				<select name="kind" class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5">
					<option value="game">🎯 Game</option>
					<option value="other">📌 Other</option>
					<option value="meal">🍽️ Meal</option>
					<option value="crawl">🍻 Pub</option>
					<option value="rugby">🏉 Rugby</option>
				</select>
			</div>
			<input name="title" placeholder="What's happening?" required class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
			<button class="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold">Add to timeline</button>
		</form>
	{/if}

	<ol class="mt-4">
		{#each data.items as item, i (item.id)}
			<li class="relative flex gap-3 pb-5">
				{#if i < data.items.length - 1}<div class="absolute left-4 top-8 h-full w-px bg-slate-800"></div>{/if}
				<div class="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm {kindRing[item.kind]}">{kindIcon[item.kind]}</div>
				<div class="flex-1">
					<div class="flex items-baseline justify-between gap-2">
						<span class="font-semibold">{item.title}</span>
						{#if item.time}<span class="shrink-0 text-sm text-slate-400 tabular-nums">{item.time}</span>{/if}
					</div>
					{#if item.kind === 'rugby' && item.score}
						<span class="text-lg font-black tabular-nums">{item.score}</span>
						<span class="text-xs text-slate-500"> · {item.subtitle}</span>
					{:else if item.subtitle}
						<p class="text-sm text-slate-400">{item.subtitle}</p>
					{/if}
					{#if item.mapUrl}<a href={item.mapUrl} target="_blank" rel="noopener" class="text-sm font-semibold text-brand-500">📍 Map</a>{/if}
					{#if isAdmin && item.manual}
						<form method="POST" action="?/delete" use:enhance class="mt-0.5"><input type="hidden" name="id" value={item.id} /><button class="text-xs text-red-300/70">remove</button></form>
					{/if}
				</div>
			</li>
		{:else}
			<li class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
				Nothing scheduled yet. Add events, venues (Crawl), or rugby matches and they'll appear here in order.
			</li>
		{/each}
	</ol>
{/if}
