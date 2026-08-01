<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-08-01 (later session)_

## Status

**Latest same-day update**: applied all pending migrations to the live
Supabase project (`xxitlqjgmfqxesqiuouk`) via the Supabase MCP, at explicit
user request. Findings and fixes:
- Migrations `0012`–`0017` were already live on the schema (someone had
  applied them manually, matching the standing "I'll apply manually"
  instruction) but were **never recorded** in Supabase's migration history
  table — only `0001`–`0011` showed as tracked. The actual schema was
  correct; only the history bookkeeping was behind. Left as-is (didn't
  backfill fake history rows) — worth reconciling manually if the drift ever
  causes CLI confusion (`supabase migration list` will disagree with `git`).
- Only `0018` and `0019` were actually pending. `0018` applied cleanly.
- `0019` **failed on first attempt**: it dropped `brand_profiles.project_id`
  while the old `brand_profiles_all_own` RLS policy still referenced that
  column (`policy ... depends on column`). Fixed by reordering the migration
  — drop/recreate the policy *before* dropping the column — in both the
  local file and the applied SQL. The failed attempt rolled back atomically
  (verified via `list_tables` before retrying), so no partial state was left
  behind. Retried and succeeded.
- Verified after applying: all 3 real users have exactly one default brand
  profile each (22/2/2 profiles respectively, matching pre-migration
  `brand_profiles` row counts — no data lost), all 26 projects have a
  non-null `brand_profile_id`. Ran `get_advisors` for security/performance —
  nothing new beyond pre-existing, project-wide patterns already present on
  every other table (e.g. `auth.uid()` not wrapped in `(select ...)` in RLS
  policies) and a couple of expected INFO-level notes (new FK column
  unindexed, brand new index unused so far) — not addressed, out of scope
  for "run the migrations."
- **The live schema is now fully caught up with everything in
  `supabase/migrations/`.** The "migrations not applied" blocker that's been
  in this file for several sessions is resolved.

---

