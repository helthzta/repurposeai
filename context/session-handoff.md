<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-07-29_

## Status

User handed over a large product-note goal covering seven areas; all seven
were implemented in this session:

1. **Brand logo upload** — new file input in the Upload step's Brand
   Information section (`UploadStep.tsx`), reusing the existing `logo_path`
   column and `brand-logos` bucket that already existed but were unwired.
   `uploads/sign` and `uploads/confirm` now handle a `"logo"` kind (updates
   `brand_profiles.logo_path` directly instead of inserting a source video).
2. **API section removed from the UI** — nav item, `/app/api` page +
   `api-client.tsx`, and the Settings "API Keys" section are gone. The
   backend (`api_keys` table/routes, `/api/v1/commercials`) is intentionally
   left in place, just unreachable from the UI now (D-005).
3. **Projects vs History split** — `/projects/[id]` is a new page listing
   every generated video for that project with a download button (no
   credit/token info). `ProjectGrid` takes a `mode: "projects" | "history"`
   prop: `mode="projects"` (used by `/projects`) links cards to the new
   detail page and never shows tokens; `mode="history"` (used by `/history`)
   keeps the old link to `/dashboard/[id]` and now also shows a per-project
   "N tokens" badge (sum of `credits_charged`).
4. **Username-based identity** — signup now collects a username alongside
   email/password in the same unified sign-in/signup form (D-006); email is
   no longer shown anywhere in the UI (Settings, sidebar) — username is.
   `profiles.username` (unique, not null) added in migration `0016`.
5. **Rate limiting on every endpoint** — `src/lib/rate-limit.ts` (in-memory,
   fixed-window, per-process — D-007) is applied via `withLogger()`'s new
   default (`src/lib/logger.ts`), so every route gets a baseline 120 req/min
   per-IP limit automatically. AI-calling/costly routes (`analyze`,
   `scripts/ideas`, `scripts/generate`, `scripts/[id]/assist`,
   `generations` create/regenerate, `v1/commercials`) pass a tighter limit.
   Every route handler now goes through `withLogger` — the 8 that were
   hand-rolled before (`projects/[id]/duplicate`, `api-keys/[id]`,
   `v1/commercials`, `v1/commercials/[id]`, `errors`, `analyze`,
   `generations`, `generations/[id]/regenerate`) were converted, preserving
   their existing special-case behavior (e.g. `insufficient_credits` → 402).
6. **Admin dashboard** — `profiles.is_admin` (migration `0016`) gates
   `/admin` (page-level `redirect()` guard, same pattern as
   `/dashboard/[projectId]`) and `/api/admin/*` (`requireAdmin()` in
   `src/lib/admin.ts`). Overview stats (users, projects, generations,
   completed/failed, total credits spent) + a full user table
   (`/admin`) drilling into per-user projects/generations/credit activity
   (`/admin/users/[id]`). Nav shows "Admin" only when `profile.is_admin`.
7. **Payment explicitly untouched**, per instruction.

`npx tsc --noEmit` and `npx eslint . --fix` are clean (only pre-existing,
unrelated `react-refresh/only-export-components` warnings and one
pre-existing `next-env.d.ts` lint error remain — neither touched by this
session). Dev server smoke-tested on a scratch port — pages compile and
render.

## Current branch

`main`. Nothing committed this session (user hasn't asked). New files:
`supabase/migrations/0016_username_and_admin.sql`, `src/lib/rate-limit.ts`,
`src/lib/admin.ts`, `src/app/projects/[id]/page.tsx` +
`project-videos-client.tsx`, `src/app/api/admin/overview/route.ts`,
`src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`,
`src/app/admin/page.tsx` + `admin-client.tsx`,
`src/app/admin/users/[id]/page.tsx` + `user-detail-client.tsx`. Deleted:
`src/app/api/page.tsx`, `src/app/api/api-client.tsx`. Everything else is
edits — see `git diff` for the full list.

## Half-done / needs manual follow-up

- **Migration `0016` (and, unverified, `0012`–`0015` before it) not applied**
  to the live Supabase project — per explicit instruction, no migration was
  run this session. Apply all of `0012` through `0016` in order before
  testing anything analysis/generation/username/admin-related.
- **After applying `0016`, manually flip your own row to admin**:
  `update public.profiles set is_admin = true where email = '...';` — no
  user starts as admin, and there's no UI to grant it (by design — a second
  admin would have to be granted the same way, or you build a grant flow
  later).
- **Discovered but not fixed: `middleware.ts`'s page-level auth gate does
  not appear to fire in local dev.** A fully unauthenticated `curl` to bare
  `/dashboard`, `/projects`, `/history`, `/credits`, `/settings` all
  returned HTTP 200 (rendered the real page), while `/admin` correctly
  redirected (307) — but that 307 turned out to come from `/admin/page.tsx`'s
  own explicit `requireUser()`/`redirect()` guard (same pattern used by
  `/dashboard/[projectId]`), not from middleware. This predates this session
  — only `/admin` was added to `PROTECTED_PATHS`; the gating logic itself
  wasn't touched. No actual data leak (every `/api/*` route independently
  calls `requireUser()`), but anonymous visitors can currently see page
  shells that should redirect to `/login`. Logged as D-008; needs its own
  investigation (dev-server-only quirk vs. a real gap — check against a
  production build) rather than a quick patch.
- None of this session's changes have been exercised against a live Supabase
  project (username uniqueness/signup trigger, admin queries, logo upload to
  the real `brand-logos` bucket) — only typechecked, linted, and smoke-
  tested for compilation.

## First action next session

1. Apply migrations `0012` through `0016` (in order) to the live Supabase
   project, then flip one profile's `is_admin` to true manually.
2. Run one full real flow: sign up with a username → upload with a logo →
   analyze → ideas → script → generate → check `/projects/[id]` shows the
   video → check `/history` shows token usage → check `/admin` shows that
   user and their spend.
3. Decide whether the `middleware.ts` auth-gating gap (D-008) is worth
   fixing now or later — it's a real finding, just outside today's ask.

## Blockers

Migrations unapplied (by explicit instruction this session), no live test
run yet, and the middleware finding above needs a decision.
