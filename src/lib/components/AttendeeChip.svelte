<script lang="ts">
	import { autoColor, initials } from '$lib/utils';

	let {
		name,
		emoji = null,
		color = null,
		photo = null,
		size = 'md'
	}: {
		name: string;
		emoji?: string | null;
		color?: string | null;
		photo?: string | null;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const px = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };
	const bg = $derived(color ?? autoColor(name));
</script>

{#if photo}
	<img
		src={photo}
		alt={name}
		class="shrink-0 rounded-full object-cover shadow-sm {px[size]}"
		title={name}
	/>
{:else}
	<span
		class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm {px[
			size
		]}"
		style="background:{bg}"
		title={name}
	>
		{#if emoji}{emoji}{:else}{initials(name)}{/if}
	</span>
{/if}
