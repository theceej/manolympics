<script lang="ts">
	import { onDestroy } from 'svelte';
	import AttendeeChip from '$components/AttendeeChip.svelte';
	import type { PageData } from './$types';
	import type { Attendee } from '$server/db/schema';

	let { data }: { data: PageData } = $props();

	type Tab = 'pick' | 'order';
	let tab = $state<Tab>('pick');

	// Track who's been toggled OUT; everyone active starts in the pool.
	let excluded = $state<Record<string, boolean>>({});
	const pool = $derived(data.attendees.filter((a) => !excluded[a.id]));

	// ── Random picker ──
	let spinning = $state(false);
	let picked = $state<Attendee | null>(null);
	let flash = $state<Attendee | null>(null);
	let spinTimer: ReturnType<typeof setInterval> | null = null;

	function pick() {
		if (pool.length === 0 || spinning) return;
		spinning = true;
		picked = null;
		let ticks = 0;
		const total = 18 + Math.floor(Math.random() * 8);
		spinTimer = setInterval(() => {
			flash = pool[Math.floor(Math.random() * pool.length)];
			ticks++;
			if (ticks >= total) {
				if (spinTimer) clearInterval(spinTimer);
				spinTimer = null;
				picked = pool[Math.floor(Math.random() * pool.length)];
				flash = picked;
				spinning = false;
				if ('vibrate' in navigator) navigator.vibrate(120);
			}
		}, 80);
	}

	// ── Running order ──
	let order = $state<Attendee[]>([]);
	function shuffle() {
		const a = [...pool];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		order = a;
	}

	onDestroy(() => {
		if (spinTimer) clearInterval(spinTimer);
	});
</script>

<div class="flex rounded-xl bg-slate-900 p-1">
	<button onclick={() => (tab = 'pick')} class="flex-1 rounded-lg py-2 text-sm font-semibold {tab === 'pick' ? 'bg-slate-700' : 'text-slate-400'}">Pick someone</button>
	<button onclick={() => (tab = 'order')} class="flex-1 rounded-lg py-2 text-sm font-semibold {tab === 'order' ? 'bg-slate-700' : 'text-slate-400'}">Running order</button>
</div>

{#if data.attendees.length === 0}
	<p class="mt-6 rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">Add some people first.</p>
{:else}
	{#if tab === 'pick'}
		<div class="mt-8 flex flex-col items-center gap-6">
			<div class="flex h-40 w-full max-w-xs items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/50">
				{#if flash}
					<div class="flex flex-col items-center gap-2 {spinning ? 'opacity-70' : ''}">
						<AttendeeChip name={flash.name} emoji={flash.emoji} color={flash.color} photo={flash.photo} size="lg" />
						<span class="text-2xl font-black {picked ? 'text-brand-300' : ''}">{flash.name}</span>
					</div>
				{:else}
					<span class="text-slate-500">Tap to pick</span>
				{/if}
			</div>
			<button onclick={pick} disabled={spinning || pool.length === 0} class="rounded-full bg-brand-600 px-12 py-4 text-lg font-bold active:scale-95 disabled:opacity-50">
				{spinning ? '…' : picked ? 'Again' : 'Pick'}
			</button>
		</div>
	{:else}
		<div class="mt-6 flex flex-col items-center gap-4">
			<button onclick={shuffle} disabled={pool.length === 0} class="rounded-full bg-brand-600 px-10 py-3 font-bold active:scale-95 disabled:opacity-50">
				{order.length ? 'Re-roll order' : 'Generate order'}
			</button>
			{#if order.length}
				<ol class="w-full max-w-sm">
					{#each order as a, i (a.id)}
						<li class="flex items-center gap-3 border-b border-slate-800 py-2.5">
							<span class="w-7 text-center text-lg font-black text-brand-400 tabular-nums">{i + 1}</span>
							<AttendeeChip name={a.name} emoji={a.emoji} color={a.color} photo={a.photo} size="sm" />
							<span class="font-semibold">{a.name}</span>
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	{/if}

	<!-- Pool selector -->
	<details class="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<summary class="cursor-pointer text-sm font-semibold text-slate-300">Who's in the pool ({pool.length})</summary>
		<div class="mt-3 flex flex-wrap gap-2">
			{#each data.attendees as a (a.id)}
				<button
					onclick={() => (excluded[a.id] = !excluded[a.id])}
					class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm {!excluded[a.id] ? 'border-brand-500 bg-brand-600/20 text-brand-200' : 'border-slate-700 text-slate-500'}"
				>
					<AttendeeChip name={a.name} emoji={a.emoji} color={a.color} photo={a.photo} size="sm" />
					{a.name}
				</button>
			{/each}
		</div>
	</details>
{/if}
