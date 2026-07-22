<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

	// Prompts the user to reload when a new service-worker version is available.
	const { needRefresh, updateServiceWorker } = useRegisterSW({
		onRegisteredSW(swUrl) {
			console.log(`SW registered: ${swUrl}`);
		}
	});
</script>

{#if $needRefresh}
	<div
		class="pb-safe fixed inset-x-0 bottom-16 z-50 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-xl bg-brand-600 px-4 py-3 text-sm shadow-lg"
	>
		<span>A new version is available.</span>
		<button
			class="rounded-lg bg-white/20 px-3 py-1 font-semibold"
			onclick={() => updateServiceWorker(true)}>Reload</button
		>
	</div>
{/if}
