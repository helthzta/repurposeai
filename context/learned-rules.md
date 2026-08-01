<!-- This file is the project's compressed judgment. Every entry should be
a rule or heuristic that would change what a future session does — not a
story. One line each: constraint + why, in under ~20 words if possible.
No status field needed here — if it's here, it's active. If it stops being
true, delete it or move it to archive with a note of what replaced it. -->

_Last updated: 2026-07-29 (later session)_

## Rules learned so far

<!-- Format:
R-001 · <rule> · <why, ≤10 words>
-->
R-001 · When a `VideoProvider`'s output URL needs auth to fetch, return it via `PollResult.outputHeaders`, not by baking creds into the URL · `mirrorToStorage` threads headers through; keeps provider swaps to one file.
R-002 · Never mirror an intermediate/non-deliverable asset into `generated-videos` under the user's own path · that bucket's RLS lets the owner read anything under their prefix directly, not just app-linked files — re-fetch from the provider instead.
R-003 · A provider's single-call duration cap belongs on `VideoProvider.maxClipDurationSeconds`, not hardcoded in `generation.ts` · keeps the provider-agnostic guard (reject > cap) per architecture invariant #5; used for chaining until that was removed, now for rejecting unsupported durations.
R-004 · When a user's shorthand product note lists fields/config to change, check what's read downstream before dropping anything not mentioned · shorthand notes are rarely exhaustive; ask (see D-002) rather than silently breaking a dependent feature.
R-005 · Prefer removing a DB column's *usage* over a destructive migration when a table might hold real user rows · `brand_profiles.tone`/`cta` left in schema, unused, rather than dropped (D-001).
R-006 · Tone and CTA are always AI-derived from the analyzed video, never manual input · user wants zero config, video already implies the answer.
R-007 · Keep any `video_analyses`/`brand_profiles` field a shipped feature depends on, even if a rewrite note omits it · shorthand notes aren't exhaustive; dropping breaks dependents silently.
R-008 · The Ideas-step (concepts → pick → script) flow only replaces the dashboard UI, not `generateScripts` used by the public v1 API · v1 runs synchronously with no human to pick an idea.
R-009 · "Original" camera style passes the analyzed `visual_style` text directly into the video-gen prompt · reuses captured-but-unused data over a generic instruction.
R-010 · `withLogger()` applies a baseline per-IP rate limit to every route by default; pass a tighter `{ rateLimit }` option for AI-calling/costly endpoints · keeps rate limiting enforceable in one place instead of per-file.
R-011 · Admin cross-user queries must go through `requireAdmin()` (checks the caller's own `is_admin` via the RLS-scoped client, only then hands back the service-role client) · never let a non-admin session query other users' rows directly.
R-012 · "Credits spent" in the admin dashboard sums `generations.credits_charged` for `completed` generations only, not `credit_transactions` net of refunds · simple and accurate for completed jobs; revisit if precise net-spend accounting matters later.
R-013 · Website scanning (`fetchWebsiteText`) is best-effort and non-blocking — never throws, returns `null` on any failure · a dead/slow brand site must never block project creation.
R-014 · Video-link ingestion (`/api/uploads/from-link`) uploads via the RLS-scoped session client, not the admin client · the path is under the user's own prefix, same ownership model as a normal file upload — no need for service-role here.
R-015 · Any server-side `fetch(url)` that's supposed to return a video (Video Link ingestion, `/api/v1/commercials`) must check the response `content-type` starts with `video/` before trusting it · a YouTube/webpage link returns `text/html` with a 200, which silently corrupts the source row until Gemini rejects it at analysis time with an opaque error — validate at ingestion, not just at use.
R-016 · `brand_profiles` is user-owned and reusable (`user_id`, `label`, `is_default`), not one-row-per-project · projects reference one via `projects.brand_profile_id`; fetch a project's brand via `requireProjectBrand()` in `src/lib/projects.ts`, not a direct `brand_profiles.eq("project_id", ...)` query (that column no longer exists as of `0019`).
R-017 · "Only one default brand profile per user" is enforced in application code (unset-then-set in `PATCH /api/brand-profiles/[id]`), not a DB constraint · avoids a trigger for a soft invariant; add a partial unique index if it ever proves too weak.
R-018 · `brand-logos` storage paths are `{user_id}/{brand_profile_id}/{filename}`, not `{user_id}/{project_id}/{filename}` · brand profiles aren't project-scoped; safe because that bucket's RLS only checks the first path segment against `auth.uid()`, never the second.
R-019 · The API-keys UI is intentionally removed (nav/`/api` page/Settings) while the backend (`api_keys` table, `/api/v1/commercials`) stays live · "not needed" meant hide the surface, not delete the public API.
R-020 · Sign In (`/login`) and Sign Up (`/signup`) are separate screens (superseded the earlier unified-form decision) — Sign Up collects a username, Sign In doesn't, no auto-fallback between them · explicit user request; both share `src/components/auth/AuthCard.tsx` for chrome to avoid duplicating the visual shell.
R-022 · Both auth screens' `page.tsx` check `getUser()` server-side and `redirect("/dashboard")` if already signed in · a logged-in visitor's session persists — they should never be shown the sign-in/sign-up form again, not just silently allowed past it.
R-021 · "Video Link" (paste a URL instead of uploading) is scoped to the competitor ad only and lives as a mode toggle on its dropzone, not a separate field · the competitor ad is the one required, analyzed source video; file and link are two modes of the same input.
R-023 · When a migration drops a column an existing RLS policy references, drop (and recreate, if still needed) that policy *before* the `drop column` statement, not after · Postgres refuses `alter table ... drop column` while any policy still depends on it (`0019`'s first apply attempt failed this way — fixed by reordering, not by adding `cascade`).
R-024 · Before trusting `list_migrations`/migration history as "what's actually applied," diff it against the real schema (`list_tables` verbose) — this project's `0012`–`0017` were live on the schema but absent from tracked history (applied manually, outside the CLI, at some point).
