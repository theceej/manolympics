<script lang="ts">
	import '../app.css';
	import ReloadPrompt from '$components/ReloadPrompt.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Manolympics</title>
</svelte:head>

{@render children()}
<ReloadPrompt />
