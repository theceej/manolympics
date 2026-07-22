<script lang="ts">
	import { onMount } from 'svelte';

	let { userId, isAdmin = false }: { userId: string; isAdmin?: boolean } = $props();

	let show = $state(false);
	const key = () => `mano_onboarded_v1_${userId}`;

	onMount(() => {
		try {
			if (!localStorage.getItem(key())) show = true;
		} catch {
			/* localStorage unavailable — just skip */
		}
	});

	function dismiss() {
		try {
			localStorage.setItem(key(), '1');
		} catch {
			/* ignore */
		}
		show = false;
	}
</script>

{#if show}
	<div class="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
		<div class="pb-safe w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
			<div class="text-center text-5xl">🏅</div>
			<h2 class="mt-2 text-center text-xl font-black">Welcome to Manolympics</h2>
			<p class="mt-1 text-center text-sm text-slate-400">Here's the lay of the land:</p>

			<ul class="mt-4 flex flex-col gap-3 text-sm">
				<li class="flex gap-3"><span class="text-lg">🏆</span><span><strong>Board</strong> — the live leaderboard. League points from every game, added up.</span></li>
				<li class="flex gap-3"><span class="text-lg">🎯</span><span><strong>Games</strong> — tap any game to enter scores. Anyone signed in can help keep score.</span></li>
				<li class="flex gap-3"><span class="text-lg">🍻</span><span><strong>Day</strong> — the timeline, live rugby score, and the food &amp; drink plan.</span></li>
				<li class="flex gap-3"><span class="text-lg">🎲</span><span><strong>Tools</strong> — timer, random picker, and splitting the bill.</span></li>
				{#if isAdmin}
					<li class="flex gap-3"><span class="text-lg">⚙️</span><span>You're an <strong>admin</strong> — set up people, years and games from the menu (top-right).</span></li>
				{/if}
			</ul>

			<button onclick={dismiss} class="mt-6 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white active:scale-[0.98]">Got it</button>
			<p class="mt-2 text-center text-xs text-slate-500">You can reopen this anytime from <strong>Menu → Help</strong>.</p>
		</div>
	</div>
{/if}
