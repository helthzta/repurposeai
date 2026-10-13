<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-10-06_

## Status

Client feedback round 2 is merged to `main` (PR #1). This session was the production rollout
on Supabase project `xvtkjkvxjxsbeispjlrh`, half finished:

- Done, verified live: migration `0003` applied (`scripts.style` accepts `reclone`);
  `dodo-webhook` Edge Function deployed (`verify_jwt: false`).
- Not done: migration `0004`, `expire-subscriptions` deploy, cron repoint, function secrets.

## Current branch

`main`, only `context/` files changed (uncommitted).

## Blockers

The permission classifier denied `apply_migration` for `0004` and the `expire-subscriptions`
deploy; neither was retried by another route. The account holder has to run them or add
permission rules for `mcp__supabase__apply_migration` / `mcp__supabase__deploy_edge_function`.
`spend_credits` is still executable by `anon` — the credit-granting hole is open.
Full list in `progress-tracker.md` "Blocked on a human".

## Drift flagged

- `context/project-overview.md` still calls the product "Repurpose AI"; the app is "Adiy AI".
- `architecture.md`/`decision-log.md` describe both Edge Functions as deployed — only
  `dodo-webhook` is.
- `0001_baseline.sql`'s cron block and the live cron job still name the old project
  (`xxitlqjgmfqxesqiuouk`).
- Not known whether the hosted app runs the merged build (`NEXT_PUBLIC_SITE_URL` is localhost
  in `.env`); `0004` depends on it.

## First action next session

Confirm `0004`, `expire-subscriptions`, the cron repoint and the Dodo secrets are in place,
then click-test: Recreated script, brand save with a non-English filename, admin free
generation, admin credit/plan controls, cancel.
