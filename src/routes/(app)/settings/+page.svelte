<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: { code?: string } | null } = $props();
</script>

<h1 class="text-2xl font-black">Settings</h1>

<section class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
	<h2 class="mb-3 font-bold">Invite codes</h2>
	{#if form?.code}
		<p class="mb-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
			New code: <span class="font-mono font-bold tracking-widest">{form.code}</span> — share it to let someone register.
		</p>
	{/if}
	<form method="POST" action="?/invite" use:enhance class="flex gap-2">
		<select name="role" class="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
			<option value="member">Member</option>
			<option value="admin">Admin</option>
		</select>
		<button class="flex-1 rounded-lg bg-brand-600 px-4 py-2 font-semibold">Generate invite</button>
	</form>

	{#if data.invites.length > 0}
		<ul class="mt-3 flex flex-col gap-1">
			{#each data.invites as inv (inv.code)}
				<li class="flex items-center gap-2 text-sm">
					<span class="font-mono font-bold tracking-widest">{inv.code}</span>
					<span class="rounded bg-slate-800 px-1.5 py-0.5 text-xs">{inv.role}</span>
					<span class="flex-1"></span>
					<form method="POST" action="?/revoke" use:enhance>
						<input type="hidden" name="code" value={inv.code} />
						<button class="text-red-300">Revoke</button>
					</form>
				</li>
			{/each}
		</ul>
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
