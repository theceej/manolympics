<script lang="ts">
	import { enhance } from '$app/forms';
	import AttendeeChip from '$components/AttendeeChip.svelte';
	import { fmtPoints, medalFor } from '$lib/utils';
	import type { PageData } from './$types';
	import type { LayoutData } from '../../$types';

	let { data }: { data: PageData & LayoutData } = $props();
	const isAdmin = $derived(data.user?.role === 'admin');

	const attendeeById = $derived(Object.fromEntries(data.attendees.map((a) => [a.id, a])));
	const participantAttendees = $derived(
		data.participants
			.map((p) => ({ ...p, attendee: attendeeById[p.attendeeId] }))
			.filter((p) => p.attendee)
			.sort((a, b) => a.attendee!.name.localeCompare(b.attendee!.name))
	);
	const participantIds = $derived(new Set(data.participants.map((p) => p.attendeeId)));

	const typeLabel = {
		individual: 'Individual',
		rounds: 'Rounds',
		tournament: '1v1 Tournament',
		round_robin: 'Round robin',
		team: 'Teams'
	} as const;

	// Both tournament and round-robin are played out as 1v1 matches.
	const isMatchGame = $derived(data.game.type === 'tournament' || data.game.type === 'round_robin');
	const isRoundRobin = $derived(data.game.type === 'round_robin');

	let managePeople = $state(false);

	// Group matches by round for display.
	const matchRounds = $derived(
		Object.values(
			data.matches.reduce<Record<number, typeof data.matches>>((acc, m) => {
				(acc[m.roundIndex] ??= []).push(m);
				return acc;
			}, {})
		)
	);
</script>

