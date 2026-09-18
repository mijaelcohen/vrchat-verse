# VRChatVerse

An interactive 3D "starfield" that visualizes a curated set of VRChat worlds as stars in
explorable space — position encodes thematic similarity (tag-based clusters form visible
constellations), 

All VRChat authentication happens in a once-daily GitHub Actions job — the web app and its API
routes never talk to VRChat directly, and no VRChat credentials ever reach the browser.

## Stack

- **App:** Next.js 16 (App Router) + React 19, deployed on Vercel (free/Hobby tier)
- **3D:** Three.js via `@react-three/fiber` + `@react-three/drei`
- **DB:** Postgres (Neon free tier) via Prisma 7 (`@prisma/adapter-pg`)
- **Daily sync:** a standalone script (`scripts/sync.ts`) run by a GitHub Actions cron workflow —
  not a Vercel function, so it isn't bound by Vercel's execution-time limits while it paginates
  VRChat's API at a conservative pace
- **Embedding/clustering:** pure JS/TS (`umap-js` + `ml-kmeans`) over tag-based feature vectors —
  no Python runtime, no paid embedding API

## Local setup

```bash
pnpm install
cp .env.example .env   # fill in real values — see below
pnpm exec prisma migrate dev --name init   # first time only
pnpm dev
```

### Environment variables (`.env`)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. Used by the app, the sync script, and migrations. |
| `SHADOW_DATABASE_URL` | Optional — a second empty database `prisma migrate dev` uses for drift detection. Leave unset to let Prisma manage a scratch DB automatically. |
| `VRCHAT_USERNAME` / `VRCHAT_PASSWORD` | Credentials for a **dedicated VRChat service account** — never your personal account. |
| `VRCHAT_TOTP_SECRET` | Base32 TOTP secret from enabling authenticator-app 2FA on that service account. |
| `VRCHAT_USER_AGENT` | Sent on every VRChat API call, per VRChat's own usage guidance — include real contact info. |
| `SESSION_ENCRYPTION_KEY` | AES-256-GCM key encrypting the persisted VRChat session cookie at rest. Generate with `openssl rand -base64 32`. |

### Running the sync locally

```bash
pnpm run sync              # full sync (fetch + upsert + embed/cluster/score)
pnpm exec tsx scripts/sync.ts --auth-only   # just verify VRChat login/TOTP works
```

`lib/config.ts` controls corpus size, request pacing, embedding/clustering parameters, and
scoring weights — tune there rather than hardcoding values elsewhere.

There's also a throwaway `scripts/seed-fake.ts` that inserts procedurally-generated fake worlds
and runs the real embedding/clustering pipeline against them — useful for checking the frontend
without a live VRChat account. Not part of the shipped app.

## Deployment

**You'll need to do these yourself** (account creation / secrets can't be scripted):

1. Create a [Neon](https://neon.tech) project (free tier) and copy its connection string.
2. Create a Vercel project, import this repo, and set `DATABASE_URL` in its environment
   variables (Production + Preview) — nothing else needs to be set there.
3. Create a dedicated VRChat account for the sync job. Enable Two-Factor Authentication with an
   **authenticator app (TOTP)**, not email OTP, and capture the base32 secret shown at setup time
   (it's usually shown only once).
4. Push this repo to GitHub, then add these as repo secrets (Settings → Secrets and variables →
   Actions): `DATABASE_URL`, `VRCHAT_USERNAME`, `VRCHAT_PASSWORD`, `VRCHAT_TOTP_SECRET`,
   `VRCHAT_USER_AGENT`, `SESSION_ENCRYPTION_KEY`.

Once secrets are set, trigger [`.github/workflows/sync.yml`](.github/workflows/sync.yml) manually
via its "Run workflow" button to populate the database for the first time; after that it runs
daily on its own schedule. [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs typecheck
+ lint on every push/PR.

## Project layout

```
app/                       Next.js App Router pages + API routes (read-only, no VRChat access)
components/starfield/      R3F canvas, instanced star rendering, filters, detail panel
lib/vrchat/                Hand-rolled VRChat API client (auth, TOTP, world search)
lib/pipeline/              Embedding (UMAP) → clustering (k-means) → scoring
lib/data/                  Shared Prisma queries used by both API routes and Server Components
scripts/sync.ts            Daily sync entrypoint, run by GitHub Actions
prisma/schema.prisma       worlds / sync_runs / vrchat_sync_sessions tables
```
