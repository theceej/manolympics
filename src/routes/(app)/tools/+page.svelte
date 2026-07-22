<script lang="ts">
	import { onDestroy } from 'svelte';

	type Mode = 'stopwatch' | 'countdown';
	let mode = $state<Mode>('stopwatch');

	let running = $state(false);
	let elapsed = $state(0); // ms counted so far
	let startTs = 0;
	let raf: ReturnType<typeof setInterval> | null = null;
	let laps = $state<number[]>([]);

	// Countdown target in ms.
	let targetMs = $state(60_000);
	let finished = $state(false);

	// Screen wake lock so the phone doesn't sleep mid-game.
	let wakeLock: WakeLockSentinel | null = null;
	async function acquireWake() {
		try {
			if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
		} catch {
			/* ignore */
		}
	}
	function releaseWake() {
		wakeLock?.release().catch(() => {});
		wakeLock = null;
	}

	function tick() {
		const now = performance.now();
		elapsed = now - startTs;
		if (mode === 'countdown' && elapsed >= targetMs) {
			elapsed = targetMs;
			stop();
			finished = true;
			buzz();
		}
	}

	function start() {
		if (running) return;
		finished = false;
		startTs = performance.now() - elapsed;
		running = true;
		acquireWake();
		raf = setInterval(tick, 50);
	}
	function stop() {
		running = false;
		if (raf) clearInterval(raf);
		raf = null;
		releaseWake();
	}
	function reset() {
		stop();
		elapsed = 0;
		laps = [];
		finished = false;
	}
	function lap() {
		if (running && mode === 'stopwatch') laps = [elapsed, ...laps];
	}

	function buzz() {
		if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400]);
		try {
			const ctx = new AudioContext();
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			o.connect(g);
			g.connect(ctx.destination);
			o.frequency.value = 880;
			o.start();
			g.gain.setValueAtTime(0.3, ctx.currentTime);
			g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
			o.stop(ctx.currentTime + 1);
		} catch {
			/* ignore */
		}
	}

	function switchMode(m: Mode) {
		reset();
		mode = m;
	}

	function setCountdown(seconds: number) {
		reset();
		targetMs = seconds * 1000;
	}

	const display = $derived(mode === 'countdown' ? Math.max(0, targetMs - elapsed) : elapsed);
	function fmt(ms: number): string {
		const cs = Math.floor((ms % 1000) / 10);
		const s = Math.floor(ms / 1000) % 60;
		const m = Math.floor(ms / 60000);
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
	}

	onDestroy(() => {
		if (raf) clearInterval(raf);
		releaseWake();
	});
</script>

<div class="flex rounded-xl bg-slate-900 p-1">
	<button onclick={() => switchMode('stopwatch')} class="flex-1 rounded-lg py-2 text-sm font-semibold {mode === 'stopwatch' ? 'bg-slate-700' : 'text-slate-400'}">Stopwatch</button>
	<button onclick={() => switchMode('countdown')} class="flex-1 rounded-lg py-2 text-sm font-semibold {mode === 'countdown' ? 'bg-slate-700' : 'text-slate-400'}">Countdown</button>
</div>

<div class="mt-8 text-center">
	<div class="font-mono text-6xl font-black tabular-nums {finished ? 'text-emerald-400' : ''}">{fmt(display)}</div>
	{#if finished}<p class="mt-2 font-semibold text-emerald-400">Time!</p>{/if}
</div>

{#if mode === 'countdown' && !running && elapsed === 0}
	<div class="mt-6 flex flex-wrap justify-center gap-2">
		{#each [30, 60, 120, 180, 300] as s (s)}
			<button onclick={() => setCountdown(s)} class="rounded-lg border border-slate-700 px-3 py-2 text-sm {targetMs === s * 1000 ? 'border-brand-500 text-brand-300' : 'text-slate-300'}">
				{s < 60 ? `${s}s` : `${s / 60}m`}
			</button>
		{/each}
	</div>
{/if}

<div class="mt-8 flex justify-center gap-3">
	{#if !running}
		<button onclick={start} class="rounded-full bg-emerald-600 px-10 py-4 text-lg font-bold active:scale-95">Start</button>
	{:else}
		<button onclick={stop} class="rounded-full bg-amber-600 px-10 py-4 text-lg font-bold active:scale-95">Pause</button>
	{/if}
	{#if mode === 'stopwatch' && running}
		<button onclick={lap} class="rounded-full bg-slate-700 px-6 py-4 text-lg font-bold active:scale-95">Lap</button>
	{/if}
	<button onclick={reset} class="rounded-full bg-slate-800 px-6 py-4 text-lg font-bold active:scale-95">Reset</button>
</div>

{#if laps.length}
	<ol class="mx-auto mt-8 max-w-xs">
		{#each laps as l, i (i)}
			<li class="flex justify-between border-b border-slate-800 py-2 text-sm">
				<span class="text-slate-400">Lap {laps.length - i}</span>
				<span class="font-mono tabular-nums">{fmt(l)}</span>
			</li>
		{/each}
	</ol>
{/if}
