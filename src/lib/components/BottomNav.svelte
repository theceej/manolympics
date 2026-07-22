<script lang="ts">
	import { page } from '$app/state';

	const items = [
		{ href: '/', label: 'Home', icon: '🏠' },
		{ href: '/leaderboard', label: 'Board', icon: '🏆' },
		{ href: '/games', label: 'Games', icon: '🎯' },
		{ href: '/day', label: 'Day', icon: '🍻' },
		{ href: '/tools', label: 'Tools', icon: '🎲' }
	];

	function active(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}
</script>

<nav
	class="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-900/95 backdrop-blur"
>
	<ul class="mx-auto flex max-w-lg items-stretch justify-between">
		{#each items as item (item.href)}
			<li class="flex-1">
				<a
					href={item.href}
					class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors {active(
						item.href
					)
						? 'text-brand-500'
						: 'text-slate-400 hover:text-slate-200'}"
					aria-current={active(item.href) ? 'page' : undefined}
				>
					<span class="text-xl leading-none">{item.icon}</span>
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