<div class="flex flex-col gap-6">
	<!-- Header -->
	<section>
		<a href="/games" class="text-sm text-slate-400">‹ Games</a>
		<div class="mt-1 flex items-start justify-between gap-3">
			<div>
				<h1 class="text-2xl font-black">{data.game.name}</h1>
				<p class="text-sm text-slate-400">
					{typeLabel[data.game.type]}
					{#if data.game.type !== 'tournament'}
						· {data.game.scoringMode === 'direct' ? 'direct points' : data.game.higherIsBetter ? 'higher wins' : 'lower wins'}
					{/if}
				</p>
			</div>
		</div>
		{#if data.game.description}<p class="mt-2 text-sm text-slate-300">{data.game.description}</p>{/if}

		{#if isAdmin}
			<form method="POST" action="?/setStatus" use:enhance class="mt-3 flex gap-2">
				{#each ['setup', 'live', 'final'] as s (s)}
					<button
						name="status"
						value={s}
						class="rounded-full px-3 py-1 text-xs font-semibold capitalize {data.game.status === s ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'}"
					>{s}</button>
				{/each}
			</form>
		{/if}
	</section>

	<!-- Standings for this game -->
	<section class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<h2 class="mb-3 font-bold">Standings</h2>
		{#if data.results.length === 0}
			<p class="text-sm text-slate-400">No results yet.</p>
		{:else}
			<ol class="flex flex-col gap-2">
				{#each data.results as r (r.attendeeId)}
					<li class="flex items-center gap-3">
						<span class="w-6 text-center">{medalFor(r.rank) ?? r.rank}</span>
						{#if r.attendee}
							<AttendeeChip name={r.attendee.name} emoji={r.attendee.emoji} color={r.attendee.color} photo={r.attendee.photo} size="sm" />
							<span class="flex-1 truncate">{r.attendee.name}</span>
						{:else}<span class="flex-1 text-slate-500">—</span>{/if}
						{#if r.rawValue !== null}<span class="text-sm text-slate-400 tabular-nums">{r.rawValue}</span>{/if}
						<span class="w-12 text-right font-bold tabular-nums">{fmtPoints(r.leaguePoints)}</span>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<!-- People management (admin) -->
	{#if isAdmin}
		<section class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<button onclick={() => (managePeople = !managePeople)} class="flex w-full items-center justify-between font-bold">
				<span>Who's playing ({data.participants.length})</span>
				<span class="text-slate-500">{managePeople ? '−' : '+'}</span>
			</button>
			{#if managePeople}
				<ul class="mt-3 flex flex-col gap-1">
					{#each data.attendees.filter((a) => a.active || participantIds.has(a.id)) as a (a.id)}
						<li>
							<form method="POST" action="?/toggleParticipant" use:enhance class="flex items-center gap-3">
								<input type="hidden" name="attendeeId" value={a.id} />
								<input type="hidden" name="on" value={!participantIds.has(a.id)} />
								<AttendeeChip name={a.name} emoji={a.emoji} color={a.color} photo={a.photo} size="sm" />
								<span class="flex-1">{a.name}</span>
								<button class="rounded-lg px-2 py-1 text-sm {participantIds.has(a.id) ? 'text-emerald-400' : 'text-slate-500'}">
									{participantIds.has(a.id) ? 'In' : 'Out'}
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	<!-- Score entry -->
	{#if isMatchGame}
		<section class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="font-bold">{isRoundRobin ? 'Fixtures' : 'Bracket'}</h2>
				{#if isAdmin}
					<form method="POST" action="?/generateBracket" use:enhance>
						<button class="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold">
							{data.matches.length ? 'Re-draw' : isRoundRobin ? 'Generate fixtures' : 'Draw bracket'}
						</button>
					</form>
				{/if}
			</div>
			{#if data.matches.length === 0}
				<p class="text-sm text-slate-400">
					{isRoundRobin ? 'Generate fixtures to begin — everyone plays everyone once (needs at least 2 players).' : 'Draw the bracket to begin (needs at least 2 players).'}
				</p>
			{:else}
				<div class="flex flex-col gap-4">
					{#each matchRounds as roundMatches (roundMatches[0].roundIndex)}
						<div>
							<h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{roundMatches[0].roundName}</h3>
							<div class="flex flex-col gap-2">
								{#each roundMatches as m (m.id)}
									{@const a = m.aAttendeeId ? attendeeById[m.aAttendeeId] : null}
									{@const b = m.bAttendeeId ? attendeeById[m.bAttendeeId] : null}
									<form method="POST" action="?/recordMatch" use:enhance class="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
										<input type="hidden" name="matchId" value={m.id} />
										<div class="flex flex-col gap-2">
											{#each [{ p: a, who: 'a' }, { p: b, who: 'b' }] as side (side.who)}
												<div class="flex items-center gap-2 {m.winnerAttendeeId && m.winnerAttendeeId === side.p?.id ? 'font-bold text-emerald-400' : ''}">
													{#if side.p}
														<AttendeeChip name={side.p.name} emoji={side.p.emoji} color={side.p.color} photo={side.p.photo} size="sm" />
														<span class="flex-1 truncate">{side.p.name}</span>
														<input name={side.who === 'a' ? 'aScore' : 'bScore'} type="number" inputmode="numeric" value={(side.who === 'a' ? m.aScore : m.bScore) ?? ''} placeholder="–" class="w-14 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center" />
													{:else}
														<span class="flex-1 text-slate-600">TBD</span>
													{/if}
												</div>
											{/each}
										</div>
										{#if a && b}
											<div class="mt-2 flex gap-2">
												<button name="winner" value={a.id} class="flex-1 rounded-lg bg-slate-800 py-1.5 text-sm font-semibold {m.winnerAttendeeId === a.id ? 'ring-2 ring-emerald-500' : ''}">{a.name} wins</button>
												<button name="winner" value={b.id} class="flex-1 rounded-lg bg-slate-800 py-1.5 text-sm font-semibold {m.winnerAttendeeId === b.id ? 'ring-2 ring-emerald-500' : ''}">{b.name} wins</button>
											</div>
										{/if}
									</form>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{:else}
		<!-- individual / rounds / team score grid -->
		<form method="POST" action="?/saveScores" use:enhance class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
			<h2 class="mb-3 font-bold">Enter scores</h2>
			{#if participantAttendees.length === 0}
				<p class="text-sm text-slate-400">No participants yet{isAdmin ? ' — add people above.' : '.'}</p>
			{:else if data.game.type === 'rounds'}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="text-slate-400">
								<th class="pb-2 text-left font-medium">Player</th>
								{#each data.rounds as r (r.id)}<th class="pb-2 px-1 text-center font-medium">{r.name}</th>{/each}
							</tr>
						</thead>
						<tbody>
							{#each participantAttendees as p (p.attendeeId)}
								<tr>
									<td class="py-1 pr-2">{p.attendee!.name}</td>
									{#each data.rounds as r (r.id)}
										<td class="px-1 py-1">
											<input name={`s:${p.attendeeId}:${r.id}`} type="number" inputmode="decimal" value={data.scoreMap[`${p.attendeeId}:${r.id}`] ?? ''} class="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-center" />
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if data.rounds.length === 0}
					<p class="mt-2 text-sm text-amber-300">Add a round below first.</p>
				{/if}
			{:else}
				<div class="flex flex-col gap-2">
					{#each participantAttendees as p (p.attendeeId)}
						<div class="flex items-center gap-3">
							<AttendeeChip name={p.attendee!.name} emoji={p.attendee!.emoji} color={p.attendee!.color} photo={p.attendee!.photo} size="sm" />
							<span class="flex-1 truncate">{p.attendee!.name}</span>
							{#if data.game.type === 'team'}
								<input name={`t:${p.attendeeId}`} value={p.team ?? ''} placeholder="Team" class="w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm" />
							{/if}
							<input name={`s:${p.attendeeId}:`} type="number" inputmode="decimal" value={data.scoreMap[`${p.attendeeId}:`] ?? ''} placeholder="–" class="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-center" />
						</div>
					{/each}
				</div>
			{/if}

			{#if participantAttendees.length > 0}
				<div class="mt-4 flex gap-2">
					<button type="submit" class="flex-1 rounded-xl bg-brand-600 py-2.5 font-semibold">Save scores</button>
					{#if data.game.type === 'team'}
						<button type="submit" formaction="?/saveTeams" class="rounded-xl bg-slate-800 px-4 py-2.5 font-semibold">Save teams</button>
					{/if}
				</div>
			{/if}
		</form>

		{#if data.game.type === 'rounds' && isAdmin}
			<section class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
				<h2 class="mb-3 font-bold">Rounds</h2>
				<ul class="mb-3 flex flex-col gap-1">
					{#each data.rounds as r (r.id)}
						<li class="flex items-center justify-between">
							<span>{r.name}</span>
							<form method="POST" action="?/deleteRound" use:enhance>
								<input type="hidden" name="id" value={r.id} />
								<button class="text-sm text-red-300">Remove</button>
							</form>
						</li>
					{/each}
				</ul>
				<form method="POST" action="?/addRound" use:enhance={() => async ({ update }) => update({ reset: true })} class="flex gap-2">
					<input name="name" placeholder="Round name (e.g. Round 1)" required class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2" />
					<button class="rounded-lg bg-slate-800 px-4 font-semibold">Add</button>
				</form>
			</section>
		{/if}
	{/if}
</div>
