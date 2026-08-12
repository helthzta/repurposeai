<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-08-13_

## Status

Three pieces of work this session, in order — full reasoning in
`decision-log.md` D-022–D-031 and `learned-rules.md` R-047–R-059:

1. **Dodo Payments billing** for Starter/Pro — one-time payment per 30-day
   period (not Dodo Subscriptions, a mid-build user redirect from the
   original plan), tracked entirely in Supabase. Checkout is a Next.js
   route; entitlement granting (`dodo-webhook`) and grace-period downgrade
   (`expire-subscriptions`, scheduled every 6h) are deployed Supabase Edge
   Functions, chosen specifically to have a stable public URL independent
   of the Next.js app's own unresolved hosting situation. A real
   pre-existing security gap was found and fixed along the way: `profiles`
   had no column-level UPDATE restriction, so any signed-in user could
   self-grant `plan`/`credits_balance`/`is_admin` directly — now
   grant-restricted to just `full_name`/`username`/`avatar_url`.
   **Code-complete and deployed, but not yet usable** — no Dodo account is
   wired up (see "Blockers" below).
2. **Visual Quality relabel** — the Generate step's quality picker now
   shows "720p" and "HD 1080p" instead of Standard/High/Ultra (Ultra
   removed). This was flagged before building: Seedance's real ceiling is
   720p for both remaining tiers, so "1080p" is a label only, not a new
   capability — the user chose to proceed with it anyway after hearing
   that. `QUALITY_LABELS` in `types.ts` carries a comment explaining this
   isn't an oversight, so it doesn't get "fixed" later by someone who
   didn't see this conversation.
3. **Migrations consolidated to one file.** All 29 incremental migration
   files replaced by `supabase/migrations/0001_baseline.sql`, built by
   directly introspecting the live project's schema (tables, constraints,
   RLS, functions, triggers, storage, the billing cron job) rather than
   trusting the old files' text — this project's migration history had
   confirmed drift from reality before this session even started
   (R-024/R-045), so live introspection was the only way to be sure the
   consolidated file was actually correct. Old files moved to
   `supabase/migrations/_archive/` (has its own README; not applied by any
   tooling, git-blame reference only). Verified with static checks only
   (table/policy/index counts cross-checked against the live introspection
   query results, parens/dollar-quote balance) — did NOT do a live dry-run
   apply, since the only way to test that would be a paid Supabase branch
   and spending money wasn't asked for. Edge Function code is explicitly
   NOT part of this file (can't be — SQL migrations and Deno Edge
   Functions are different deploy mechanisms); SETUP.md §2 and §8 together
   cover the full bootstrap sequence.

## Current branch

`main`, working tree has this session's changes uncommitted (not asked to
commit). Since the *previous* handoff: new `supabase/migrations/0001_baseline.sql`
+ `supabase/migrations/_archive/` (29 old files + README); the old
`supabase/migrations/000X_*.sql` files at the top level are gone (moved, not
deleted — recoverable from `_archive/` or git history either way). Modified:
`GenerateStep.tsx`, `types.ts` (added `QUALITY_LABELS`), `project-videos-client.tsx`,
`credits-client.tsx`, `help-client.tsx` (all for the quality relabel), plus
`SETUP.md` (migration + billing sections).

## Blockers

Billing is code-complete and deployed but not usable yet:
1. No Dodo account wired up — `DODO_PAYMENTS_API_KEY` unset, `npm run
   setup:dodo` never run, so the two product-id env vars don't exist.
2. `DODO_PAYMENTS_WEBHOOK_KEY` isn't set on the `dodo-webhook` Edge
   Function (the one step that couldn't be done headlessly — a real
   secret only the account holder has).
3. No real payment has ever been run through this end to end — the
   riskiest unverified assumption (whether Checkout Session `metadata`
   actually round-trips onto the webhook payload) needs a live test to
   confirm; `dodo-webhook` has fallback resolution paths in case it doesn't.

Not a blocker on further code work, just on live testing/going live.

## First action next session

1. Get a Dodo test-mode account, run `npm run setup:dodo`, set the webhook
   secret it prints, run one real test-mode payment end to end. Watch
   `error_logs` for any `dodo-webhook` `logUnresolved` rows.
2. If `0001_baseline.sql` needs stronger verification than the static
   checks already done: ask about spinning up a disposable (paid) Supabase
   branch to actually apply it fresh.
3. Resolve hosting target (D-007) — still open.
