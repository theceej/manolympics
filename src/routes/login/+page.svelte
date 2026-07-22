<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { loginPasskey, passkeysSupported } from '$lib/auth-client';

	let loading = $state(false);
	let err = $state<string | null>(null);
	const supported = passkeysSupported();

	async function signIn() {
		err = null;
		loading = true;
		try {
			await loginPasskey();
			await invalidateAll();
			await goto('/');
		} catch (e) {
			err = e instanceof Error ? e.message : 'Sign-in failed.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 px-6 py-16">
	<div class="text-center">
		<div class="text-5xl">🏅</div>
		<h1 class="mt-3 text-3xl font-black tracking-tight">Manolympics</h1>
		<p class="mt-1 text-sm text-slate-400">Sign in with your passkey.</p>
	</div>

	{#if err}
		<p class="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{err}</p>
	{/if}

	{#if !supported}
		<p class="rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-300">
			This browser doesn't support passkeys.
		</p>
	{/if}

	<button
		onclick={signIn}
		disabled={loading || !supported}
		class="rounded-xl bg-brand-600 px-4 py-3 text-center font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50"
	>
		{loading ? 'Signing in…' : 'Sign in with passkey'}
	</button>

	<p class="text-center text-sm text-slate-400">
		First time? <a href="/register" class="font-semibold text-brand-500">Create an account</a>
	</p>
</div>
