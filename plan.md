# Plan: VRChat Worlds Starfield Explorer

## Context

The PRD ([vrchat-starfield-prd.md](vrchat-starfield-prd.md)) describes a 3D "starfield" web app that visualizes a curated set of VRChat worlds — position encodes thematic similarity, size/brightness encodes popularity — with a daily backend sync job that is the only thing ever allowed to talk to VRChat. The goal of this plan is to take that PRD from "default Next.js scaffold" to a working, deployed, $0-cost personal project.

The repo is currently in a messy half-scaffolded state from prior sessions (including at least one other AI agent tool, `.opencode/`, and what looks like an accidental double `create-next-app` run), so **Phase 0 is cleanup**, not feature work. The user confirmed: standardize on pnpm, delete the accidental nested duplicate project, and `git init` fresh at the root. They also confirmed a concrete, free-tier-friendly stack (Vercel + Neon + GitHub Actions) so the plan doesn't have to hand-wave the deployment/scheduling questions the PRD deliberately left open.

## Locked-in decisions

| Decision | Choice | Why |
|---|---|---|
| Package manager | pnpm only | Root already has `pnpm-workspace.yaml`; user confirmed. |
| ORM | Prisma | Already scaffolded in root `package.json`; user said "pick the best/most secure," and Prisma's migration tooling is the most mature option already half-installed. |
| App hosting | Vercel (Hobby/free) | User wants $0 hosting for a low-traffic personal project. |
| Database | Neon (free tier Postgres) | Serverless Postgres, generous free tier, pairs naturally with Vercel. |
| Sync job execution | Standalone TS script run by a **GitHub Actions** scheduled workflow — not a Vercel cron/API route | Vercel Hobby function timeouts are too tight for a job that must paginate VRChat calls at a deliberately conservative pace (PRD §10) plus run embedding/clustering. GitHub Actions is free and has no such timeout for this usage. |
| VRChat API access | Hand-rolled fetch client, no third-party VRChat wrapper package | User's explicit choice — full control over auth/TOTP/cookie handling and pacing. |
| Embedding/clustering runtime | Pure JS/TS (`umap-js` + `ml-kmeans`), tag-only multi-hot features for v1 | Avoids a second Python runtime/infra and avoids paid text-embedding APIs, consistent with the $0 constraint; PRD itself frames text embeddings as a later experiment, not a v1 requirement. |

## Corrections found during implementation

This plan was drafted before any code existed; a few details turned out to be wrong once
actually built against the real installed package versions (`AGENTS.md`'s warning about this
Next.js/Prisma pairing having real breaking changes proved true, and was verified by installing
Prisma's own agent-skill docs into `.agents/skills/` on `prisma init` — read those over relying
on this file for exact syntax). Corrected here rather than left wrong above:

