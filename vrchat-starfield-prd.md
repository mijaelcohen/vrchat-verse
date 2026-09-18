# PRD: VRChat Worlds Starfield Explorer

## 1. Summary

An interactive 3D "starfield" web app that visualizes a curated set of VRChat worlds as stars in explorable space. Position encodes thematic similarity (genre/tag clusters form constellations), and size/brightness encodes popularity. Users fly/orbit through the space, click a star to see world details, and click "Visit" to open that world in VRChat. Data is refreshed once daily by a backend job; all VRChat authentication lives server-side only.

## 2. Goals

- Give people a visually engaging way to browse VRChat worlds by both **similarity** (what kind of world is this) and **popularity** (how big/active is it).
- Make individual worlds actionable: one click opens them in VRChat.
- Keep all VRChat credentials and API access on the backend — the browser never talks to VRChat directly.
- Refresh data on a daily cadence via a scheduled job, not on-demand per visitor.

## 3. Non-Goals (v1)

- Not a complete crawl of every VRChat world (there are hundreds of thousands; no endpoint returns "all of them" anyway). v1 works from a **curated corpus** — e.g. top-N by popularity/heat, plus N per major tag/category, refreshed daily.
- No visitor login with a VRChat account. Browsing the map requires no VRChat credentials; only the backend sync job authenticates.
- No live/real-time occupancy — occupant counts are as fresh as the last daily sync.
- No world creation, editing, or moderation tooling.

## 4. Primary Use Cases

1. "Show me something popular I haven't seen" — browse toward the brightest stars.
2. "Show me worlds like the kind I like" — navigate toward a cluster/constellation.
3. "I found one, let me go" — click a star, click Visit, land in VRChat.

## 5. Core Features

### 5.1 3D Starfield Visualization
- Each world is a point in 3D space rendered with Three.js (via `react-three-fiber` in Next.js).
- **Position (x, y, z)** — precomputed offline from a similarity embedding of each world's tags/name/description, reduced to 3D. Similar worlds cluster together, forming visible constellations by genre.
- **Size / brightness** — driven by a computed `popularity_score` (blend of heat, popularity, visits, favorites). Popular worlds are large, glowing stars; obscure ones are faint points.
- **Color** — assigned per cluster during the sync pipeline, so genre is readable at a glance.
- **Optional polish (stretch goal):** a subtle pulse/glow for worlds with recently rising heat ("going nova").
- Camera: default `OrbitControls`, with an optional free-fly (WASD + mouse-look) mode for immersion.
- Rendering approach: instanced points/sprites for the full field (cheap to draw thousands), with raycast picking against the on-screen subset for click interaction. Swap to labeled sprites/thumbnails at close zoom.

### 5.2 World Detail Panel
Triggered by clicking a star. Shows:
- Thumbnail image, name, author name
- Tags, capacity / recommended capacity, platform support (PC / Quest)
- Popularity stats (visits, favorites, heat, current occupants as of last sync)
- Last-synced timestamp (so users understand data freshness)
- **Visit button** — opens `https://vrchat.com/home/world/{worldId}` (equivalently the short link `https://vrch.at/{worldId}`) in a new tab. This intentionally reuses VRChat's own world page rather than constructing a `vrchat://launch` URI ourselves — a valid launch URI requires a live instance ID/nonce that only VRChat's own backend can mint, so handing off to vrchat.com's page (which has its own Launch button) is the simplest correct integration for v1.

### 5.3 Search & Filter
- Tag multi-select, minimum popularity threshold, platform filter (PC/Quest), free-text name search.
- Since the working dataset is a curated set (thousands, not millions) it can be fetched once per session and filtered client-side, dimming non-matches rather than removing them (keeps spatial context).

