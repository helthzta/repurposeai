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
  `IdeaStep.tsx` has a Regenerate action that just calls
  `/api/scripts/ideas` again — that route was never cache-checking, only the
  client's initial-mount effect was, so a fresh call always produces a fresh
  set (D-010's `website_summary` context can change what comes back too).
- The Upload step's dropzone (`UploadStep.tsx`) has an "Upload File" /
  "Paste Link" toggle for the competitor ad — mutually exclusive, switching
  modes clears the other's state. A file goes through the existing
  `/api/uploads/sign` + `/api/uploads/confirm`; a link goes through
  `/api/uploads/from-link` (D-009), which fetches the URL server-side and
  lands it in `source-videos` exactly like a file upload would, so
  everything downstream (analysis, etc.) doesn't know the difference.
- `src/lib/supabase/{client,server,admin}.ts` — three distinct Supabase
  clients: `client.ts` (browser, anon key), `server.ts` (server components/
  route handlers, cookie-scoped session, anon key + RLS), `admin.ts`
  (service-role key, bypasses RLS — used only for API-key auth lookups and
  error logging, never exposed to a user-scoped request path).
- `src/lib/generation.ts` — the shared generation lifecycle
  (`createGeneration`, `pollAndFinalize`) used by the dashboard's generate/
  regenerate routes and the public v1 API — the one place credit spend,
  provider submission, storage mirroring, and AI insight scoring are wired
  together. 15s is the only supported duration for now — a request past a
  provider's `maxClipDurationSeconds` is rejected with a clear error rather
  than chained into multiple clips (the old 15s+15s chaining — clip1 +
  last-frame-seeded clip2 stitched via ffmpeg — was removed once it became
  redundant; see `providers/seedance.ts`'s TODO for wiring up Seedance's
  native 30s support as a clean drop-in later).
- `middleware.ts` — page-level auth gate only. Explicitly does NOT gate
  `/api/*` — those routes handle their own auth (see comment in the file).

## Storage model

- **Postgres (Supabase)** — `profiles`, `projects`, `brand_profiles`,
  `source_videos`, `video_analyses`, `scripts`, `generations`,
  `credit_transactions`, `api_keys`, `error_logs`
  (`supabase/migrations/0001`–`0019`). `video_analyses` was reworked around
  virality in `0013` — `company_does` (renamed from `business_category`),
  `viral_factor`, `relief`, `language`, `video_metrics` added;
  `marketing_strategy`, `offer`, `cta`, `narrative_structure` dropped;
  `tone_of_voice`/`visual_style` kept (load-bearing for auto-tone, the
  Idea-step tone chip, and "Original" camera style — see `learned-rules.md`
  R-007/R-009). `brand_profiles.tone`/`cta` still exist as columns but are no
  longer written by any code path — CTA/tone are fully AI-derived now
  (R-005/R-006). `0014` adds `projects.script_ideas` (idea-step cache),
  `0015` adds `scripts.target_duration_seconds`, `0016` adds
  `profiles.username` (unique, required at signup) and `profiles.is_admin`
  (gates `/admin`). `0017` adds `brand_profiles.website_url`/
  `website_summary` — a brand's website is scanned best-effort
  (`src/lib/website.ts`, never blocks/fails) and fed into every
  script-writing prompt via `brandBrief()` in `prompts.ts`. `0018` drops
  `generations.chain_stage`/`chain_clip1_job_id` (added by `0012`, chaining
  removed — see the `generation.ts` note above). `0019` reshapes
  `brand_profiles` from one-row-per-project into a reusable, user-owned
  entity: adds `user_id`, `label`, `is_default`; drops `project_id` (was
  `unique`); `projects` gains `brand_profile_id` (nullable FK, `on delete set
  null`) to pick which of the user's profiles a project uses. RLS on
  `brand_profiles` switched from joining through `projects` to a direct
  `auth.uid() = user_id` check. "Only one default per user" is enforced in
  application code (`src/app/api/brand-profiles/[id]/route.ts`), not a DB
  constraint. `0020` drops `profiles.theme`/`locale`/`notify_on_completion` —
  the Settings page (renamed Profile, `/profile`, D-017) dropped Theme/
  Language/Notifications as features, not just UI (D-018); `profiles.avatar_url`
  (already existed, previously write-only via direct DB access) is now
  editable through `/api/profile`. **`0001`–`0020` are all applied to the
  live project** (`0020` applied via the Supabase MCP on 2026-08-02,
  confirmed via `list_migrations` + `list_tables`) — the schema is fully
  current as of this note.
- **Supabase Storage** — three buckets, all path-scoped as
  `{user_id}/{project_id}/{filename}` so ownership is derivable from the
  path's first segment (`supabase/migrations/0010_storage_buckets.sql`):
  - `source-videos` (private, 500MB limit) — uploaded ads.
  - `generated-videos` (private, 500MB limit) — provider output, mirrored
    in via `mirrorToStorage` (`src/lib/storage.ts`). Accepts optional fetch
    headers (`PollResult.outputHeaders`) since not every provider's output
    URL is publicly fetchable — OpenRouter's video content endpoint requires
    the same bearer token used to poll it.
  - `brand-logos` (public read, 10MB limit) — brand logo uploads, path
    `{user_id}/{brand_profile_id}/{filename}` (second segment is a brand
    profile id, not a project id, since brand profiles aren't project-scoped
    — the bucket's RLS only checks the first segment against `auth.uid()`,
    so this doesn't need its own policy; see `uploads/sign`+`uploads/confirm`
    routes, which accept either `projectId` or `brandProfileId` depending on
    `kind`).
- **No cache/ephemeral store** — polling for generation status is
  request-driven (client polls `GET /api/generations/[id]`, which calls
  `pollAndFinalize`), not backed by a queue or cache layer.

## Auth and access model

- **Authentication** — Supabase Auth. Separate Sign In (`src/app/login`) and
  Sign Up (`src/app/signup`) screens, each server-rendered with an
  already-authenticated check that redirects straight to `/dashboard` (so a
  logged-in visitor never sees either screen again — the session persists
  via cookies). Both support email/password and Google OAuth
  (`src/app/auth/callback/route.ts`); shared chrome lives in
  `src/components/auth/`. Session held in cookies, refreshed by
  `middleware.ts` on every non-`/api` request.
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
8. `generated-videos`'s RLS policy (`generated_videos_owner_rw`) lets the
   owner read/download anything under their own path prefix directly via the
   Storage SDK, not just what the app links to — never mirror an
   intermediate/non-deliverable asset into that bucket under the user's own
   path. (This was the reasoning behind never persisting a chained
   generation's intermediate clip1 to storage; chaining itself was removed —
   see the `generation.ts` note above — but the underlying RLS behavior and
   the rule it implies are still true for any future non-deliverable asset.)
