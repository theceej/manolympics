<script lang="ts">
	import AttendeeChip from '$components/AttendeeChip.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1 class="text-2xl font-black">Hall of Fame</h1>

{#if data.hall.length > 0}
	<section class="mt-4 flex gap-3 overflow-x-auto pb-2">
		{#each data.hall as h (h.attendee!.id)}
			<div class="flex min-w-[7rem] flex-col items-center gap-1 rounded-2xl border border-gold/30 bg-gold/5 p-4">
				<AttendeeChip name={h.attendee!.name} emoji={h.attendee!.emoji} color={h.attendee!.color} photo={h.attendee!.photo} size="lg" />
				<span class="mt-1 text-center text-sm font-semibold">{h.attendee!.name}</span>
				<span class="text-xs text-gold">{h.count}× champion</span>
			</div>
		{/each}
	</section>
{/if}

<h2 class="mt-6 mb-3 font-bold">Champions by year</h2>
<ul class="flex flex-col gap-2">
	{#each data.years as e (e.id)}
		<li class="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
			<span class="w-14 text-lg font-black tabular-nums">{e.year}</span>
			{#if e.champion}
				<span class="text-xl">🏆</span>
				<AttendeeChip name={e.champion.name} emoji={e.champion.emoji} color={e.champion.color} photo={e.champion.photo} size="sm" />
				<span class="flex-1 truncate font-semibold">{e.champion.name}</span>
			{:else}
				<span class="flex-1 text-sm text-slate-500">No champion recorded</span>
			{/if}
		</li>
	{:else}
		<li class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No years yet.</li>
	{/each}
</ul>