### 5.4 Daily Data Sync (backend only)
- A scheduled job (not a user-triggered request) runs once per day:
  1. Authenticates to VRChat with a dedicated service account (server-side only).
  2. Pulls worlds via the Search/List Worlds endpoints across a configured set of queries (e.g. sort by heat, sort by popularity, per major tag) with pagination, at a conservative request pace.
  3. Upserts raw fields into Postgres.
  4. Computes/refreshes the embedding position, cluster/color, and popularity score for each world.
  5. Records a row in `sync_runs` for observability (counts, errors, duration).
- If a sync run fails partway, the previous day's data is left intact — the site should never show a half-written or empty dataset because of a bad run.

## 6. System Architecture

```
┌─────────────────┐      ┌───────────────────┐      ┌──────────────┐
│  VRChat API      │◄─────┤  Sync Job (daily)  │─────►│  Postgres    │
│  (unofficial)    │      │  server-side only  │      │              │
└─────────────────┘      └───────────────────┘      └──────┬───────┘
                                                             │
                                                     ┌───────▼───────┐
                                                     │ Next.js API    │
                                                     │ routes         │
                                                     └───────┬───────┘
                                                             │
                                                     ┌───────▼───────┐
                                                     │ Next.js front  │
                                                     │ end (R3F/Three)│
                                                     └────────────────┘
```

- **Frontend + API layer:** Next.js (App Router). API routes read from Postgres and serve the dataset to the client; they never call VRChat directly.
- **Database:** Postgres, accessed via an ORM (Prisma or Drizzle — pick one at implementation time).
- **Sync job:** A separate scheduled process (Vercel Cron hitting a protected internal route, or a standalone worker via GitHub Actions/Fly/Railway cron — whichever fits the deployment target) that holds the only code path allowed to talk to VRChat.
- **Secrets:** VRChat service-account credentials and TOTP secret live only in server-side environment variables / a secrets manager. Never bundled into client JS, never logged in full.

## 7. Data Model (Postgres)

### `worlds`
| Column | Type | Notes |
|---|---|---|
| id | text (PK) | VRChat world ID, e.g. `wrld_xxx` |
| name | text | |
| description | text | |
| author_id | text | |
| author_name | text | |
| capacity | int | |
| recommended_capacity | int | |
| favorites | int | |
| visits | int | |
| heat | int | |
| popularity | int | |
| occupants | int | as of last sync |
| tags | text[] | raw VRChat tags |
| release_status | text | |
| platforms | text[] | derived from Unity packages, e.g. `standalonewindows`, `android` |
| thumbnail_url | text | |
| image_url | text | |
| vrchat_created_at | timestamptz | from VRChat |
| vrchat_updated_at | timestamptz | from VRChat |
| popularity_score | numeric | computed blend used for star size/brightness |
| pos_x, pos_y, pos_z | float | computed embedding coordinates |
| cluster_id | int | computed |
| cluster_label | text | human-readable genre label for the cluster |
| color_hex | text | derived from cluster |
| last_synced_at | timestamptz | |

### `sync_runs`
| Column | Type | Notes |
|---|---|---|
| id | serial (PK) | |
| started_at | timestamptz | |
| finished_at | timestamptz | |
| status | text | `success` / `partial` / `failed` |
| worlds_seen | int | |
| worlds_upserted | int | |
| error_message | text | nullable |

## 8. Data Pipeline (inside the daily sync)

1. **Fetch** — authenticated calls to VRChat's world search/list endpoints across a defined set of queries (by sort order and by tag) with pagination; conservative pacing between requests.
2. **Upsert raw fields** into `worlds`.
3. **Embed** — build a feature representation per world from tags (+ name/description if using text embeddings).
4. **Reduce** — project to 3D (e.g. UMAP) → `pos_x/y/z`.
5. **Cluster** — group into genre clusters (e.g. k-means or HDBSCAN on the same feature space) → `cluster_id`, `cluster_label`, `color_hex`.
6. **Score** — compute `popularity_score` from heat/popularity/visits/favorites.
7. **Finalize** — mark `last_synced_at`, write the `sync_runs` row.

