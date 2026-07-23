# 🏅 Manolympics

A mobile-first PWA for running an annual "manolympics" — a day of silly in-person games
with friends, scored across the last day of the Six Nations. Track scores per person per
game, crown a yearly champion, keep a hall of fame, and use it as a companion on the day
(timeline, live rugby score, pub crawl). Passkey login, self-hostable, fork-friendly.

## Features

**Core (built)**
- 🔐 **Passkey login** (WebAuthn) — no passwords. First user bootstraps as admin; others
  join with invite codes.
- 👥 **People** — one list for everyone, whether or not they've signed up. Invite someone
  straight from their row; registering links to that entry instead of creating a second one.
  Can't make it this year? Mark them out for that year — they stay on the list and keep their
  history.
- 📅 **Years** — one edition per year, with **copy games & venues from a previous year** to
  save setup time. Champion recorded per year.
- 🎯 **Games** in four shapes, all feeding one leaderboard:
  - _Individual_ — one score each
  - _Rounds_ — scores per round, summed
  - _1v1 Tournament_ — auto-drawn single-elimination bracket
  - _Teams_ — grouped scores
  - Each game is _rank → league points_ (configurable scheme, default `10,8,6,5,4,3,2,1`,
    ties shared) or _direct points_; higher- or lower-is-better (times).
- 🏆 **Live leaderboard** (sum of league points) + **Hall of Fame** of past champions.

**Coming next** (Phases 2–3, see the plan): match-day timeline, live/manual rugby score,
pub-crawl plan with map links, timer/stopwatch, random person + running-order picker, and
group expense splitting.

## Tech

SvelteKit · libSQL/SQLite via Drizzle ORM (local file **or** hosted Turso) · SimpleWebAuthn ·
Tailwind CSS · vite-plugin-pwa. Deploys as a Node server / Docker container **or** to Vercel.

## Local development

```bash
npm install
cp .env.example .env        # edit BOOTSTRAP_ADMIN_EMAIL to your email
npm run db:migrate          # creates ./data/manolympics.db
npm run dev                 # http://localhost:5173
```

Open the app, go to **Create account**, and register a passkey with the bootstrap email —
you become the admin. Add people, create a year, add games, and start scoring. To let others
in, tap **Invite to app** on their row under **People** (or generate a code under the avatar
menu → **Settings**). Your own name and photo live under **Your account**.

> Passkeys work on `localhost` out of the box. Safari/iOS need `RP_ID` and `ORIGIN` to match
> the host exactly.

## Deploy free: Vercel + Turso

The app talks to the database through **libSQL**, so the same code runs against a local
SQLite file *or* a hosted **Turso** database. Vercel (Node runtime) + Turso is a
zero-cost, zero-maintenance host.

**1. Create the database (Turso):**
```bash
turso auth signup                       # or: turso auth login
turso db create manolympics
turso db show manolympics --url         # → DATABASE_URL (libsql://…)
turso db tokens create manolympics      # → DATABASE_AUTH_TOKEN
```

**2. Apply migrations to it (from your machine, once — and after any schema change):**
```bash
DATABASE_URL='libsql://…' DATABASE_AUTH_TOKEN='…' npm run db:migrate
```

**3. Deploy to Vercel:** import the repo at vercel.com (it auto-detects SvelteKit and
picks the Vercel adapter — `ADAPTER` is auto-set). Add these **Environment Variables**:

| Var | Value |
| --- | --- |
| `DATABASE_URL` | your `libsql://…turso.io` URL |
| `DATABASE_AUTH_TOKEN` | the Turso token |
| `RP_ID` | your Vercel host, e.g. `manolympics.vercel.app` |
| `ORIGIN` | `https://manolympics.vercel.app` |
| `RP_NAME` | `Manolympics` |
| `BOOTSTRAP_ADMIN_EMAIL` | your email |

Redeploy, open the site, and **Create account** with the bootstrap email. Passkeys work on
the `*.vercel.app` domain (or set `RP_ID`/`ORIGIN` to a custom domain if you add one).

> Turso's free tier is far more than this app needs. Data is backed up by Turso; you can
> also `turso db shell manolympics .dump` for a plain SQL export.

## Self-hosting (Docker)

```bash
# Set your real host so passkeys work:
export RP_ID=mano.example.com
export ORIGIN=https://mano.example.com
export BOOTSTRAP_ADMIN_EMAIL=you@example.com

docker compose up -d --build
```

Data persists in the `manolympics-data` volume (a single SQLite file — easy to back up).
Migrations run automatically on start. Put it behind a TLS-terminating reverse proxy
(Caddy/Traefik/nginx) and set `PROTOCOL_HEADER`/`HOST_HEADER` as noted in
`docker-compose.yml`.

### Environment

| Var | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `file:/data/manolympics.db` | libSQL file path (or a `libsql://…` Turso URL) |
| `DATABASE_AUTH_TOKEN` | — | Only for a remote Turso database |
| `RP_ID` | `localhost` | Registrable domain, no scheme/port |
| `ORIGIN` | `http://localhost:3000` | Full origin (scheme + host [+ port]) |
| `RP_NAME` | `Manolympics` | Shown in the passkey prompt |
| `BOOTSTRAP_ADMIN_EMAIL` | — | First account allowed to register (becomes admin) |

## Forking for your own crew

It's designed to be copied: change `RP_NAME`, the icons in `static/icons/`, and the theme
colours in `src/app.css` / `vite.config.ts`. Everything else is data you create in-app.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / run |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm test` | Unit + integration tests |
| `npm run check` | Type-check |

## Scoring model

Every game produces a ranking of its participants; a per-year points scheme maps rank →
league points; the leaderboard sums those across all games. The engine lives in
`src/lib/server/scoring.ts` (pure, unit-tested) and `results-core.ts` (DB orchestration,
integration-tested). See `src/lib/server/*.test.ts`.

## Licence

MIT — see `LICENSE`.
