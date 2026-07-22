import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Pick the adapter by target:
//   ADAPTER=vercel  → Vercel (also auto-selected when building on Vercel)
//   ADAPTER=node    → Node server / Docker (Option A, the default)
const target = process.env.ADAPTER ?? (process.env.VERCEL ? 'vercel' : 'node');
const adapter = target === 'vercel' ? adapterVercel() : adapterNode();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter,
		alias: {
			$components: 'src/lib/components',
			$server: 'src/lib/server'
		}
	}
};

export default config;
