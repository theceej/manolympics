<script lang="ts">
	// Small "ⓘ" button that toggles an inline explanatory popover. Pass `text` for a simple
	// tip, or children for richer content.
	let { text = '', label = 'More info' }: { text?: string; label?: string } = $props();
	let open = $state(false);
</script>

<span class="relative inline-flex align-middle">
	<button
		type="button"
		onclick={(e) => {
			e.stopPropagation();
			e.preventDefault();
			open = !open;
		}}
		aria-label={label}
		aria-expanded={open}
		class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-[11px] font-bold text-slate-400 hover:text-slate-200"
	>i</button>

	{#if open}
		<!-- click-away backdrop -->
		<button class="fixed inset-0 z-40 cursor-default" aria-label="Close" onclick={(e) => { e.preventDefault(); open = false; }}></button>
		<span
			role="tooltip"
			class="absolute left-1/2 top-7 z-50 w-56 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-normal leading-relaxed text-slate-200 shadow-xl"
		>
			{text}
		</span>
	{/if}
</span>
