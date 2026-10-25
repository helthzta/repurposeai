<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-10-25_

## Status

Pricing, subscriptions, landing and admin overhaul is code-complete and tested on branch
`feat/subscriptions-pricing-admin` (uncommitted). Migrations 0005–0008 are live on
`xvtkjkvxjxsbeispjlrh`; the app code using them is not deployed yet. The old production build
keeps working against the additive schema. Since 0006, new sign-ups get 0 credits while the old
landing copy still says 50, until the new build ships.

## Current branch

`feat/subscriptions-pricing-admin`, all changes uncommitted (nothing pushed).

## Blockers

- `dodo-webhook` deploy refused by the permission classifier — human runs it.
- `npm run setup:dodo` not run — no Dodo subscription products yet, so checkout returns 503.
- `0009` (drop `is_admin`, 1:1 constraint, `spend_credits` lock-down) must wait for the deploy.
  `anon` can still call `spend_credits` until then.

## Drift flagged

- `context/project-overview.md` still says "Repurpose AI"; product is "Adiy AI".
- `supabase/migrations/0001_baseline.sql` cron block names the old project (superseded by 0008).
- `docs/*.docx` legal drafts not checked against the new subscription/refund terms
  (`src/lib/legal/terms.ts` already says non-refundable).

## First action next session

Confirm the webhook deploy and `setup:dodo` happened, then run one Dodo test-mode subscription:
buy Start monthly → check `/admin/subscriptions` and credits = 70 → cancel → confirm "Ends <date>"
on `/credits`. Then apply `0009`.