**Earlier same-day session**: split the unified sign-in/signup form into
separate `/login` (Sign In) and `/signup` (Sign Up) screens (supersedes
R-020/D-006's earlier "one form" decision — explicit user request). Both
`page.tsx`s are now server components that call `getUser()` and
`redirect("/dashboard")` if a session already exists, so a logged-in visitor
never sees either screen again (R-022) — this is what "already logged in
should persist" meant; Supabase's cookie-based session itself already
persisted correctly, nothing needed fixing there. Shared chrome extracted to
`src/components/auth/AuthCard.tsx` + `GoogleIcon.tsx`. Landing page nav's
second button now links `/signup` instead of `/dashboard`. Sign Up collects
username/email/password (fails clearly if the username's taken); Sign In is
email/password only, no auto-fallback to signup. Both keep the Google OAuth
button. Passing `tsc`/`eslint`/`next build`, not exercised against a live
Supabase project.

---

_Prior session (same day) status below — still accurate for that work:_

This session shipped a 3-part goal, all code-complete and passing
`tsc`/`eslint`/`next build`:

1. **Disable 30s generation, remove chaining** — Seedance's old 15s+15s
   chaining (clip1 + last-frame-seeded clip2, stitched via ffmpeg) is
   removed entirely: `advanceChainToClip2`/`finalizeChain` deleted from
   `src/lib/generation.ts`, `src/lib/ffmpeg.ts` deleted, `ffmpeg-static`
   dropped from `package.json`, `chain_stage`/`chain_clip1_job_id` dropped
   from `Generation` (DB drop in migration `0018`, unapplied). `POST
   /api/scripts/generate` now writes only the 15s master script (was
   15s+30s). `ScriptStep.tsx` shows the 15s script plus an always-visible,
   disabled "30s version — Coming Soon" button. `createGeneration` now
   rejects (`ApiError(400, ...)`) any request past a provider's
   `maxClipDurationSeconds` instead of chaining. `providers/seedance.ts` has
   a `TODO(native-30s)` comment on `maxClipDurationSeconds` — bumping it to
   30 is meant to be the whole change once Seedance's native 30s is wired up
   (the OpenRouter call already forwards `durationSeconds` straight through
   as `duration`).
2. **Surface original tone on the Idea page** — `deriveWorkflowPhase()` in
   `src/lib/projects.ts` now also returns `originalTone` (the latest
   completed `video_analyses.tone_of_voice`), threaded through
   `page.tsx` → `project-workflow-client.tsx` → `IdeaStep.tsx`, shown as a
   dismissable-free `Badge` chip ("Original tone: X") under the Idea step's
   heading. Hidden entirely (not "Not detected") when null — analysis
   incomplete or no tone extracted.
3. **Reusable brand profiles** — the biggest piece. `brand_profiles` is no
   longer 1:1 with a project; it's now user-owned (`user_id`, `label`,
   `is_default`), multiple per user, referenced by `projects.brand_profile_id`
   (migration `0019`, unapplied — see its inline comments for the backfill
   logic, and D-013 in decision-log for why it doesn't consolidate old
   per-project rows). New CRUD: `GET/POST /api/brand-profiles`,
   `PATCH/DELETE /api/brand-profiles/[id]`. New shared
   `src/components/brand/BrandProfileDialog.tsx` (add/edit form, used from
   both places below). Settings page (`settings-client.tsx`) got a
   `BrandProfilesSection` — list, add, edit, delete, default marked with a
   star. `UploadStep.tsx`'s old inline brand-details form is now a brand
   profile `Select` (defaults to the user's default profile, else newest)
   plus an "Add new brand" button that opens the same dialog inline.
   `POST /api/projects` now takes `brandProfileId` instead of raw brand
   fields. Every route that used to fetch `brand_profiles` by
   `eq("project_id", ...)` now goes through the new
   `requireProjectBrand(client, projectId)` helper in `src/lib/projects.ts`.
   `duplicate/route.ts` simplified — a duplicate just points at the same
   brand profile, nothing to copy anymore. The public v1 API
   (`/api/v1/commercials`) still takes a bare `brand` string; it now creates
   a one-off, non-default profile per call (D-012). Logo upload reuses the
   existing `/api/uploads/sign`+`/api/uploads/confirm` routes, widened to
   accept `brandProfileId` as an alternate scope id for `kind: "logo"`
   (`brand-logos` RLS only ever checked the first path segment, so this was
   safe — D-015/R-018).

## Current branch

`main`. Nothing committed this session yet. New migrations:
`supabase/migrations/0018_remove_generation_chaining.sql`,
`0019_reusable_brand_profiles.sql` — **both written AND applied** to the live
project this session (0019's on-disk version was corrected after the first
apply attempt failed; see Status above). New files:
`src/app/api/brand-profiles/route.ts`,
`src/app/api/brand-profiles/[id]/route.ts`,
`src/components/brand/BrandProfileDialog.tsx`. Deleted:
`src/lib/ffmpeg.ts`. Edited (non-exhaustive — see `git status`/`git diff`):
`src/lib/generation.ts`, `src/lib/ai/prompts.ts`, `src/lib/ai/gemini.ts`,
`src/lib/providers/{types,seedance}.ts`, `src/lib/types.ts`,
`src/lib/projects.ts`, `src/lib/storage.ts` (unchanged, checked only),
`src/app/api/scripts/generate/route.ts`, `src/app/api/generations/*`,
`src/app/api/scripts/ideas/route.ts`, `src/app/api/projects/route.ts`,
`src/app/api/projects/[id]/duplicate/route.ts`,
`src/app/api/v1/commercials/*`, `src/app/api/uploads/{sign,confirm}/route.ts`,
`src/components/workflow/{ScriptStep,GenerateStep,GenerationScreen,IdeaStep,UploadStep}.tsx`,
`src/app/dashboard/[projectId]/{page,project-workflow-client}.tsx`,
`src/app/settings/settings-client.tsx`, `package.json`/`package-lock.json`
(`ffmpeg-static` removed).

## Half-done / needs manual follow-up

- All migrations through `0019` are applied — schema is current. But the
  **app code has still never been exercised against this live project**
  (verified by build/typecheck/lint only). This is now the actual next step,
  not a migration-blocked one.
- The `middleware.ts` page-level auth-gating gap (D-008) is still
  unresolved — not touched this session.
- Migration history bookkeeping drift: `0012`–`0017` are live on the schema
  but absent from Supabase's tracked migration history (only `0001`–`0011`
  and now `0018`–`0019` show). Doesn't affect the app; could confuse
  `supabase migration list`/CLI-based workflows later — reconcile manually
  if that comes up.

## First action next session

1. Sign up via `/signup` (or sign in with an existing account), confirm
   redirect-when-already-logged-in works on both `/login` and `/signup`.
2. Create a brand profile in Settings, start a project picking it (or use
   the inline "Add new brand" from the Upload step), confirm the whole
   Upload → Analyze → Idea (tone chip visible) → Script (15s only, 30s
   "Coming Soon") → Generate → Result flow works end to end against the now
   fully-migrated live project.
3. Confirm editing/deleting a brand profile in Settings behaves (default
   reassignment on delete, in particular) — for the pre-existing users, spot
   check that their inherited default profile is a reasonable one.

## Blockers

None — migrations are applied. Still no live app-level test run yet (see
next steps above).
