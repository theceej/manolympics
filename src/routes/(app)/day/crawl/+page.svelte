<script lang="ts">
	import { enhance } from '$app/forms';
	import { mapsUrl } from '$lib/utils';
	import type { PageData } from './$types';
	import type { LayoutData } from '../../$types';

	let { data, form }: { data: PageData & LayoutData; form: { error?: string } | null } = $props();
	const isAdmin = $derived(data.user?.role === 'admin');
	let adding = $state(false);
	let editing = $state<string | null>(null);

	const linkFor = (v: { mapUrl: string | null; address: string | null; name: string }) =>
		v.mapUrl || (v.address ? mapsUrl(v.address) : mapsUrl(v.name));
	const catIcon = (c: string) => (c === 'meal' ? '🍽️' : '🍻');
</script>

{#if !data.currentEdition}
	<p class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">Create a year first.</p>
{:else}
	<div class="flex items-center justify-between">
		<h2 class="font-bold">Food & drink</h2>
		{#if isAdmin}
			<button onclick={() => (adding = !adding)} class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold">{adding ? 'Close' : '+ Stop'}</button>
		{/if}
	</div>

	{#if form?.error}<p class="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{form.error}</p>{/if}

	{#if adding && isAdmin}
		<form method="POST" action="?/add" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') adding = false; }} class="mt-3 flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<div class="flex gap-2">
				<select name="category" class="w-28 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5">
					<option value="pub">🍻 Pub</option>
					<option value="meal">🍽️ Meal</option>
				</select>
				<input name="name" placeholder="Name" required class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
			</div>
			<div class="flex gap-2">
				<input name="arriveTime" type="time" class="w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
				<input name="address" placeholder="Address" class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
			</div>
			<input name="mapUrl" placeholder="Map link (optional — auto from address if blank)" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
			<input name="notes" placeholder="Notes (optional)" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
			<button class="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold">Add venue</button>
		</form>
	{/if}

	<ol class="mt-4 flex flex-col gap-3">
		{#each data.venues as v, i (v.id)}
			<li class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
				{#if editing === v.id && isAdmin}
					<form method="POST" action="?/update" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') editing = null; }} class="flex flex-col gap-2">
						<input type="hidden" name="id" value={v.id} />
						<div class="flex gap-2">
							<select name="category" value={v.category} class="w-28 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5">
								<option value="pub">🍻 Pub</option>
								<option value="meal">🍽️ Meal</option>
							</select>
							<input name="name" value={v.name} required class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
						</div>
						<div class="flex gap-2">
							<input name="arriveTime" type="time" value={v.arriveTime ?? ''} class="w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
							<input name="address" value={v.address ?? ''} placeholder="Address" class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
						</div>
						<input name="mapUrl" value={v.mapUrl ?? ''} placeholder="Map link" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
						<input name="notes" value={v.notes ?? ''} placeholder="Notes" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
						<div class="flex gap-2">
							<button class="flex-1 rounded-lg bg-brand-600 py-2 font-semibold">Save</button>
							<button type="button" onclick={() => (editing = null)} class="rounded-lg bg-slate-800 px-4 py-2">Cancel</button>
						</div>
					</form>
				{:else}
					<div class="flex items-start gap-3">
						<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-lg">{catIcon(v.category)}</div>
						<div class="flex-1">
							<div class="flex items-baseline gap-2">
								<span class="font-semibold">{v.name}</span>
								{#if v.arriveTime}<span class="text-sm text-slate-400">{v.arriveTime}</span>{/if}
							</div>
							{#if v.address}<p class="text-sm text-slate-400">{v.address}</p>{/if}
							{#if v.notes}<p class="mt-1 text-sm text-slate-500">{v.notes}</p>{/if}
							<a href={linkFor(v)} target="_blank" rel="noopener" class="mt-1 inline-block text-sm font-semibold text-brand-500">📍 Open map</a>
						</div>
						{#if isAdmin}
							<div class="flex flex-col items-end gap-1">
								<div class="flex gap-1">
									<form method="POST" action="?/move" use:enhance><input type="hidden" name="id" value={v.id} /><input type="hidden" name="dir" value="up" /><button class="rounded px-2 text-slate-400 disabled:opacity-30" disabled={i === 0}>↑</button></form>
									<form method="POST" action="?/move" use:enhance><input type="hidden" name="id" value={v.id} /><input type="hidden" name="dir" value="down" /><button class="rounded px-2 text-slate-400 disabled:opacity-30" disabled={i === data.venues.length - 1}>↓</button></form>
								</div>
								<button onclick={() => (editing = v.id)} class="text-xs text-slate-400">Edit</button>
								<form method="POST" action="?/delete" use:enhance><input type="hidden" name="id" value={v.id} /><button class="text-xs text-red-300">Delete</button></form>
							</div>
						{/if}
					</div>
				{/if}
			</li>
		{:else}
			<li class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No venues planned yet.</li>
		{/each}
	</ol>
{/if}
