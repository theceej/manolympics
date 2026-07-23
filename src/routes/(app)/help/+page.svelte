<script lang="ts">
	import type { LayoutData } from '../$types';
	let { data }: { data: LayoutData } = $props();
	const isAdmin = $derived(data.user?.role === 'admin');
</script>

<h1 class="text-2xl font-black">How it works</h1>
<p class="mt-1 text-sm text-slate-400">Everything you need to run and enjoy the day.</p>

<div class="mt-4 flex flex-col gap-2">
	<details open class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<summary class="cursor-pointer font-bold">🔐 Signing in</summary>
		<div class="mt-2 space-y-2 text-sm text-slate-300">
			<p>We use <strong>passkeys</strong> — no passwords. You sign in with your phone or laptop's Face&nbsp;ID, fingerprint, or PIN.</p>
			<p>The first person to register becomes the <strong>admin</strong>. After that, everyone joins with an <strong>invite code</strong> an admin generates.</p>
			<p>Signing up puts you straight on the <strong>People</strong> list — or links you to your existing entry if you're already on it. Nobody has to be added twice.</p>
			<p>Change your name or photo any time under the avatar menu → <strong>Your account</strong>.</p>
			<p>Sign in on each device you want to use — you can add a passkey per device.</p>
		</div>
	</details>

	<details class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<summary class="cursor-pointer font-bold">👥 Who can do what</summary>
		<div class="mt-2 space-y-2 text-sm text-slate-300">
			<p><strong>Admins</strong> set things up: people, years, games, venues, invite codes and settings.</p>
			<p><strong>Everyone signed in</strong> can view all standings and <strong>enter scores/results</strong> during the day — so anyone can help keep score.</p>
		</div>
	</details>

	<details class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<summary class="cursor-pointer font-bold">🏆 How scoring works</summary>
		<div class="mt-2 space-y-2 text-sm text-slate-300">
			<p>Every game produces a <strong>ranking</strong> of its players. That rank is turned into <strong>league points</strong> using the year's points scheme — by default <strong>10, 8, 6, 5, 4, 3, 2, 1</strong> for 1st, 2nd, 3rd… (ties share the average).</p>
			<p>The <strong>Leaderboard</strong> is simply everyone's league points added up across all games. Whoever's on top at the end is the year's champion.</p>
			<p class="text-slate-400">Some games use <em>direct points</em> instead, where the number you enter is the points.</p>
		</div>
	</details>

	<details class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<summary class="cursor-pointer font-bold">🎯 Game types</summary>
		<ul class="mt-2 space-y-2 text-sm text-slate-300">
			<li><strong>Individual</strong> — one score each (e.g. Skittles). Highest (or fastest) wins.</li>
			<li><strong>Rounds</strong> — a score per round, added up (e.g. Mario Kart: points per race).</li>
			<li><strong>1v1 Tournament</strong> — an auto-drawn knockout bracket; tap the winner of each match.</li>
			<li><strong>Round robin</strong> — everyone plays everyone once; most wins wins (e.g. Beer Pong, Darts, Pool). Tap the winner of each fixture.</li>
			<li><strong>Teams</strong> — players grouped into teams, ranked by combined score.</li>
		</ul>
	</details>

	<details class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<summary class="cursor-pointer font-bold">🍻 Match day</summary>
		<ul class="mt-2 space-y-2 text-sm text-slate-300">
			<li><strong>Timeline</strong> — games, rugby kick-offs and food/drink stops, all in time order.</li>
			<li><strong>Rugby</strong> — live Six Nations scores (tap “Live sync”), or enter them by hand. Manual scores are never overwritten.</li>
			<li><strong>Venues</strong> — the pub crawl and meal stops, each with a map link.</li>
		</ul>
	</details>

	<details class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
		<summary class="cursor-pointer font-bold">🎲 Tools</summary>
		<ul class="mt-2 space-y-2 text-sm text-slate-300">
			<li><strong>Timer</strong> — a stopwatch and countdown (keeps the screen awake).</li>
			<li><strong>Random</strong> — pick a random person, or shuffle a running order.</li>
			<li><strong>Money</strong> — log shared expenses; it works out the fewest payments to settle up.</li>
		</ul>
	</details>

	{#if isAdmin}
		<details class="rounded-2xl border border-brand-700/40 bg-brand-600/5 p-4">
			<summary class="cursor-pointer font-bold text-brand-200">⚙️ Admin: setting up a year</summary>
			<ol class="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-300">
				<li>Create the year under <strong>Years</strong> (or copy games from a previous year to save time).</li>
				<li>Add everyone under <strong>People</strong> (photos optional), then tap <strong>Invite to app</strong> on each of them so they can join and help score.</li>
				<li>Anyone who can't make it this year: tap <strong>“Can't make [year]”</strong> on their row — they stay on the list and keep their history, they're just left out of this year's games.</li>
				<li>Add games — or tap <strong>“Add our usual games”</strong> for the regulars.</li>
				<li>Add venues and the day's timeline under <strong>Day</strong>.</li>
				<li>On the day: open a game, set it <strong>Live</strong>, and score away. Set <strong>Final</strong> when done.</li>
			</ol>
			<p class="mt-2 text-sm text-slate-400">Old years with no per-game data? Add them under Years → <em>Enter past results</em>.</p>
			<p class="mt-2 text-sm text-slate-400">Someone gone for good? <strong>Archive</strong> them instead — their past results stay put.</p>
		</details>
	{/if}
</div>
