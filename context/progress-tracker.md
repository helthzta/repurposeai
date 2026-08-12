<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-08-13_

## Current phase

2026-08-13 session, three things in order (fuller detail in
`decision-log.md` D-022–D-031, `learned-rules.md` R-047–R-059,
`session-handoff.md`):

1. **Dodo Payments billing** (Starter/Pro) — one-time payment per 30-day
   period, tracked/enforced entirely in Supabase (not Dodo Subscriptions).
   Checkout is a Next.js route; `dodo-webhook` (grants credits/plan) and
   `expire-subscriptions` (grace-period downgrade, scheduled every 6h) are
   deployed Supabase Edge Functions. **Not yet usable live** — no Dodo
   account wired up, `npm run setup:dodo` hasn't been run, webhook secret
   isn't set. See "Next steps" below.
2. **Visual Quality relabel** — Generate step now shows "720p"/"HD 1080p"
   (was Standard/High/Ultra), Ultra removed as a choice. Explicit user
   choice made *after* being told "HD 1080p" doesn't reflect a real
   capability change — Seedance still renders that tier at 720p
   (`RESOLUTION_BY_QUALITY` in `seedance.ts` untouched). `QUALITY_LABELS` in
   `types.ts` is the single source for the display strings (D-030/R-059).
3. **Migrations consolidated to one file** — `supabase/migrations/0001_baseline.sql`
   replaces the 29 incremental files (now archived under
   `supabase/migrations/_archive/`, reference-only). Built by directly
   introspecting the live project's actual schema, not from the old files'
   text — this project's migration history had confirmed drift before
   (R-024/R-045), so trusting the live DB over any file was deliberate.
   Verified via static checks (table/policy/index counts match the live
   introspection exactly, parens/dollar-quotes balanced) — **not** via an
   actual dry-run apply (would need a paid Supabase branch, didn't spend
   money on that without asking first). Edge Functions are NOT in this file
   (can't be — different deploy mechanism); SETUP.md §2/§8 covers both.

## NOT yet done — billing blocks

1. `DODO_PAYMENTS_API_KEY` not set → `npm run setup:dodo` not run →
   `DODO_STARTER_PRODUCT_ID`/`DODO_PRO_PRODUCT_ID` don't exist → checkout 500s.
2. `DODO_PAYMENTS_WEBHOOK_KEY` not set on the Edge Function (the one
   necessarily-manual step) → every webhook delivery 500s until it is.
3. No real payment has ever been run through this end to end.
4. Nothing from this session was click-tested in a browser.

## Next steps (max ~5)

1. Get a Dodo test-mode account, run `npm run setup:dodo`, set the webhook
   secret it prints, run one real test payment end to end.
2. If you want stronger confidence in `0001_baseline.sql` than static
   checks gave: spin up a disposable Supabase branch (costs money, needs
   your go-ahead) and apply it there as a true dry run.
3. Resolve hosting target (D-007) — still open, blocks the Next.js side of
   billing (checkout route) even though the Edge Functions don't need it.