- **No `DIRECT_URL`/`directUrl`.** Prisma 7.10.0's actual `datasource` config type (verified via
  `tsc`, not docs) only supports `url` and `shadowDatabaseUrl` — no `directUrl`. Since this is a
  low-traffic project with no real need for connection pooling, the design was simplified to a
  single `DATABASE_URL` (Neon's **direct/unpooled** string) used everywhere, plus an optional
  `SHADOW_DATABASE_URL` (dev-only, for `prisma migrate dev`'s drift detection).
- **Config file is `prisma7.config.ts`, not `prisma.config.ts`.** This is Prisma 7's actual
  preferred, version-namespaced filename (`prisma init` generates it; confirmed in
  `@prisma/config`'s own file-candidate list) — both names work, but this repo uses the
  version-namespaced one to match what the installed CLI itself expects first.
- **`shadowDatabaseUrl`/`env()` gotcha:** `prisma/config`'s `env()` helper throws if the var is
  unset OR an empty string — but `.env.example`'s convention (and this repo's own `.env`) leaves
  optional vars as `""`. `SHADOW_DATABASE_URL` is read via plain `process.env` with `|| undefined`
  instead of `env()`, normalizing `""` to "not set." Confirmed with a real `prisma migrate dev`
  run that failed until this was fixed.
- **`postinstall: prisma generate` needs `DATABASE_URL` set even just to generate the client**
  (no live connection required, but the config loader throws without it). Both
  `.github/workflows/sync.yml` (real secret) and `.github/workflows/ci.yml` (dummy placeholder
  value, since CI never connects) set it at the job level, not per-step, so the `pnpm install`
  step itself doesn't fail.
- **`dotenv` had to be added as a devDependency** — Prisma 7 no longer auto-loads `.env` files;
  `prisma7.config.ts` and `scripts/sync.ts` both do `import "dotenv/config"` explicitly.
- **`app/layout.tsx`'s `LayoutProps<"/">` needs `next typegen`** (or a `dev`/`build` run) before
  `tsc --noEmit` will resolve it — it's an ambient type Next.js generates, not exported from a
  module. Not a bug in the file; just something to run once before typechecking a fresh clone.
- **A newer React/Next lint rule (`react-hooks/set-state-in-effect`) rejects the common
  "setLoading(true) at the top of an effect, then fetch" pattern.** `WorldDetailPanel` instead
  keys its single piece of state by world id (`{ id, detail } | null`) and derives both the
  displayed data and the loading flag from comparing that id to the currently-selected one, so
  the only `setState` call happens inside the fetch's `.then()`, not synchronously in the effect
  body.
- **Prisma's own migration guide docs (fetched from `github.com/prisma/skills`) described a
  `datasource.directUrl` option that the actually-installed 7.10.0 CLI rejects at the type
  level** — a reminder that even Prisma's own docs can describe a different point release than
  what's installed; the compiler/CLI's actual behavior is the ground truth, not the doc.

The code blocks in the phase-by-phase sections below are the *original* plan and, in the spots
above, no longer exactly match what was actually built — treat [README.md](README.md) and the
source files themselves as ground truth for exact env vars/config syntax; the phases below are
still accurate for the overall structure and reasoning.

## Current status (2026-09-17)

Phases 0-8 are done and working: scaffold, schema, VRChat auth, sync pipeline, API routes, and
the starfield frontend all exist and run. The frontend today ([StarfieldApp.tsx](components/starfield/StarfieldApp.tsx))
renders `<Instances>`/`<Instance>` plain spheres ([WorldPoints.tsx](components/starfield/WorldPoints.tsx)) sized by
`popularityScore` inside a `drei` `<Canvas>` with a single `<Stars>` background layer and default
`<OrbitControls>` ([StarfieldCanvas.tsx](components/starfield/StarfieldCanvas.tsx)); filters (tags, min-popularity
slider, platform, search) live in a `zustand` store ([store.ts](components/starfield/store.ts)) and dim
non-matching points rather than removing them. Clicking a point only sets `selectedWorldId`, which
opens [WorldDetailPanel.tsx](components/starfield/WorldDetailPanel.tsx) — there's no camera reaction to selection yet, and
no keyboard navigation. Work now moves into **Phase 9**, a UI/interaction polish pass requested
directly (not from the original PRD) covering five changes: drop the min-popularity slider in
favor of size-only popularity encoding, restyle world markers as glowing "star" particles with a
subtle twinkle, animate the camera to focus on a world on click, wire arrow-key left/right to step
through worlds (with the same camera animation), and thicken/vary the background starfield.

---

## Phase 9 — Starfield visual & interaction upgrades

Scope: `components/starfield/*` only — no schema, API, or sync changes. All five items are purely
client-side (`"use client"` components already), so no new server-side data is needed; every input
(`popularityScore`, `posX/Y/Z`) is already in `WorldSummaryDTO`.

### 9.1 — Remove the min-popularity slider; encode popularity as size only

- Delete the "Min popularity" `<label>`/`<input type="range">` block from [FilterPanel.tsx](components/starfield/FilterPanel.tsx)
  and drop `minPopularity` from `Filters`/`defaultFilters`/`worldMatchesFilters` in [store.ts](components/starfield/store.ts)
  (tags/platform/search filters stay as-is — only the popularity slider goes).
- `scaleFor()` in [WorldPoints.tsx](components/starfield/WorldPoints.tsx) already maps `popularityScore` (0-100) to a
  size range; keep that mechanism but re-tune the min/max so nothing reads as "super small or super
  big" — e.g. tighten the current `0.12–0.67` spread to something like `0.35–1.0` (clamped, non-linear
  e.g. `sqrt` curve so the long tail of low-popularity worlds doesn't all collapse to the same tiny
  dot). Since the popularity filter is gone, size becomes the *only* way popularity reads visually,
  so this tuning is the main design lever — sanity-check against the real popularity distribution
  (`SELECT min, max, percentile_cont(...) FROM worlds` or just eyeball via `prisma studio`) rather
  than guessing.

### 9.2 — "Star" look: glowing particle with a slight twinkle

- Current markers are flat `sphereGeometry` + `meshBasicMaterial`. Two parts to the star look:
  **glow** (bloom) and **twinkle** (animation).
- **Glow:** add `@react-three/postprocessing` (wraps the `postprocessing` package; not yet a
  dependency — `pnpm add @react-three/postprocessing postprocessing`) and drop an
  `<EffectComposer><Bloom .../></EffectComposer>` into [StarfieldCanvas.tsx](components/starfield/StarfieldCanvas.tsx). Bloom
  needs bright/HDR-ish colors to trigger — keep `toneMapped={false}` (already set) and boost marker
  color intensity above 1 (e.g. multiply `colorHex`'s RGB by ~1.5-2 before passing to `<Instance
  color>`) so stars actually bloom against the dark background instead of just the `<Stars>` layer.
  Tune `Bloom`'s `luminanceThreshold`/`intensity` so only world markers (and bright background stars)
  bloom, not the whole scene.
- **Twinkle:** per-instance, small and subtle (per the ask — "a little bit"), not a strobe. Since
  `<Instance>` refs forward to the underlying `Object3D`, add a small wrapper that keeps a ref per
  instance and, in a single shared `useFrame`, nudges `scale` with
  `baseScale * (1 + twinkleAmplitude * Math.sin(t * twinkleSpeed + phase))` where `phase` is a stable
  per-world random value (seed off `world.id` so it doesn't reshuffle every render) — cheap trig over
  ~2,000 instances per frame is fine. Keep `twinkleAmplitude` small (~0.05-0.1) so it reads as a
  shimmer, not pulsing.
- Verify in-browser after: confirm frame rate stays smooth with the full dataset and that bloom
  doesn't wash out the whole scene into a white blob (a common first-pass bloom mistake).

### 9.3 — Click-to-focus camera animation

- Add a small `CameraRig` component rendered inside `<Canvas>` (new file,
  `components/starfield/CameraRig.tsx`) that reads `selectedWorldId` from the store, looks up that
  world's `[posX, posY, posZ]`, and on change animates both the `OrbitControls` target and the
  camera position toward that world over ~0.5-0.8s (simple `useFrame` lerp with an eased `t`, no new
  tweening library needed).
- "Focus at x distance at center of screen" = the controls target becomes the world's position
  (so it's centered), and the camera position becomes `target + normalize(currentCameraPos -
  target) * FOCUS_DISTANCE` (keeps the camera's current viewing angle, just dollies to a fixed
  distance from the target) — define `FOCUS_DISTANCE` as a constant, tuned against marker size from
  9.1 so a focused world reads clearly but isn't clipped inside the near plane.
- Needs a shared ref to the `OrbitControls` instance (`drei`'s `<OrbitControls ref={...}>` exposes
  `.target`) — lift that ref up from [StarfieldCanvas.tsx](components/starfield/StarfieldCanvas.tsx) so `CameraRig` can drive it
  each frame; disable damping conflicts by writing to `controls.target` and calling `controls.update()`
  each animated frame rather than fighting `enableDamping`.

### 9.4 — Arrow-key left/right steps to next/previous world

- Needs a defined order to step through. Simplest, most predictable: sort the *currently visible*
  (filter-matching) worlds by `id` or by their existing render order (array order from
  `WorldSummaryDTO[]` as passed into `WorldPoints`) — avoid inventing a new sort dimension. On no
  selection, left/right could either no-op or select the first world; confirm with the user which
  feels right once it's interactively testable, defaulting to "select first world" as more useful.
- Add a `useEffect` with a `window.addEventListener("keydown", ...)` (likely in `StarfieldApp.tsx`,
  guarded so it doesn't fire while a text input like the search box is focused —
  `document.activeElement` check) that, on `ArrowLeft`/`ArrowRight`, computes the next/previous id
  from the current `selectedWorldId`'s index in that ordered list and calls
  `setSelectedWorldId(nextId)`. Because `CameraRig` (9.3) already reacts to `selectedWorldId`
  changes, this automatically gets the same camera-focus animation for free — no separate camera
  logic needed for arrow-key navigation.

### 9.5 — Thicker background starfield, some twinkling

- Current: one `<Stars radius={300} depth={80} count={2000} factor={4} fade speed={0.5} />` layer
  in [StarfieldCanvas.tsx](components/starfield/StarfieldCanvas.tsx) — `drei`'s `<Stars>` already twinkles *all* stars uniformly
  via its internal shader's `speed` prop, so "a bit more background stars and some of them
  twinkling" (i.e., only *some* twinkle, not all) needs two layers instead of tuning one:
  - Layer A (dominant, static-ish): higher `count` (e.g. ~4000-6000), `speed={0}` or very low, for
    the "more background stars" part.
  - Layer B (accent, twinkling): a smaller `count` (e.g. ~300-500), higher `speed`, so a visibly
    twinkling minority sits on top of the calmer majority.
- Keep both behind/outside the `Bloom` pass's bright-object range (or tune `Bloom` thresholds from
  9.2 so background stars don't overwhelm world markers) — verify visually after 9.2 lands.

### Suggested build order

9.1 (delete slider) is independent and can land first/anytime. 9.2 (star look) and 9.5 (background
stars) both touch `StarfieldCanvas.tsx`'s render tree and are easiest to tune together in-browser
side by side. 9.3 (click focus) and 9.4 (arrow keys) are sequential — 9.4 depends on 9.3's
`CameraRig` existing. Verify each with the browser preview tool (`pnpm dev`) rather than eyeballing
code, per the project's UI-change verification norm — check frame rate with the full ~2,000-world
dataset, not just a handful.

**Standing instruction from `AGENTS.md`:** this project's Next.js (16.3.5) and Prisma (7.x/8.x) versions are newer than training data and have real breaking changes (e.g. Next 16's opt-in "Cache Components" model, async dynamic route `params`; Prisma's driver-adapter + `prisma-client` generator shift). Before writing any Next.js or Prisma code, check `node_modules/next/dist/docs/` and Prisma's own bundled docs/CLI help for that installed version — treat the snippets below as verified starting points, not gospel, especially for exact route-handler and schema/generator syntax.

---

## Phase 0 — Repo cleanup & scaffold fix

```bash
cd /Users/mija/Projects/vr-chat-map
rm -rf vr-chat-map                 # delete the accidental nested duplicate (its own .git + node_modules)
rm package-lock.json               # standardize on pnpm
git init
```

`package.json` currently has dependencies (`next`, `react`, `@prisma/client`, `@react-three/fiber`, `@react-three/drei`, `three`, `zod`, etc.) but **no `devDependencies` block at all**, even though `tsconfig.json`/`eslint.config.mjs`/`postcss.config.mjs` already assume TypeScript/ESLint/Tailwind exist. Add:

```json
"devDependencies": {
  "@tailwindcss/postcss": "^4",
  "@types/node": "^20",
  "@types/pg": "^8",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "eslint": "^9",
  "eslint-config-next": "16.3.5",
  "tailwindcss": "^4",
  "tsx": "^4",
  "typescript": "^5"
}
```

Also fix a real version mismatch already in the file: `@prisma/client` is pinned `^7.10.0` while `prisma` is pinned `^8.0.0-rc.15` — a stable/RC major mismatch that risks `prisma generate` breaking. Realign both to `7.10.0`, then add the remaining runtime deps:

```bash
pnpm add prisma@7.10.0 @prisma/client@7.10.0
pnpm add @prisma/adapter-pg pg otpauth umap-js ml-kmeans zustand
pnpm install   # reconciles the existing (stale) pnpm-lock.yaml against the updated package.json
```

Add real scripts (current `scripts` block is just the npm-init placeholder):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "postinstall": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:deploy": "prisma migrate deploy",
  "sync": "tsx scripts/sync.ts"
}
```

Add `.gitignore` (none exists at root) covering `node_modules/`, `.next/`, `.env` / `.env*.local` (but not `.env.example`), `.vercel`, `lib/generated/prisma/`, `.DS_Store`. Add `.env.example` documenting every var in Phase 1 with placeholder values (no real secrets), checked in.

Leave `.opencode/` alone — unrelated local tool config, not part of the app.

---

## Phase 1 — Env & secrets

| Var | Used by | Lives in |
|---|---|---|
| `DATABASE_URL` | Prisma at request time (API routes) and in the sync script — Neon's **pooled** connection string | local `.env`, Vercel, GitHub Actions secret |
| `DIRECT_URL` | Prisma CLI migrations only — Neon's **unpooled** connection string | local `.env` only |
| `VRCHAT_USERNAME` / `VRCHAT_PASSWORD` | `lib/vrchat/auth.ts` | local `.env`, GitHub Actions secret — **never Vercel** |
| `VRCHAT_TOTP_SECRET` | TOTP code generation via `otpauth` | local `.env`, GitHub Actions secret — **never Vercel** |
| `VRCHAT_USER_AGENT` | Every VRChat API call (required by VRChat's own usage guidance) | local `.env`, GitHub Actions secret |
| `SESSION_ENCRYPTION_KEY` | AES-256-GCM key for the persisted VRChat cookie jar (`openssl rand -base64 32` to generate) | local `.env`, GitHub Actions secret |

Nothing VRChat-related is ever `NEXT_PUBLIC_*`; Vercel only ever needs `DATABASE_URL`, since the frontend/API layer never talks to VRChat (PRD §6).

---

## Phase 2 — Database schema (Prisma)

`prisma/schema.prisma` implements PRD §7's `worlds` and `sync_runs` tables, **plus one addition**: a `vrchat_sync_sessions` table to persist the encrypted VRChat auth cookie between runs (PRD §10 requires this persistence, but GitHub Actions runners have no disk between runs — the DB is the only durable store this design has).

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

model World {
  id                  String    @id
  name                String
  description         String?
  authorId            String    @map("author_id")
  authorName          String    @map("author_name")
  capacity            Int?
  recommendedCapacity Int?      @map("recommended_capacity")
  favorites           Int       @default(0)
  visits              Int       @default(0)
  heat                Int       @default(0)
  popularity          Int       @default(0)
  occupants           Int       @default(0)
  tags                String[]  @default([])
  releaseStatus       String?   @map("release_status")
  platforms           String[]  @default([])
  thumbnailUrl        String?   @map("thumbnail_url")
  imageUrl            String?   @map("image_url")
  vrchatCreatedAt     DateTime? @map("vrchat_created_at")
  vrchatUpdatedAt     DateTime? @map("vrchat_updated_at")
  popularityScore     Float     @default(0) @map("popularity_score")
  posX                Float?    @map("pos_x")
  posY                Float?    @map("pos_y")
  posZ                Float?    @map("pos_z")
  clusterId           Int?      @map("cluster_id")
  clusterLabel        String?   @map("cluster_label")
  colorHex            String?   @map("color_hex")
  lastSyncedAt        DateTime? @map("last_synced_at")

  @@map("worlds")
  @@index([popularityScore])
  @@index([clusterId])
}

model SyncRun {
  id             Int       @id @default(autoincrement())
  startedAt      DateTime  @map("started_at")
  finishedAt     DateTime? @map("finished_at")
  status         String    @default("running") // running | success | partial | failed
  worldsSeen     Int       @default(0) @map("worlds_seen")
  worldsUpserted Int       @default(0) @map("worlds_upserted")
  errorMessage   String?   @map("error_message")

  @@map("sync_runs")
}

// Addition beyond PRD §7 — see rationale above.
model VrchatSyncSession {
  account             String    @id
  encryptedCookieJar  Json      @map("encrypted_cookie_jar")
  expiresAt           DateTime? @map("expires_at")
  lastVerifiedAt      DateTime? @map("last_verified_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  @@map("vrchat_sync_sessions")
}
```

`lib/db.ts` — shared Prisma client using the `pg` driver adapter (verify this is still the right pattern for the installed Prisma 7.10.0 against its own docs before finalizing):

```ts
import { PrismaClient } from "@/lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
```

`popularity_score` is `Float`, not PRD's literal "numeric" — avoids `Decimal`↔`number` JSON friction for what's purely a sort/render score.

---

## Phase 3 — VRChat auth client

Files: `lib/vrchat/{client,auth,session-store,types}.ts`, `lib/crypto.ts`.

Flow (exact undocumented endpoint paths must be confirmed against community VRChat API docs, e.g. the vrchatapi.github.io OpenAPI spec, at implementation time — PRD §10 already establishes this is an unofficial API):

1. **Login** — request to the auth/user endpoint with `Authorization: Basic base64(user:pass)` and a required `User-Agent: <VRCHAT_USER_AGENT>`. Response indicates `requiresTwoFactorAuth: ["totp"]` and sets a partial `auth` cookie.
2. **TOTP verify** — POST the 6-digit code (generated via `otpauth`'s `TOTP.generate()` from `VRCHAT_TOTP_SECRET`) to the TOTP-verify endpoint, with the partial cookie attached. Response sets a `twoFactorAuth` cookie; `auth` + `twoFactorAuth` together are a full session.
3. **Persist** — encrypt `{ auth, twoFactorAuth, capturedAt }` with AES-256-GCM (`lib/crypto.ts`, key = `SESSION_ENCRYPTION_KEY`), upsert into `VrchatSyncSession` keyed by `account`.
4. **Reuse / re-auth** — `auth.getValidSession()` loads the stored row; if missing/expired, logs in fresh; otherwise does one cheap `GET auth/user` with stored cookies to confirm it's still valid (401/403 → re-login), updating `lastVerifiedAt`.

`lib/crypto.ts` uses Node's built-in `crypto` (AES-256-GCM), no extra dependency needed for this part.

---

## Phase 4 — Sync pipeline script

```
scripts/sync.ts                  # entrypoint (`pnpm run sync`)
lib/config.ts                    # CORPUS / PACING / EMBEDDING / SCORING constants — single source of truth
lib/vrchat/{client,auth,session-store,worlds,types}.ts
lib/pipeline/{upsert,vocabulary,features,reduce,cluster,score,finalize}.ts
lib/data/worlds.ts                # read-side query functions shared with API routes + app/page.tsx
```

`lib/config.ts` keeps tunables out of scattered magic numbers:

```ts
export const CORPUS = {
  topByHeat: 2000,
  topByPopularity: 2000,
  topPerMajorTag: 200,
  majorTags: [] as string[], // finalize empirically from real API responses during Phase 4 — VRChat's tag taxonomy isn't fully documented up front
};
export const PACING = { requestDelayMs: 2000, pageSize: 100 };
export const EMBEDDING = { tagVocabSize: 200, numClusters: 12 };
export const SCORING = { weights: { heat: 0.35, popularity: 0.35, visits: 0.2, favorites: 0.1 } };
```

Pipeline steps in `scripts/sync.ts`:

1. Insert a `SyncRun` row (`status: "running"`).
2. `auth.getValidSession()`.
3. **Fetch** — for each configured query (sort=heat top N, sort=popularity top N, one per `CORPUS.majorTags`), page sequentially with `await sleep(PACING.requestDelayMs)` between requests (deliberately sequential, not concurrent — PRD wants conservative pacing over throughput). De-dupe into a `Map<worldId, RawWorld>`.
4. **Upsert raw fields** — Prisma `upsert` per world id, chunked batches. Track `worldsSeen`/`worldsUpserted`.
5. **Embed → reduce → cluster → score over the full `worlds` table** (not just today's fetched subset, so clusters stay globally consistent): build a tag vocabulary + multi-hot vectors (`lib/pipeline/vocabulary.ts`/`features.ts`), `umap-js` → `pos_x/y/z`, `ml-kmeans` (k = `EMBEDDING.numClusters`) → `cluster_id`, derive `cluster_label` from each cluster's most over-represented tag, assign `color_hex` from an evenly-spaced hue wheel by cluster id, compute `popularity_score` from `SCORING.weights` over log-compressed heat/popularity/visits/favorites.
6. **Finalize** — batch-update the computed columns + `last_synced_at`, mark `SyncRun` `success`/`partial` with final counts.
7. **Failure handling** — the whole run is wrapped in try/catch. Because upserts are per-id/additive and step 5-6 only runs after fetch completes, a failure before finalize leaves every existing row's `pos_x/y/z`/`cluster_id`/`popularity_score`/`last_synced_at` untouched — satisfying PRD §5.4's "previous day's data is left intact" without extra transaction machinery. Catch block writes `SyncRun.status = "failed"` + `errorMessage`, `process.exit(1)`.

k-means (`ml-kmeans`) is used instead of PRD §8's "k-means or HDBSCAN" — no actively-maintained pure-JS HDBSCAN fits the no-Python-runtime constraint.

---

## Phase 5 — Next.js API routes

`lib/data/worlds.ts` holds the actual Prisma queries (`getWorldSummaries`, `getWorldDetail`, `getDataAsOf`), used by **both** the route handlers and `app/page.tsx` directly — a Server Component should call this function in-process, not `fetch()` its own API route.

- `app/api/worlds/route.ts` — `export const runtime = "nodejs"` (needs Prisma/`pg`, not Edge-safe by default). Returns `{ dataAsOf, worlds: WorldSummary[] }` where `dataAsOf` comes from the latest **successful** `sync_runs.finished_at`. Summary fields omit `description`/`authorName`/`recommendedCapacity` to keep the ~2,000-row payload light (PRD explicitly allows deferring these to the detail route). Sets a plain `Cache-Control: public, max-age=300, stale-while-revalidate=3600` header (ordinary HTTP caching — Next 16's opt-in Cache Components/`use cache` model stays disabled per the locked-in decision, to avoid its Suspense-everywhere complexity for a low-traffic app).
- `app/api/worlds/[id]/route.ts` — full detail row or 404. **Next 16 dynamic route params are async** (`params: Promise<{ id: string }>`) — confirm the exact handler signature against `node_modules/next/dist/docs/` before writing this, per `AGENTS.md`.

---

## Phase 6 — Frontend (starfield)

- `app/page.tsx` — async Server Component, calls `getWorldSummaries()`/`getDataAsOf()` directly, passes data into a client component.
- `components/starfield/StarfieldApp.tsx` (`"use client"`) — owns a small `zustand` store (`selectedWorldId`, `hoveredWorldId`, filters) so DOM overlays (filter panel, detail panel) and Canvas-internal components can share state across R3F's separate reconciler tree.
- `components/starfield/StarfieldCanvas.tsx` — loaded via `next/dynamic(() => import(...), { ssr: false })` (Three.js needs `window`/WebGL, must not attempt SSR). Wraps `<Canvas>` from `@react-three/fiber` with `drei`'s `<OrbitControls>` (default per PRD §5.1).
- `components/starfield/WorldPoints.tsx` — use `drei`'s `<Instances>`/`<Instance>` (built on `THREE.InstancedMesh`) rather than a hand-rolled `THREE.Points`+shader: at ~2,000-2,600 points this is cheap on any GPU, and `<Instances>` gives per-instance `color`/`scale` plus built-in raycast picking (`onClick` resolves the right instance automatically) for far less code than manual buffer-attribute picking. `scale` derives from `popularityScore` (normalized, min-clamped so faint worlds stay visible), `color` from `colorHex`.
- **Filter dimming (not removal, per PRD §5.3):** filters live in the zustand store; a `useMemo` computes the matching set from the already-fetched full array; non-matching instances get their `color`/`scale` pushed toward a dim gray/shrunk state reactively, preserving spatial/constellation context rather than removing points.
- `components/starfield/WorldDetailPanel.tsx` — on `selectedWorldId` change, fetches `GET /api/worlds/[id]`; renders thumbnail/author/tags/capacity/platforms/stats/`lastSyncedAt`, plus a **Visit** button as a plain `<a href="https://vrchat.com/home/world/{id}" target="_blank" rel="noopener noreferrer">` — per PRD §5.2's explicit reasoning against constructing `vrchat://` URIs.
- `components/starfield/FilterPanel.tsx` — tag multi-select (tag frequency derived client-side), min-popularity slider, PC/Quest platform toggle (checks `platforms` for `standalonewindows`/`android`), debounced name search.
- `components/starfield/DataAsOfBadge.tsx` — renders the `dataAsOf` timestamp from the initial payload (PRD §11 transparency requirement).

---

## Phase 7 — GitHub Actions workflow

`.github/workflows/sync.yml`:

```yaml
name: Daily VRChat Worlds Sync

on:
  schedule:
    - cron: "17 9 * * *"
  workflow_dispatch: {}

concurrency:
  group: vrchat-sync
  cancel-in-progress: false   # never cancel mid-flight — could corrupt session/cookie state

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run sync
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          VRCHAT_USERNAME: ${{ secrets.VRCHAT_USERNAME }}
          VRCHAT_PASSWORD: ${{ secrets.VRCHAT_PASSWORD }}
          VRCHAT_TOTP_SECRET: ${{ secrets.VRCHAT_TOTP_SECRET }}
          VRCHAT_USER_AGENT: ${{ secrets.VRCHAT_USER_AGENT }}
          SESSION_ENCRYPTION_KEY: ${{ secrets.SESSION_ENCRYPTION_KEY }}
```

No custom failure-notification step needed — GitHub already emails repo owners on a failed scheduled run, which covers PRD's observability need for a solo project. `pnpm install` triggers `postinstall: prisma generate` automatically.

---

## Phase 8 — Deployment

**Manual steps (the user, not the coding agent):**
1. Create a Neon project/database (free tier); copy the **pooled** connection string (→ `DATABASE_URL`) and the **direct/unpooled** one (→ `DIRECT_URL`).
2. Create a Vercel project, import this GitHub repo, set `DATABASE_URL` in Vercel env vars (Production + Preview) — nothing else.
3. Create a dedicated VRChat service account; enable Two-Factor Authentication with an **authenticator app (TOTP)**, not email OTP; capture the base32 secret at setup time (it's usually shown once).
4. Push the repo to GitHub; add repo secrets: `DATABASE_URL`, `VRCHAT_USERNAME`, `VRCHAT_PASSWORD`, `VRCHAT_TOTP_SECRET`, `VRCHAT_USER_AGENT`, `SESSION_ENCRYPTION_KEY`.

**Coding agent steps:** all code/config from Phases 0-7; `pnpm exec prisma migrate dev --name init` once real Neon credentials exist locally (commits the migration SQL); `pnpm exec prisma migrate deploy` against the production DB using `DIRECT_URL`; trigger a manual `workflow_dispatch` run once secrets are set and inspect logs; verify the Vercel build succeeds after push.

---

## Verification

1. **Scaffold:** `pnpm install`, `pnpm exec tsc --noEmit`, `pnpm exec eslint .`, `pnpm dev` all clean before any feature code.
2. **DB:** `pnpm exec prisma migrate dev --name init` creates all three tables; spot-check via `prisma studio`.
3. **Auth (run locally first, not first on CI, to avoid burning login attempts against the real account):** a `--auth-only` path that logs in + TOTP-verifies and prints the account name; run twice and confirm the second run reuses the stored session instead of logging in again.
4. **Fetch+upsert:** point `CORPUS` at a tiny size (e.g. top 20), run the sync, confirm `worlds`/`sync_runs` populate correctly; then deliberately break a credential and confirm `sync_runs` records `failed` while existing `worlds` rows are untouched.
5. **Embedding/clustering:** after a full raw sync, run the embed/cluster/score phase and print vocabulary size, per-cluster counts, and score min/max/median as a sanity check.
6. **API routes:** `curl localhost:3000/api/worlds | jq` (check shape + `dataAsOf`), `curl` a known and a bogus world id.
7. **Frontend:** use the browser tool to confirm stars render at the right rough count, orbit controls work, click → detail panel with correct data, Visit button opens the right `vrchat.com/home/world/{id}` URL, filters dim rather than remove, no hydration-mismatch console errors.
8. **Deployed:** repeat the visual checks against the live Vercel URL; grep built client JS chunks to confirm no VRChat credential ever leaks into the client bundle (NFR §11).
9. **GitHub Actions:** manual `workflow_dispatch` run to completion, confirm `sync_runs`/`dataAsOf` advance on the live site; then let the real schedule fire once unattended.

---

## Notable deviations from the literal PRD text (each with rationale — see also inline notes above)

- Added `vrchat_sync_sessions` table — GH Actions has no persistent disk between runs.
- k-means only, no HDBSCAN — no maintained pure-JS HDBSCAN fits the no-Python constraint.
- Tag-only multi-hot features for v1, no text embeddings — avoids paid embedding APIs; PRD frames this as a later experiment anyway.
- `popularity_score` as `Float` not `Decimal` — avoids JSON serialization friction for a pure sort/render value.
- `zustand` added as a new dependency — needed to share selection/filter state across R3F's Canvas reconciler boundary.
- Pinned `prisma` down to `7.10.0` to match `@prisma/client` (was mismatched with `^8.0.0-rc.15` in the existing scaffold).

## Critical files

- [package.json](package.json)
- [prisma/schema.prisma](prisma/schema.prisma)
- [lib/vrchat/auth.ts](lib/vrchat/auth.ts)
- [scripts/sync.ts](scripts/sync.ts)
- [app/api/worlds/route.ts](app/api/worlds/route.ts)
- [components/starfield/WorldPoints.tsx](components/starfield/WorldPoints.tsx)
- [components/starfield/StarfieldCanvas.tsx](components/starfield/StarfieldCanvas.tsx)
- [components/starfield/store.ts](components/starfield/store.ts)
- [components/starfield/FilterPanel.tsx](components/starfield/FilterPanel.tsx)
- [components/starfield/StarfieldApp.tsx](components/starfield/StarfieldApp.tsx)
- `components/starfield/CameraRig.tsx` (new, Phase 9.3)
- [.github/workflows/sync.yml](.github/workflows/sync.yml)
