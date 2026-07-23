<script lang="ts">
	import { enhance } from '$app/forms';
	import { copyInvite, shareInvite, whatsappInvite } from '$lib/invite';
	import type { PageData } from './$types';

	let {
		data,
		form
	}: { data: PageData; form: { code?: string; inviteFor?: string | null; error?: string } | null } =
		$props();

	let copied = $state<string | null>(null);

	async function copy(code: string) {
		if (await copyInvite(code)) {
			copied = code;
			setTimeout(() => (copied === code ? (copied = null) : null), 1500);
		}
	}
</script>

<h1 class="text-2xl font-black">Settings</h1>

<section class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
	<h2 class="mb-3 font-bold">Invite codes</h2>

	{#if form?.error}
		<p class="mb-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{form.error}</p>
	{/if}

	{#if form?.code}
		<div class="mb-3 rounded-xl bg-emerald-500/10 p-3">
			<p class="text-sm text-emerald-300">
				New invite{form.inviteFor ? ` for ${form.inviteFor}` : ''}:
				<span class="font-mono font-bold tracking-widest">{form.code}</span>
			</p>
			<div class="mt-2 flex flex-wrap gap-2">
				<button onclick={() => shareInvite(form!.code!, form!.inviteFor)} class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold">📤 Share link</button>
				<button onclick={() => whatsappInvite(form!.code!, form!.inviteFor)} class="rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-black">WhatsApp</button>
				<button onclick={() => copy(form!.code!)} class="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold">{copied === form.code ? 'Copied!' : 'Copy link'}</button>
			</div>
		</div>
	{/if}

	<form method="POST" action="?/invite" use:enhance class="flex flex-col gap-2">
		<select name="attendeeId" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
			<option value="">Someone new (adds them to People)</option>
			{#each data.people as p (p.id)}
				<option value={p.id}>{p.name}</option>
			{/each}
		</select>
		<div class="flex gap-2">
			<select name="role" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
				<option value="member">Member</option>
				<option value="admin">Admin</option>
			</select>
			<button class="flex-1 rounded-lg bg-brand-600 px-4 py-2 font-semibold">Generate invite</button>
		</div>
	</form>
	<p class="mt-2 text-xs text-slate-500">
		Signing up always lands on the People list — pick a name above to link the code to someone
		who's already there.
	</p>

	{#if data.invites.length > 0}
		<ul class="mt-4 flex flex-col gap-3">
			{#each data.invites as inv (inv.code)}
				<li class="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
					<div class="flex items-center gap-2">
						<span class="font-mono font-bold tracking-widest">{inv.code}</span>
						<span class="rounded bg-slate-800 px-1.5 py-0.5 text-xs">{inv.role}</span>
						{#if inv.forName}
							<span class="truncate text-xs text-slate-400">for {inv.forName}</span>
						{/if}
						<span class="flex-1"></span>
						<form method="POST" action="?/revoke" use:enhance>
							<input type="hidden" name="code" value={inv.code} />
							<button class="text-xs text-red-300">Revoke</button>
						</form>
					</div>
					<div class="mt-2 flex flex-wrap gap-2">
						<button onclick={() => shareInvite(inv.code, inv.forName)} class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold">📤 Share link</button>
						<button onclick={() => whatsappInvite(inv.code, inv.forName)} class="rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-black">WhatsApp</button>
						<button onclick={() => copy(inv.code)} class="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold">{copied === inv.code ? 'Copied!' : 'Copy link'}</button>
					</div>
				</li>
			{/each}
		</ul>
		<p class="mt-3 text-xs text-slate-500">The link opens the sign-up page with the code already filled in. Each code works once.</p>
	{/if}
</section>

<section class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
	<h2 class="mb-3 font-bold">People with logins</h2>
	<ul class="flex flex-col gap-2">
		{#each data.users as u (u.id)}
			<li class="flex items-center gap-2 text-sm">
				<span class="flex-1 truncate">{u.displayName} <span class="text-slate-500">· {u.email}</span></span>
				<form method="POST" action="?/setRole" use:enhance>
					<input type="hidden" name="userId" value={u.id} />
					<select name="role" value={u.role} onchange={(e) => e.currentTarget.form?.requestSubmit()} class="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1">
						<option value="member">member</option>
						<option value="admin">admin</option>
					</select>
				</form>
			</li>
		{/each}
	</ul>
</section>
