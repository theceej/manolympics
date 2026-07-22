<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { passkeysSupported, registerPasskey } from '$lib/auth-client';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let email = $state('');
	let displayName = $state('');
	let invite = $state('');
	let loading = $state(false);
	let err = $state<string | null>(null);
	const supported = passkeysSupported();

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		err = null;
		loading = true;
		try {
			await registerPasskey({ email, displayName, invite: invite || undefined });
			await invalidateAll();
			await goto('/');
		} catch (e) {
			err = e instanceof Error ? e.message : 'Registration failed.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 px-6 py-16">
	<div class="text-center">
		<div class="text-5xl">🏅</div>
		<h1 class="mt-3 text-3xl font-black tracking-tight">Create account</h1>
		<p class="mt-1 text-sm text-slate-400">
			{#if data.isBootstrap}
				You'll be the first admin.
			{:else}
				Enter your invite code to join.
			{/if}
		</p>
	</div>

	{#if err}
		<p class="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{err}</p>
	{/if}

	<form onsubmit={submit} class="flex flex-col gap-4">
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Display name</span>
			<input
				bind:value={displayName}
				required
				autocomplete="name"
				class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none focus:border-brand-500"
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Email</span>
			<input
				bind:value={email}
				type="email"
				required
				autocomplete="email"
				class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none focus:border-brand-500"
			/>
		</label>
		{#if !data.isBootstrap}
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-slate-300">Invite code</span>
				<input
					bind:value={invite}
					required
					class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 uppercase outline-none focus:border-brand-500"
				/>
			</label>
		{/if}

		<button
			type="submit"
			disabled={loading || !supported}
			class="mt-2 rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50"
		>
			{loading ? 'Creating…' : 'Create passkey'}
		</button>
	</form>

	<p class="text-center text-sm text-slate-400">
		Already have one? <a href="/login" class="font-semibold text-brand-500">Sign in</a>
	</p>
</div>
