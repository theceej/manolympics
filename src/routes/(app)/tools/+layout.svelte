<script lang="ts">
	import { page } from '$app/state';

	let { children }: { children: import('svelte').Snippet } = $props();
	const tabs = [
		{ href: '/tools', label: '⏱️ Timer' },
		{ href: '/tools/random', label: '🎲 Random' },
		{ href: '/tools/money', label: '💷 Money' }
	];
	const active = (href: string) =>
		href === '/tools' ? page.url.pathname === '/tools' : page.url.pathname.startsWith(href);
</script>

<h1 class="text-2xl font-black">Tools</h1>
<div class="mt-3 mb-4 flex rounded-xl bg-slate-900 p-1">
	{#each tabs as t (t.href)}
		<a
			href={t.href}
			class="flex-1 rounded-lg py-2 text-center text-sm font-semibold transition-colors {active(t.href)
				? 'bg-brand-600 text-white'
				: 'text-slate-400'}"
		>{t.label}</a>
	{/each}
</div>

{@render children()}
