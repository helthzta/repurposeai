<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-07-29_

## Current phase

Core pipeline (upload → analyze → ideas → script → settings → generate →
result) is fully implemented (see prior sessions). This session added:
brand logo upload, a Projects/History split (Projects shows downloadable
generated videos with no token info; History unchanged + now shows token
usage), username-based signup/identity (email hidden from UI), rate
limiting on every endpoint, an admin dashboard, and removed the API-keys UI
(backend left intact). Payment intentionally still not built.

**Nothing has run against the live Supabase project yet** — typechecked/
linted/dev-server-smoke-tested only, across this and prior sessions.

## In progress

- Migrations `0012`–`0016` are written but **not applied** to the live
  Supabase project (no DB CLI/credentials in this environment, and this
  session was explicitly told not to run them). Apply in order via
  `SETUP.md` §2, then manually set one profile's `is_admin = true`.

## Open questions

- Migrations `0012`–`0016` need applying, then a full live run, before
  anything analysis/generation/admin-related can be trusted.
- **`middleware.ts`'s page-level auth gate appears not to fire** for bare
  `/dashboard`, `/projects`, `/history`, `/credits`, `/settings` in local
  dev (see `decision-log.md` D-008) — needs a decision on whether/when to
  investigate and fix.
- Is Veo still a planned third video provider, or has the plan settled on
  Seedance + Higgsfield? (`project-overview.md`)
- Which package manager is canonical — npm or bun? Both are present.
- Is there a deploy target/hosting provider yet? Matters for the ffmpeg
  binary, and for whether the in-memory rate limiter needs to become
  distributed (D-007).
- Are tests planned? No test runner/config exists yet.

## Next steps (max ~5)

1. Apply migrations `0012` through `0016` to the live Supabase project, in
   order, then grant yourself `is_admin`.
2. Run one full real flow end-to-end, including a fresh signup with a
   username, a logo upload, and a look at `/admin`.
3. Decide on the middleware auth-gating finding (D-008).
4. Resolve hosting target — also now relevant to whether rate limiting
   needs a shared store instead of in-memory.
