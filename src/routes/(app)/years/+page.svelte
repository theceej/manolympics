<script lang="ts">
	import { enhance } from '$app/forms';
	import AttendeeChip from '$components/AttendeeChip.svelte';
	import type { PageData } from './$types';
	import type { LayoutData } from '../$types';

	let { data, form }: { data: PageData & LayoutData; form: { error?: string } | null } = $props();
	const isAdmin = $derived(data.user?.role === 'admin');
	let adding = $state(false);
	let historyOpen = $state<string | null>(null);
	const nextYear = new Date().getFullYear();
	const medal = (p: number) => (['🥇', '🥈', '🥉'][p - 1] ?? `${p}.`);
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-black">Years</h1>
	{#if isAdmin}
		<button onclick={() => (adding = !adding)} class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold">
			{adding ? 'Close' : '+ New year'}
		</button>
	{/if}
</div>

{#if form?.error}
	<p class="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{form.error}</p>
{/if}

{#if adding && isAdmin}
	<form
		method="POST"
		action="?/create"
		use:enhance={() => async ({ update, result }) => {
			await update();
			if (result.type === 'success') adding = false;
		}}
		class="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
	>
		<div class="flex gap-3">
			<input name="year" type="number" value={nextYear} required class="w-28 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
			<input name="title" placeholder="Title (optional)" class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
		</div>
		<label class="text-sm text-slate-300">Event date
			<input name="eventDate" type="date" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
		</label>
		<label class="text-sm text-slate-300">Copy games & venues from
			<select name="copyFrom" class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5">
				<option value="">— Start empty —</option>
				{#each data.editions as e (e.id)}
					<option value={e.id}>{e.year}{e.title ? ` · ${e.title}` : ''}</option>
				{/each}
			</select>
		</label>
		<button type="submit" class="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold">Create year</button>
	</form>
{/if}

<ul class="mt-4 flex flex-col gap-3">
	{#each data.editions as e (e.id)}
		<li class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg font-bold">{e.year}</h2>
					{#if e.title}<p class="text-sm text-slate-400">{e.title}</p>{/if}
					{#if e.eventDate}<p class="text-xs text-slate-500">{e.eventDate}</p>{/if}
				</div>
				{#if e.champion}
					<div class="flex items-center gap-2 rounded-full bg-gold/10 px-3 py-1">
						<span>🏆</span>
						<AttendeeChip name={e.champion.name} emoji={e.champion.emoji} color={e.champion.color} photo={e.champion.photo} size="sm" />
						<span class="text-sm font-semibold">{e.champion.name}</span>
					</div>
				{/if}
			</div>
			<!-- Historical standings (read-only for everyone) -->
			{#if e.manualResults.length > 0}
				<ol class="mt-3 flex flex-col gap-1 border-t border-slate-800 pt-3">
					{#each e.manualResults as r (r.id)}
						<li class="flex items-center gap-2 text-sm">
							<span class="w-6 text-center">{medal(r.position)}</span>
							{#if r.attendee}
								<AttendeeChip name={r.attendee.name} emoji={r.attendee.emoji} color={r.attendee.color} photo={r.attendee.photo} size="sm" />
								<span class="flex-1 truncate">{r.attendee.name}</span>
							{:else}<span class="flex-1 text-slate-500">—</span>{/if}
							{#if r.points !== null}<span class="text-slate-400 tabular-nums">{r.points} pts</span>{/if}
							{#if isAdmin}
								<form method="POST" action="?/deleteResult" use:enhance><input type="hidden" name="id" value={r.id} /><button class="text-xs text-red-300">✕</button></form>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}

			{#if isAdmin}
				<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
					{#if e.gameCount > 0}
						<form method="POST" action="?/recomputeChampion" use:enhance>
							<input type="hidden" name="editionId" value={e.id} />
							<button type="submit" class="text-sm font-semibold text-brand-500">Set champion from standings →</button>
						</form>
					{/if}
					<button onclick={() => (historyOpen = historyOpen === e.id ? null : e.id)} class="text-sm font-semibold text-slate-300">
						{historyOpen === e.id ? 'Close' : e.manualResults.length ? 'Edit past results' : 'Enter past results'}
					</button>
				</div>

				{#if historyOpen === e.id}
					<form method="POST" action="?/addResult" use:enhance={() => async ({ update }) => update({ reset: true })} class="mt-3 flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
						<p class="text-xs text-slate-500">Add a finishing position for a past (pre-app) year. Position 1 becomes the champion.</p>
						<input type="hidden" name="editionId" value={e.id} />
						<div class="flex gap-2">
							<input name="position" type="number" min="1" placeholder="#" required class="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-center" />
							<select name="attendeeId" required class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
								<option value="" disabled selected>Who…</option>
								{#each data.attendees as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
							</select>
							<input name="points" type="number" step="0.1" placeholder="pts" class="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-center" />
						</div>
						<button class="rounded-lg bg-brand-600 py-2 text-sm font-semibold">Add result</button>
					</form>
				{/if}
			{/if}
		</li>
	{:else}
		<li class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No years yet.</li>
	{/each}
</ul>
