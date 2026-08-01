<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-08-01 (later session)_

## Current phase

Core pipeline fully implemented. Same-day sessions shipped: (1) removed
Seedance 15s+15s chaining, 15s is now the sole active duration with a 30s
"Coming Soon" state; (2) surfaced the analyzed video's tone as a chip on the
Idea step; (3) turned brand details from per-project into reusable,
account-level brand profiles; (4) split login into separate Sign In/Sign Up
screens with a redirect-if-already-authenticated check on both. Payment
intentionally still not built.

**Migrations `0012`–`0019` are now applied to the live Supabase project**
(via the Supabase MCP, this session) — the live schema is fully current.
There are 3 real users / 26 real projects on this project; the `0019`
brand-profile backfill has already run against that real data (verified: one
default per user, zero projects left without a `brand_profile_id`). App code
itself still hasn't been exercised end-to-end against this live project —
verified so far only by `tsc`/`eslint`/`next build`.

## In progress

- None — migrations are unblocked. Next real task is a live manual run of
  the app (see Next steps).

## Open questions

- `middleware.ts`'s page-level auth gate still appears not to fire for bare
  `/dashboard`, `/projects`, `/history`, `/credits`, `/settings` (D-008) —
  still unresolved, needs a decision.
- Migration history bookkeeping: `0012`–`0017` are live on the schema but
  were never recorded in Supabase's tracked migration history (applied
  manually outside the CLI at some point) — only `0001`–`0011` and now
  `0018`–`0019` show as tracked. Not a functional problem (schema is
  correct), but could confuse future CLI-based migration workflows.
- Is Veo still a planned third video provider, or has the plan settled on
  Seedance + Higgsfield? (`project-overview.md`)
- Is there a deploy target/hosting provider yet? Matters for whether the
  in-memory rate limiter needs to become distributed (D-007).
- Are tests planned? No test runner/config exists yet.

## Next steps (max ~5)

1. Grant yourself `is_admin` (`update public.profiles set is_admin = true
   where email = '...'`) if not already done.
2. Run one full real flow against the live project: sign up via `/signup`,
   create a brand profile, start a project against it, confirm 15s
   generation works and 30s shows "Coming Soon", confirm the Idea step shows
   the detected tone. Also confirm `/login`/`/signup` redirect straight to
   `/dashboard` when already signed in.
3. Spot-check a couple of the 3 pre-existing users' inherited default brand
   profile (from the `0019` backfill) — confirm it's a reasonable pick.
4. Decide on the middleware auth-gating finding (D-008).
5. Resolve hosting target.
