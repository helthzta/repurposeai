<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-07-29 (later session)_

## Current phase

Core pipeline is fully implemented (see prior sessions). Same-day prior
session added: logo upload, Projects/History split, username identity, rate
limiting, admin dashboard, API-keys UI removal. This session added: a Video
Link alternative to uploading the competitor ad, a Website Link that's
scanned and fed into script-writing prompts, and a Regenerate option on the
3 mini-script ideas. Payment intentionally still not built.

**Nothing has run against the live Supabase project yet, across any recent
session** — typechecked/linted/dev-server-smoke-tested only.

## In progress

- Migrations `0012`–`0017` are written but **not applied** to the live
  Supabase project (explicit standing instruction: don't run migrations,
  apply manually). Apply in order via `SETUP.md` §2, then manually set one
  profile's `is_admin = true`.

## Open questions

- Migrations `0012`–`0017` need applying, then a full live run, before
  anything analysis/generation/admin/website/video-link-related can be
  trusted.
- `fetchWebsiteText`'s regex-based HTML stripping (`src/lib/website.ts`) is
  untested against a real website — verify it produces sane text once
  `0017` is applied.
- `middleware.ts`'s page-level auth gate still appears not to fire for bare
  `/dashboard`, `/projects`, `/history`, `/credits`, `/settings` (D-008,
  found last session) — still unresolved, needs a decision.
- Is Veo still a planned third video provider, or has the plan settled on
  Seedance + Higgsfield? (`project-overview.md`)
- Is there a deploy target/hosting provider yet? Matters for the ffmpeg
  binary, and for whether the in-memory rate limiter needs to become
  distributed (D-007).
- Are tests planned? No test runner/config exists yet.

## Next steps (max ~5)

1. Apply migrations `0012` through `0017` to the live Supabase project, in
   order, then grant yourself `is_admin`.
2. Run one full real flow exercising every new input: Video Link upload,
   Website Link scan, Ideas-step Regenerate, admin dashboard.
3. Decide on the middleware auth-gating finding (D-008).
4. Resolve hosting target.
