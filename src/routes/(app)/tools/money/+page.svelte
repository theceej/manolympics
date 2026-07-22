<script lang="ts">
	import { enhance } from '$app/forms';
	import AttendeeChip from '$components/AttendeeChip.svelte';
	import InfoTip from '$components/InfoTip.svelte';
	import type { PageData } from './$types';
	import type { LayoutData } from '../../$types';

	let { data, form }: { data: PageData & LayoutData; form: { error?: string } | null } = $props();
	let adding = $state(false);
	const active = $derived(data.attendees.filter((a) => a.active));
	const gbp = (n: number) => `£${Math.abs(n).toFixed(2)}`;
</script>

{#if !data.currentEdition}
	<p class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">Create a year first.</p>
{:else}
	<!-- Settle-up -->
	<section class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<h2 class="mb-3 font-bold">
			Settle up
			<InfoTip text="Log who paid for what and how it was split. This shows the fewest payments needed to square everyone up. +£ means they're owed, −£ means they owe." />
		</h2>
		{#if data.transfers.length === 0}
			<p class="text-sm text-slate-400">All square — nothing to settle.</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each data.transfers as t (t.from + t.to)}
					<li class="flex items-center gap-2 text-sm">
						{#if t.fromA}<AttendeeChip name={t.fromA.name} emoji={t.fromA.emoji} color={t.fromA.color} photo={t.fromA.photo} size="sm" />{/if}
						<span class="font-semibold">{t.fromA?.name}</span>
						<span class="text-slate-500">pays</span>
						{#if t.toA}<AttendeeChip name={t.toA.name} emoji={t.toA.emoji} color={t.toA.color} photo={t.toA.photo} size="sm" />{/if}
						<span class="font-semibold">{t.toA?.name}</span>
						<span class="ml-auto font-black text-emerald-400">{gbp(t.amount)}</span>
					</li>
				{/each}
			</ul>
		{/if}
		{#if data.balances.some((b) => Math.abs(b.net) > 0.005)}
			<div class="mt-4 border-t border-slate-800 pt-3">
				{#each data.balances as b (b.attendee!.id)}
					<div class="flex items-center gap-2 py-0.5 text-sm">
						<span class="flex-1 truncate">{b.attendee!.name}</span>
						<span class="tabular-nums {b.net >= 0 ? 'text-emerald-400' : 'text-red-300'}">
							{b.net >= 0 ? '+' : '−'}{gbp(b.net)}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<div class="mt-6 flex items-center justify-between">
		<h2 class="font-bold">Expenses</h2>
		<button onclick={() => (adding = !adding)} class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold">{adding ? 'Close' : '+ Expense'}</button>
	</div>

	{#if form?.error}<p class="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{form.error}</p>{/if}

	{#if adding}
		<form method="POST" action="?/add" use:enhance={() => async ({ update, result }) => { await update(); if (result.type === 'success') adding = false; }} class="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<input name="description" placeholder="What was it? (e.g. round at The Anchor)" required class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
			<div class="flex gap-2">
				<div class="flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3">
					<span class="text-slate-400">£</span>
					<input name="amount" type="number" step="0.01" min="0" placeholder="0.00" required class="w-24 bg-transparent px-1 py-2.5 outline-none" />
				</div>
				<select name="paidBy" required class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5">
					<option value="" disabled selected>Paid by…</option>
					{#each active as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
				</select>
			</div>
			<div>
				<p class="mb-1 text-sm text-slate-300">Split between</p>
				<div class="flex flex-wrap gap-2">
					{#each active as a (a.id)}
						<label class="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-600/20">
							<input type="checkbox" name="sharers" value={a.id} checked class="accent-brand-500" />
							{a.name}
						</label>
					{/each}
				</div>
			</div>
			<button class="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold">Add expense</button>
		</form>
	{/if}

	<ul class="mt-4 flex flex-col gap-2">
		{#each data.expenses as e (e.id)}
			<li class="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
				<div class="flex-1">
					<div class="font-semibold">{e.description}</div>
					<div class="text-xs text-slate-400">
						{e.payer?.name ?? '?'} paid · split {e.sharerIds.length} way{e.sharerIds.length === 1 ? '' : 's'}
					</div>
				</div>
				<span class="font-black tabular-nums">£{e.amount.toFixed(2)}</span>
				<form method="POST" action="?/delete" use:enhance><input type="hidden" name="id" value={e.id} /><button class="text-sm text-red-300">✕</button></form>
			</li>
		{:else}
			<li class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No expenses logged yet.</li>
		{/each}
	</ul>
{/if}