*Note: the exact embedding/clustering method is an implementation detail worth prototyping offline against a sample export before wiring it into the daily job — see Open Questions.*

## 9. Internal API Endpoints (Next.js)

- `GET /api/worlds` — returns the current dataset (id, name, thumbnail, tags, popularity_score, pos_x/y/z, cluster_id, color_hex, etc.) for the frontend to render. Cacheable; changes at most once a day.
- `GET /api/worlds/[id]` — full detail for the panel (if not already inlined in the list payload).
- `POST /api/sync` (internal only, protected by a secret header, invoked by the scheduler) — triggers the sync job, or the sync job runs as an independent script/worker rather than a public route, depending on hosting choice.

## 10. Authentication Notes (VRChat side)

- Use a **dedicated VRChat service account** for the sync job, not a personal account.
- VRChat's 2FA must be **TOTP/authenticator-based**, not email-based OTP, so the daily job can generate a valid code unattended from a stored TOTP secret.
- Persist the resulting session/auth cookie (encrypted at rest) between runs to avoid a fresh login challenge every day; re-authenticate only when the session has expired.
- This is an unofficial, community-documented API — no official support or SLA, and its own guidance discourages high-frequency polling. Keep the sync to once a day, at a conservative pace, and be prepared for endpoints to change without notice.

## 11. Non-Functional Requirements

- **Security:** no VRChat credentials or session tokens ever reach the client bundle; the sync trigger route (if HTTP-based) requires a shared secret.
- **Performance:** starfield should hold ~60fps on mid-range hardware with a few thousand rendered worlds, via instancing rather than one mesh per star.
- **Resilience:** sync is idempotent (upsert by world id); a failed run doesn't wipe or corrupt existing data; failures are logged to `sync_runs`.
- **Transparency:** the UI should show a "data as of [date]" indicator so users understand freshness.

## 12. Tech Stack

- **Frontend/app:** Next.js (App Router), React
- **3D rendering:** Three.js via `react-three-fiber` + `drei` helpers
- **Database:** Postgres, with Prisma or Drizzle as the ORM (pick one during setup)
- **Scheduling:** platform-native cron (e.g. Vercel Cron) or an external scheduled worker, calling into the sync job
- **Hosting:** Next.js app on Vercel (or similar); managed Postgres (e.g. Neon/Supabase/RDS) — final choice left to implementation

## 13. Suggested Build Phases

1. **Scaffold** — Next.js app, Postgres schema/migrations, env/secrets config.
2. **Sync MVP** — authenticate to VRChat (TOTP), pull worlds for a handful of queries, upsert raw fields only (no embedding yet).
3. **Embedding & clustering** — compute `pos_x/y/z`, `cluster_id`, `popularity_score`; backfill.
4. **Starfield frontend** — fetch dataset, render instanced points, orbit camera, click-to-select.
5. **World detail panel + Visit button.**
6. **Search & filter UI.**
7. **Scheduling + observability** — wire up the daily cron and `sync_runs` logging/alerting.
8. **Stretch:** free-fly camera mode, "trending" pulse animation, guided tours of top worlds.

## 14. Risks & Open Questions

- **API stability:** unofficial API, no SLA — endpoints or auth flow could change; monitor and fail gracefully.
- **Corpus definition:** what exactly counts as "the map"? Needs a concrete decision (e.g. top 2,000 by popularity + top 200 per major tag) rather than "all worlds," which isn't retrievable.
- **Account risk:** automated access carries some risk of action against the service account per VRChat's informal guidance — use a dedicated low-frequency account and pace requests conservatively.
- **Embedding method:** tag-only one-hot vs. text-embedding of name/description — affects cluster quality; worth a quick offline experiment before finalizing the pipeline.
- **Visit link fidelity:** the current plan links out to the world's VRChat.com page rather than deep-linking straight into a live instance; revisit if a lower-friction, still-compliant launch flow becomes viable.
