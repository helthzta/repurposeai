# Architecture Context

<!-- Generated from package.json, tsconfig.json, middleware.ts, supabase/migrations/*.sql,
and src/lib/*. Citations inline. -->

## Stack

| Layer | Technology | Role |
|---|---|---|
| Framework | Next.js 15 (App Router), React 19 | SSR/routing, server components, route handlers under `src/app/api/*` |
| Language | TypeScript, `strict: true` (`tsconfig.json`) | |
| UI components | shadcn/ui on Radix primitives (`src/components/ui/*`), Tailwind CSS v4 | |
| Data fetching | `@tanstack/react-query` (client), direct Supabase queries in route handlers (server) | |
| Auth + DB | Supabase (Postgres + Auth + Storage), `@supabase/ssr` for cookie-based session | |
| AI | `@google/genai` (Gemini) for analysis/scripts/insights; provider-abstracted video gen (Seedance via OpenRouter live, Higgsfield stub) | |
| Hosting | {{TODO: confirm with a human — no deploy config found in repo}} | |
| Package manager | npm (`package-lock.json` present; `bunfig.toml` also present — {{TODO: confirm with a human which is canonical}}) | |

## System boundaries

- `src/app/api/*` — all server-side route handlers. Two auth modes:
  session-cookie (`requireUser`, dashboard's own fetches) and Bearer API key
  (`requireApiKey`, public `/api/v1/*` surface). See `src/lib/auth.ts`.
- `src/app/api/v1/commercials/*` — the only routes meant for third-party/API-key
  callers; everything else under `src/app/api/*` is for the dashboard's own
  fetches and is exempted from the page-level middleware redirect (see below)
  because each handler does its own auth.
- `src/lib/providers/*` — video-generation provider abstraction
  (`VideoProvider` interface: `submit`/`poll`). Add a provider by implementing
  the interface and registering it in `src/lib/providers/index.ts`; nothing
  else (routes, UI, credits) should need to change.
- `src/lib/ai/*` — Gemini calls: `gemini.ts` (analysis, scoring, script
  ideas/master-script), `prompts.ts` (prompt templates, including
  `videoPrompt` used to turn a script into a provider prompt). Tone and CTA
  are never user input — `toneNote()` in `prompts.ts` derives tone from the
  analyzed `tone_of_voice`, and every script prompt tells the model to pick
  its own CTA.
- Script flow is two-stage: `generateScriptIdeas` (3 short, un-persisted
  concepts — `/api/scripts/ideas`) then `generateMasterScript` (the one
  full script for whichever concept was picked — `/api/scripts/generate`).
  `generateScripts` (3 full scripts at once) is kept only for the
  synchronous public v1 API, which has no human in the loop to pick an idea.
- `src/lib/supabase/{client,server,admin}.ts` — three distinct Supabase
  clients: `client.ts` (browser, anon key), `server.ts` (server components/
  route handlers, cookie-scoped session, anon key + RLS), `admin.ts`
  (service-role key, bypasses RLS — used only for API-key auth lookups and
  error logging, never exposed to a user-scoped request path).
- `src/lib/generation.ts` — the shared generation lifecycle
  (`createGeneration`, `pollAndFinalize`) used by the dashboard's generate/
  regenerate routes and the public v1 API — the one place credit spend,
  provider submission, storage mirroring, and AI insight scoring are wired
  together. Also owns clip-chaining: a duration past a provider's
  `maxClipDurationSeconds` (Seedance: 15s) renders as an internal clip1 +
  a last-frame-seeded continuation clip2, stitched with `src/lib/ffmpeg.ts`
  into the single video that's actually delivered.
- `middleware.ts` — page-level auth gate only. Explicitly does NOT gate
  `/api/*` — those routes handle their own auth (see comment in the file).

## Storage model

- **Postgres (Supabase)** — `profiles`, `projects`, `brand_profiles`,
  `source_videos`, `video_analyses`, `scripts`, `generations`,
  `credit_transactions`, `api_keys`, `error_logs`
  (`supabase/migrations/0001`–`0016`). `generations.chain_stage`
  (`0012_generation_chaining.sql`) tracks in-flight multi-clip chaining.
  `video_analyses` was reworked around virality in `0013` — `company_does`
  (renamed from `business_category`), `viral_factor`, `relief`, `language`,
  `video_metrics` added; `marketing_strategy`, `offer`, `cta`,
  `narrative_structure` dropped; `tone_of_voice`/`visual_style` kept
  (load-bearing for auto-tone and "Original" camera style — see
  `learned-rules.md` R-007/R-009). `brand_profiles.tone`/`cta` still exist
  as columns but are no longer written by any code path — CTA/tone are
  fully AI-derived now (R-005/R-006). `0014` adds `projects.script_ideas`
  (idea-step cache), `0015` adds `scripts.target_duration_seconds`, `0016`
  adds `profiles.username` (unique, required at signup) and
  `profiles.is_admin` (gates `/admin`). **Applied state of `0012`–`0016`
  against the live project is unverified as of this note** — apply in order
  before testing anything analysis/generation/admin-related, see
  `progress-tracker.md`.
- **Supabase Storage** — three buckets, all path-scoped as
  `{user_id}/{project_id}/{filename}` so ownership is derivable from the
  path's first segment (`supabase/migrations/0010_storage_buckets.sql`):
  - `source-videos` (private, 500MB limit) — uploaded ads.
  - `generated-videos` (private, 500MB limit) — provider output, mirrored
    in via `mirrorToStorage` (`src/lib/storage.ts`). Accepts optional fetch
    headers (`PollResult.outputHeaders`) since not every provider's output
    URL is publicly fetchable — OpenRouter's video content endpoint requires
    the same bearer token used to poll it.
  - `brand-logos` (public read, 10MB limit) — brand logo uploads.
- **No cache/ephemeral store** — polling for generation status is
  request-driven (client polls `GET /api/generations/[id]`, which calls
  `pollAndFinalize`), not backed by a queue or cache layer.

## Auth and access model

- **Authentication** — Supabase Auth. Email/password (auto-fallback to
  `signUp` if the email doesn't exist) and Google OAuth
  (`src/app/login`, `src/app/auth/callback/route.ts`). Session held in
  cookies, refreshed by `middleware.ts` on every non-`/api` request.
- **Two auth modes for API access**: session cookie (`requireUser` in
  `src/lib/auth.ts`, for the dashboard's own calls) and Bearer API key
  (`requireApiKey`, sha256-hashed token lookup against `api_keys.key_hash`,
  for `/api/v1/*`). Every `api_keys` row's `last_used_at` is bumped on use.
- **Roles** — `profiles.is_admin` (added `0016`) gates `/admin` and the
  `/api/admin/*` routes via `requireAdmin()` (`src/lib/admin.ts`): it checks
  the caller's own row through the RLS-scoped client, then hands back the
  service-role client for the cross-user queries the dashboard needs — a
  non-admin can never reach another user's data this way. No user starts as
  admin; flip a row manually after applying `0016` (see the migration's
  trailing comment). Beyond that, still just the implicit owner/authenticated
  split; `Profile.plan` (`starter`/`pro`/`enterprise`) exists as a field but
  no plan-gated logic was found in the routes scanned — {{TODO: confirm with
  a human whether plan should gate any feature yet}}.
- **Rate limiting** — every route handler goes through `withLogger()`
  (`src/lib/logger.ts`), which now applies an in-memory, per-process fixed-
  window limit (`src/lib/rate-limit.ts`) before the handler runs — a
  generous IP-keyed default (120 req/min) unless the route passes a tighter
  `{ rateLimit }` option. AI-calling or otherwise costly routes (`analyze`,
  `scripts/ideas`, `scripts/generate`, `scripts/[id]/assist`, `generations`
  create/regenerate, `v1/commercials`) pass tighter limits. Single-process
  only by design (see decision-log.md D-007) — swap for a Postgres- or
  Redis-backed store if this ever runs behind more than one server process.
- **Ownership/scoping rule** — every table with user data (`projects` and
  everything hung off `project_id`) is scoped by Postgres RLS policies
  keyed on `auth.uid()` (e.g. `projects_all_own`,
  `brand_profiles_all_own` — see `supabase/migrations/0003_projects.sql`),
  not by application-layer filtering alone. Storage objects are scoped the
  same way via the path's first folder segment.

## Invariants

1. Every user-owned table has RLS enabled with an `auth.uid() = user_id` (or
   equivalent join-through) policy — verified in every migration from
   `0001` through `0008`.
2. Storage paths are always `{user_id}/{project_id}/{filename}` — ownership
   checks (both RLS policy and any app code) rely on this being the literal
   first path segment. Never write a file outside this convention.
3. Credit balance changes only ever go through `spend_credits` (Postgres
   function, `security definer`) — it raises `insufficient_credits` if a
   spend would take the balance negative, making concurrent spends safe.
   Never mutate `profiles.credits_balance` directly from application code.
4. The service-role (`admin`) Supabase client (`src/lib/supabase/admin.ts`)
   is only for API-key lookup and error logging — never used to serve a
   session-authenticated user's own data (that must go through the
   RLS-scoped `server.ts` client).
5. Adding a video provider means implementing `VideoProvider`
   (`src/lib/providers/types.ts`) and registering it in
   `src/lib/providers/index.ts` — route handlers and UI must not special-case
   a provider by name.
6. `/api/*` route handlers own their own auth; `middleware.ts` intentionally
   does not gate them (only the `/api` settings *page* itself is gated as a
   normal protected route).
7. A failed/errored generation or provider submission must refund credits
   (`refundCredits` in `src/lib/generation.ts`) — never leave a charge
   standing against a failed job.
8. A chained generation's intermediate clip1 video is never written to our
   own storage at all — it's re-fetched from the provider at stitch time —
   because `generated-videos`'s RLS policy (`generated_videos_owner_rw`)
   lets the owner read/download anything under their own path prefix
   directly via the Storage SDK, not just what the app links to; there's no
   way to store it there and keep it truly non-downloadable. The one
   exception is the last-frame seed image, which does sit at
   `{user_id}/{project_id}/{generation_id}-seed.jpg` for the few minutes
   clip2 takes to render (deleted immediately after the final merge) — a
   deliberately accepted gap since it's a single frame, not the clip
   itself. Only the merged output ever lands at the delivered
   `output_path`.
