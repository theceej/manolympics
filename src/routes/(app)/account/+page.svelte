<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AttendeeChip from '$components/AttendeeChip.svelte';
	import { resizeImageToDataUrl } from '$lib/photo';
	import type { PageData } from './$types';
	import type { LayoutData } from '../$types';

	let {
		data,
		form
	}: { data: PageData & LayoutData; form: { success?: boolean; error?: string } | null } = $props();

	let photo = $state<string | null>(null);
	let photoChanged = $state(false);
	const shownPhoto = $derived(photoChanged ? photo : (data.me?.photo ?? null));

	async function onPick(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			photo = await resizeImageToDataUrl(file);
			photoChanged = true;
		} catch {
			/* ignore unreadable images */
		}
	}
</script>

<h1 class="text-2xl font-black">Your account</h1>

<form
	method="POST"
	action="?/save"
	use:enhance={() => async ({ update }) => {
		await update({ reset: false });
		photoChanged = false;
		// Refresh the header avatar/name straight away.
		await invalidateAll();
	}}
	class="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
>
	<div class="flex items-center gap-3">
		{#if data.me}
			<label class="cursor-pointer">
				<AttendeeChip name={data.me.name} emoji={data.me.emoji} color={data.me.color} photo={shownPhoto} size="lg" />
				<input type="file" accept="image/*" class="hidden" onchange={onPick} />
			</label>
		{/if}
		<div class="flex-1">
			<label for="name" class="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</label>
			<input
				id="name"
				name="name"
				value={data.user?.displayName ?? ''}
				required
				class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none focus:border-brand-500"
			/>
			{#if data.me}
				<p class="mt-1 text-xs text-slate-500">Tap the circle to change your photo</p>
			{/if}
		</div>
	</div>

	{#if data.me}
		<input type="hidden" name="photo" value={shownPhoto ?? ''} />
		<input type="hidden" name="photoChanged" value={photoChanged ? '1' : '0'} />
		<div class="flex gap-3">
			<input name="emoji" value={data.me.emoji ?? ''} maxlength="2" placeholder="Emoji" class="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
			<input name="color" type="color" value={data.me.color ?? '#3b82f6'} class="h-11 w-14 rounded-lg border border-slate-700 bg-slate-900" />
			<button type="submit" class="flex-1 rounded-lg bg-brand-600 px-4 font-semibold">Save</button>
		</div>
	{:else}
		<button type="submit" class="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold">Save</button>
	{/if}

	{#if form?.error}
		<p class="text-sm text-red-300">{form.error}</p>
	{:else if form?.success}
		<p class="text-sm text-emerald-300">Saved.</p>
	{/if}
</form>

<p class="mt-3 px-1 text-xs text-slate-500">
	Signed in as {data.user?.email}
	{#if data.me}
		· your name on the People list changes with it
	{/if}
</p>
