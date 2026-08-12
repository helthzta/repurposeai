<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-08-13_

## Status

Built a full Dodo Payments billing integration for the Starter/Pro plans
(Custom stays Contact-Us only, untouched). This was a large, security-
sensitive build — full detail lives in `decision-log.md` (D-026–D-029) and
`learned-rules.md` (R-047–R-057); this is the short version.

**The design changed mid-build.** Before writing any billing code, an
`AskUserQuestion` round confirmed: recurring monthly subscriptions, reset
(not top-up) credits on renewal, a setup script for Product creation, and
access continuing until period end on cancellation. Research then went deep
into Dodo's actual SDK (`node_modules/dodopayments`'s `.d.ts` files, more
reliable than the hosted docs — R-057) to nail down exact field names before
writing anything. Partway through that research, the user redirected: **make
it one-time payments, tracked via a Supabase Edge Function, with a 3-day
grace period** — a materially different (and simpler/safer) architecture
than Dodo's native Subscription object. Rebuilt the plan around that
instead (D-026) and proceeded without re-asking, since the redirect was
explicit and unambiguous.

**What's live now:**
- `POST /api/billing/checkout` (Next.js) creates a Dodo Checkout Session
  for a one-time-payment Product (Starter $19/350cr, Pro $39/700cr).
- `dodo-webhook` and `expire-subscriptions` — two Supabase Edge Functions,
  deployed for real via the Supabase MCP (not just written) — handle
  `payment.succeeded` (grant credits + stamp a 30-day period + 3-day grace)
  and the scheduled grace-period downgrade (`pg_cron`/`pg_net`, every 6h,
  migration `0029`) respectively. Both were chosen as Edge Functions
  specifically because they need to work independent of the Next.js app's
  own hosting, which is still unresolved (D-007/D-029).
- Migrations `0028`/`0029` applied live to the project
  (`xxitlqjgmfqxesqiuouk`) via the Supabase MCP.
- **A real pre-existing security gap was found and fixed along the way**:
  `profiles`' RLS update policy had no column restriction, and neither did
  Postgres grants — any signed-in user could self-grant `plan`/
  `credits_balance`/`is_admin` via a direct Supabase client call, bypassing
  the app entirely. Fixed in `0028`: `authenticated` can now only UPDATE
  `full_name`/`username`/`avatar_url` on `profiles` (D-028) — confirmed
  live via `information_schema.column_privileges`.
- `scripts/setup-dodo-products.ts` (`npm run setup:dodo`) — idempotent,
  creates both Products + registers the webhook, prints exactly what to
  paste into `.env.local` and the one CLI command for the webhook secret.
- `.env.example`/`SETUP.md` updated (§8) with the full setup walkthrough.
- `supabase/functions` excluded from the root `tsconfig.json` (Deno globals/
  `npm:` specifiers don't resolve under the Next.js Node config).

## Current branch

`main`, working tree has this session's changes uncommitted (not asked to
commit). New: `src/lib/payments/`, `src/app/api/billing/`,
`src/app/checkout/`, `supabase/functions/dodo-webhook/`,
`supabase/functions/expire-subscriptions/`, `scripts/setup-dodo-products.ts`,
migrations `0028`/`0029`. Modified: `credits-client.tsx`, `/api/credits`
route, `middleware.ts` (added `/checkout` to protected paths),
`tsconfig.json`, `package.json`/`package-lock.json` (added `dodopayments`,
`tsx`), `.env.example`, `SETUP.md`.

`npm run lint` / `tsc --noEmit`: clean — the only remaining output is the
same pre-existing stale-`.next`-cache noise confirmed unrelated to this
session's files (and to last session's, via an earlier `git stash` A/B).

## Half-done / needs manual follow-up — billing is NOT actually usable yet

The code is done and deployed, but nobody has a real Dodo account wired up:

1. `DODO_PAYMENTS_API_KEY` isn't set anywhere — `npm run setup:dodo` hasn't
   been run, so `DODO_STARTER_PRODUCT_ID`/`DODO_PRO_PRODUCT_ID` don't exist.
   Checkout will fail until this happens.
2. `DODO_PAYMENTS_WEBHOOK_KEY` isn't set on the `dodo-webhook` Edge
   Function — this is the one step that couldn't be done headlessly
   (a real secret only the account holder has; deliberately not asked for
   in chat). Until set, every webhook delivery 500s.
3. **No real payment has ever been run through this.** The riskiest
   unverified assumption: whether Checkout Session `metadata` actually
   round-trips onto the resulting Payment object's `metadata` field the way
   the SDK's doc comment implies — `dodo-webhook` has `product_id`/
   `total_amount` fallbacks specifically in case it doesn't, but this needs
   a real test-mode payment to actually confirm.
4. Nothing from this session was click-tested in a browser.
5. Carried over, still unverified: Language/Subtitles controls (2026-08-04),
   Hinglish script output quality (2026-08-12).

## First action next session

1. Get a Dodo test-mode account; set `DODO_PAYMENTS_API_KEY`; run
   `npm run setup:dodo`; run the `supabase secrets set` command it prints.
2. Run one real test-mode payment end to end. Watch `error_logs` for any
   `dodo-webhook` `logUnresolved` rows — that's the signal the
   metadata-propagation assumption needs a fallback fix.
3. Confirm `expire-subscriptions` actually downgrades (manually backdate a
   test row's `plan_grace_end`, or wait for the schedule).
4. Resolve hosting target (D-007) — still open, now blocks billing too
   (checkout is a Next.js route, not an Edge Function).

## Blockers

Billing is code-complete and deployed but not yet actually usable — see
"Half-done" above. Not a blocker on further code work, just on live testing.
