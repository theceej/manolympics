<script lang="ts">
	import { enhance } from '$app/forms';
	import AttendeeChip from '$components/AttendeeChip.svelte';
	import { resizeImageToDataUrl } from '$lib/photo';
	import type { PageData } from './$types';
	import type { LayoutData } from '../$types';

	let { data }: { data: PageData & LayoutData } = $props();
	const isAdmin = $derived(data.user?.role === 'admin');

	let editing = $state<string | null>(null);
	let adding = $state(false);

	// Photo state keyed per form ('new' for the add form, attendee id for edits).
	let photos = $state<Record<string, string | null>>({});
	let photoChanged = $state<Record<string, boolean>>({});

	async function onPick(key: string, e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			photos[key] = await resizeImageToDataUrl(file);
			photoChanged[key] = true;
		} catch {
			/* ignore unreadable images */
		}
	}
	function clearPhoto(key: string) {
		photos[key] = null;
		photoChanged[key] = true;
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-black">People</h1>
	{#if isAdmin}
		<button onclick={() => (adding = !adding)} class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold">
			{adding ? 'Close' : '+ Add'}
		</button>
	{/if}
</div>

{#if adding && isAdmin}
	<form
		method="POST"
		action="?/create"
		use:enhance={() => async ({ update }) => {
			await update();
			adding = false;
			photos['new'] = null;
			photoChanged['new'] = false;
		}}
		class="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
	>
		<div class="flex items-center gap-3">
			<label class="cursor-pointer">
				<AttendeeChip name="?" photo={photos['new'] ?? null} size="lg" />
				<input type="file" accept="image/*" class="hidden" onchange={(e) => onPick('new', e)} />
			</label>
			<div class="flex-1">
				<input name="name" placeholder="Name" required class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none focus:border-brand-500" />
				<p class="mt-1 text-xs text-slate-500">Tap the circle to add a photo</p>
			</div>
		</div>
		<input type="hidden" name="photo" value={photos['new'] ?? ''} />
		<div class="flex gap-3">
			<input name="emoji" placeholder="Emoji" maxlength="2" class="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none focus:border-brand-500" />
			<input name="color" type="color" value="#3b82f6" class="h-11 w-14 rounded-lg border border-slate-700 bg-slate-900" />
			<button type="submit" class="flex-1 rounded-lg bg-brand-600 px-4 font-semibold">Save</button>
		</div>
	</form>
{/if}

<ul class="mt-4 flex flex-col gap-2">
	{#each data.attendees as a (a.id)}
		<li class="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
			{#if editing === a.id && isAdmin}
				<form
					method="POST"
					action="?/update"
					use:enhance={() => async ({ update }) => {
						await update();
						editing = null;
					}}
					class="flex flex-col gap-3"
				>
					<input type="hidden" name="id" value={a.id} />
					<div class="flex items-center gap-3">
						<label class="cursor-pointer">
							<AttendeeChip name={a.name} emoji={a.emoji} color={a.color} photo={photoChanged[a.id] ? photos[a.id] : a.photo} size="lg" />
							<input type="file" accept="image/*" class="hidden" onchange={(e) => onPick(a.id, e)} />
						</label>
						<input name="name" value={a.name} required class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
					</div>
					<input type="hidden" name="photo" value={(photoChanged[a.id] ? photos[a.id] : a.photo) ?? ''} />
					<input type="hidden" name="photoChanged" value={photoChanged[a.id] ? '1' : '0'} />
					{#if (photoChanged[a.id] ? photos[a.id] : a.photo)}
						<button type="button" onclick={() => clearPhoto(a.id)} class="self-start text-xs text-red-300">Remove photo</button>
					{/if}
					<div class="flex gap-3">
						<input name="emoji" value={a.emoji ?? ''} maxlength="2" placeholder="Emoji" class="w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5" />
						<input name="color" type="color" value={a.color ?? '#3b82f6'} class="h-11 w-14 rounded-lg border border-slate-700 bg-slate-900" />
						<button type="submit" class="flex-1 rounded-lg bg-brand-600 font-semibold">Save</button>
					</div>
					<button type="button" onclick={() => (editing = null)} class="text-sm text-slate-400">Cancel</button>
				</form>
			{:else}
				<div class="flex items-center gap-3">
					<AttendeeChip name={a.name} emoji={a.emoji} color={a.color} photo={a.photo} />
					<span class="flex-1 truncate {a.active ? '' : 'text-slate-500 line-through'}">{a.name}</span>
					{#if isAdmin}
						<button onclick={() => (editing = a.id)} class="rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-slate-200">Edit</button>
						<form method="POST" action="?/toggle" use:enhance>
							<input type="hidden" name="id" value={a.id} />
							<input type="hidden" name="active" value={a.active} />
							<button type="submit" class="rounded-lg px-2 py-1 text-sm {a.active ? 'text-amber-400' : 'text-emerald-400'}">
								{a.active ? 'Deactivate' : 'Activate'}
							</button>
						</form>
					{/if}
				</div>
			{/if}
		</li>
	{:else}
		<li class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No people yet.</li>
	{/each}
</ul>
