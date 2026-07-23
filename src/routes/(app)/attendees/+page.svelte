<script lang="ts">
	import { enhance } from '$app/forms';
	import AttendeeChip from '$components/AttendeeChip.svelte';
	import InfoTip from '$components/InfoTip.svelte';
	import { copyInvite, shareInvite, whatsappInvite } from '$lib/invite';
	import { resizeImageToDataUrl } from '$lib/photo';
	import type { PageData } from './$types';
	import type { LayoutData } from '../$types';

	let {
		data,
		form
	}: {
		data: PageData & LayoutData;
		form: { code?: string; inviteFor?: string; error?: string } | null;
	} = $props();

	const isAdmin = $derived(data.user?.role === 'admin');
	const year = $derived(data.currentEdition?.year);
	const coming = $derived(data.attendees.filter((a) => a.here).length);

	let editing = $state<string | null>(null);
	let adding = $state(false);
	let showArchived = $state(false);
	let copied = $state(false);

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
	async function onCopy(code: string) {
		copied = await copyInvite(code);
		setTimeout(() => (copied = false), 1500);
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

<p class="mt-1 flex items-center gap-1 text-sm text-slate-400">
	{#if year}
		{coming} coming in {year}
	{:else}
		{coming} on the list
	{/if}
	<InfoTip text="One list for everyone. Add a person first, then invite them to set up a login — they'll link to the same entry. If someone can't make a year, mark them out for that year instead of removing them." />
</p>

{#if form?.error}
	<p class="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{form.error}</p>
{/if}

{#if form?.code}
	<div class="mt-3 rounded-xl bg-emerald-500/10 p-3">
		<p class="text-sm text-emerald-300">
			Invite for <span class="font-semibold">{form.inviteFor}</span>:
			<span class="font-mono font-bold tracking-widest">{form.code}</span>
		</p>
		<div class="mt-2 flex flex-wrap gap-2">
			<button onclick={() => shareInvite(form!.code!, form!.inviteFor)} class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold">📤 Share link</button>
			<button onclick={() => whatsappInvite(form!.code!, form!.inviteFor)} class="rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-black">WhatsApp</button>
			<button onclick={() => onCopy(form!.code!)} class="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold">{copied ? 'Copied!' : 'Copy link'}</button>
		</div>
	</div>
{/if}

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
	{#each data.attendees.filter((a) => a.active || showArchived) as a (a.id)}
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
					<div class="flex-1 truncate">
						<span class={a.here ? '' : 'text-slate-500'}>{a.name}</span>
						{#if !a.active}
							<span class="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-400">archived</span>
						{:else if a.absent}
							<span class="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-300">out{year ? ` for ${year}` : ''}</span>
						{/if}
						{#if a.loginEmail}
							<span class="ml-1 text-[11px] text-slate-500">🔑</span>
						{/if}
					</div>
					{#if isAdmin}
						<button onclick={() => (editing = a.id)} class="rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-slate-200">Edit</button>
					{/if}
				</div>

				{#if isAdmin}
					<div class="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2 text-sm">
						{#if a.active && data.currentEdition}
							<form method="POST" action="?/attending" use:enhance>
								<input type="hidden" name="id" value={a.id} />
								<input type="hidden" name="attending" value={a.absent} />
								<button type="submit" class="rounded-lg bg-slate-800 px-2.5 py-1 {a.absent ? 'text-emerald-300' : 'text-amber-300'}">
									{a.absent ? `Back in for ${year}` : `Can't make ${year}`}
								</button>
							</form>
						{/if}
						{#if !a.loginEmail && a.active}
							<form method="POST" action="?/invite" use:enhance>
								<input type="hidden" name="id" value={a.id} />
								<button type="submit" class="rounded-lg bg-slate-800 px-2.5 py-1 text-brand-300">Invite to app</button>
							</form>
						{/if}
						<form method="POST" action="?/toggle" use:enhance class="ml-auto">
							<input type="hidden" name="id" value={a.id} />
							<input type="hidden" name="active" value={a.active} />
							<button type="submit" class="rounded-lg px-2 py-1 text-xs {a.active ? 'text-slate-500 hover:text-red-300' : 'text-emerald-400'}">
								{a.active ? 'Archive' : 'Restore'}
							</button>
						</form>
					</div>
				{/if}
			{/if}
		</li>
	{:else}
		<li class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No people yet.</li>
	{/each}
</ul>

{#if data.attendees.some((a) => !a.active)}
	<button onclick={() => (showArchived = !showArchived)} class="mt-3 w-full rounded-xl border border-slate-800 py-2 text-sm text-slate-400">
		{showArchived ? 'Hide' : 'Show'} archived people
	</button>
{/if}
