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
| Billing | Dodo Payments (`dodopayments` SDK) — one-time-payment checkout per 30-day period, not Dodo Subscriptions (D-026) | |
| Background/scheduled jobs | Supabase Edge Functions (Deno, `supabase/functions/*`) + `pg_cron`/`pg_net` — the only scheduled job in the app (R-055) | |
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
- The Upload step's dropzone (`UploadStep.tsx`) is file-upload only for the
  competitor ad — through `/api/uploads/sign` + `/api/uploads/confirm`.
  The earlier "Paste Link" mode (`/api/uploads/from-link`, D-009) was
  removed by explicit request (R-035); the public v1 API's own
  URL-based ingestion (`/api/v1/commercials`) is unrelated and untouched.
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
- **Billing (D-026)** — `POST /api/billing/checkout` (session-authed Next.js
  route, `src/lib/payments/{plans,dodo}.ts`) creates a Dodo Checkout Session
  for a one-time payment against the Starter/Pro Product and returns its
  hosted `checkout_url`; the browser redirects there directly. Entitlement is
  never granted from this route or the post-payment browser redirect — only
  from `payment.succeeded`, handled by the `dodo-webhook` Supabase Edge
  Function (`supabase/functions/dodo-webhook`, R-052/R-057), which grants
  `PLAN_CONFIG[plan].credits` (reset, not top-up — R-053), sets
  `profiles.plan`, and stamps `plan_period_end`/`plan_grace_end` (+30d/+33d).
  A second scheduled Edge Function, `expire-subscriptions`, runs every 6h via
  `pg_cron`/`pg_net` (migration `0029`) and downgrades anyone past
  `plan_grace_end` with no renewal back to `'free'`, credits untouched
  (R-054/R-055). Both Edge Functions are a genuinely separate Deno
  deploy/runtime from the Next.js app — `supabase/functions` is excluded
  from the root `tsconfig.json`, code is hand-kept in sync with
  `src/lib/payments/plans.ts` where it overlaps (R-052/R-053). The Custom
  plan never reaches any of this — Contact-Us only (D-023/D-024).

## Storage model

- **Postgres (Supabase)** — `profiles`, `projects`, `brand_profiles`,
  `source_videos`, `video_analyses`, `scripts`, `generations`,
  `credit_transactions`, `api_keys`, `error_logs`, `contact_submissions`,
  `payments`, `dodo_webhook_events`. As of 2026-08-13 the canonical schema
  source is a single consolidated file, `supabase/migrations/0001_baseline.sql`
  (R-058/D-031) — built by introspecting the live project directly, not from
  the 29 incremental files that got here (now archived under
  `supabase/migrations/_archive/`, reference/git-blame only). The *reasoning*
  behind individual columns/decisions from that history is preserved via the
  `D-0XX`/`R-0XX` references throughout this doc — only the "which numbered
  migration file added this" mapping was dropped as no longer meaningful.
  Notable shape, for orientation: `video_analyses` is reworked around
  virality (`company_does`, `viral_factor`, `relief`, `language`,
  `video_metrics`; `tone_of_voice`/`visual_style` load-bearing for auto-tone
  and "Original" camera style, R-007/R-009); `brand_profiles` is user-owned
  and reusable across projects (`user_id`, `label`, `is_default`,
  `context_image_paths`), not one-row-per-project (R-016); `profiles.plan`
  has 4 values — `'free'` (default/resting), `'starter'`/`'pro'` (set only by
  `dodo-webhook` on a real payment), `'custom'` (admin-set, Contact-Us only);
  `profiles`' billing columns (`dodo_customer_id`, `plan_period_end`,
  `plan_grace_end`) and its column-level UPDATE grant restriction (invariant
  9) are both from the same billing work (D-026–D-028). **The schema is
  confirmed fully current as of 2026-08-13** (introspected directly via the
  Supabase MCP while writing the consolidated file) — if this project's
  migration files are ever allowed to drift from the live schema again
  (R-024/R-045's original warning), trust the live schema, not any file.
- **Supabase Storage** — three buckets, all path-scoped as
  `{user_id}/{project_id}/{filename}` so ownership is derivable from the
  path's first segment (`supabase/migrations/0010_storage_buckets.sql`):
  - `source-videos` (private, 500MB limit) — uploaded ads.
  - `generated-videos` (private, 500MB limit) — provider output, mirrored
    in via `mirrorToStorage` (`src/lib/storage.ts`). Accepts optional fetch
    headers (`PollResult.outputHeaders`) since not every provider's output
    URL is publicly fetchable — OpenRouter's video content endpoint requires
    the same bearer token used to poll it.
  - `brand-logos` (public read, 10MB limit) — brand logo *and* brand
    context-image uploads (`kind: "logo"` / `kind: "context_image"`), path
    `{user_id}/{brand_profile_id}/{filename}` (second segment is a brand
    profile id, not a project id, since brand profiles aren't project-scoped
    — the bucket's RLS only checks the first segment against `auth.uid()`,
    so this doesn't need its own policy; see `uploads/sign`+`uploads/confirm`
    routes, which accept either `projectId` or `brandProfileId` depending on
    `kind`). A `logo` confirm overwrites `brand_profiles.logo_path`; a
    `context_image` confirm appends to `context_image_paths` (array) instead
    of replacing it. Being public means a plain URL (`publicStorageUrl()` in
    `storage.ts`) is enough to hand either one to a third party — used both
    by `gemini.ts` (fetches the bytes as an image Part for script-writing
    calls) and `generation.ts` (hands the logo's URL straight to Seedance as
    an `input_references` reference image, D-020, so on-screen branding in
    the actual generated video is grounded in the real logo, not just
    Gemini's text description of it).
- **No cache/ephemeral store, and (still) no application-level job queue** —
  polling for generation status is request-driven (client polls
  `GET /api/generations/[id]`, which calls `pollAndFinalize`), not backed by
  a queue or cache layer. The one exception is billing's grace-period
  downgrade, which genuinely needs to run without a request to trigger it —
  solved with `pg_cron`/`pg_net` calling a Supabase Edge Function
  (`expire-subscriptions`) directly, not application code (see the Billing
  bullet above and R-054/R-055).

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
9. `profiles` UPDATE is column-grant-restricted for `authenticated` to
   exactly `full_name`/`username`/`avatar_url` (migration `0028`, D-028) —
   RLS alone (`profiles_update_own`) only ever gated which *row*, never
   which *column*, so this is a real Postgres privilege, not just app
   discipline. Adding a new self-editable profile field needs a migration
   (`grant update (...)`) in addition to `/api/profile`'s `EDITABLE_FIELDS`
   (R-056) — every other field (`credits_balance`, `plan`,
   `plan_period_end`, `plan_grace_end`, `dodo_customer_id`, `is_admin`) must
   only ever change via `spend_credits` or the service-role key
   (webhook/cron/admin routes), never a direct client update.
