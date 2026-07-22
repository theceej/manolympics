<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import BottomNav from '$components/BottomNav.svelte';
	import { logout } from '$lib/auth-client';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let menuOpen = $state(false);

	async function signOut() {
		await logout();
		await invalidateAll();
		await goto('/login');
	}
</script>

<div class="mx-auto flex min-h-full max-w-lg flex-col">
	<header
		class="pt-safe sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur"
	>
		<a href="/" class="flex items-center gap-2 font-black tracking-tight">
			<span class="text-xl">🏅</span>
			<span>Manolympics</span>
			{#if data.currentEdition}
				<span class="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
					{data.currentEdition.year}
				</span>
			{/if}
		</a>
		<div class="relative">
			<button
				onclick={() => (menuOpen = !menuOpen)}
				class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-bold"
				aria-label="Menu"
			>
				{data.user?.displayName?.[0]?.toUpperCase() ?? '?'}
			</button>
			{#if menuOpen}
				<button class="fixed inset-0 z-40 cursor-default" onclick={() => (menuOpen = false)} aria-label="Close menu"></button>
				<div
					class="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl"
				>
					<div class="border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
						{data.user?.displayName}
						{#if data.user?.role === 'admin'}
							<span class="ml-1 rounded bg-brand-600/30 px-1.5 py-0.5 text-brand-300">admin</span>
						{/if}
					</div>
					<a href="/attendees" class="block px-4 py-2.5 text-sm hover:bg-slate-800" onclick={() => (menuOpen = false)}>People</a>
					<a href="/years" class="block px-4 py-2.5 text-sm hover:bg-slate-800" onclick={() => (menuOpen = false)}>Years</a>
					<a href="/winners" class="block px-4 py-2.5 text-sm hover:bg-slate-800" onclick={() => (menuOpen = false)}>Hall of Fame</a>
					{#if data.user?.role === 'admin'}
						<a href="/settings" class="block px-4 py-2.5 text-sm hover:bg-slate-800" onclick={() => (menuOpen = false)}>Settings</a>
					{/if}
					<button onclick={signOut} class="block w-full px-4 py-2.5 text-left text-sm text-red-300 hover:bg-slate-800">Sign out</button>
				</div>
			{/if}
		</div>
	</header>

	<main class="flex-1 px-4 pb-24 pt-4">
		{@render children()}
	</main>

	<BottomNav />
</div>
