<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-08-13_

## Current phase

2026-08-13 session — full Dodo Payments billing integration for Starter/Pro
(Custom stays Contact-Us only). Mid-build the user redirected the design from
Dodo's native Subscriptions to one-time payments tracked/enforced entirely in
Supabase (D-026) — built to that spec. See `session-handoff.md` for the full
narrative; `decision-log.md` D-026–D-029 and `learned-rules.md` R-047–R-057
for the durable facts. Summary of what's live:

- `POST /api/billing/checkout` (Next.js, session-authed) creates a Dodo
  Checkout Session for the requested plan's one-time-payment Product.
- `dodo-webhook` (Supabase Edge Function, deployed) verifies the signature,
  dedupes via `dodo_webhook_events`, and on `payment.succeeded` resets
  credits to the plan's allotment + sets `profiles.plan`/`plan_period_end`/
  `plan_grace_end` (+30d/+33d).
- `expire-subscriptions` (Supabase Edge Function, deployed, scheduled every
  6h via `pg_cron`/`pg_net`, migration `0029`) downgrades anyone past
  `plan_grace_end` with no renewal to `'free'`, credits untouched.
- Migration `0028` also fixed a real pre-existing security gap found along
  the way: `profiles` had no column-level UPDATE restriction, so any user
  could self-grant `plan`/`credits_balance`/`is_admin` via a direct Supabase
  client call — now grant-restricted to `full_name`/`username`/`avatar_url`.
- `scripts/setup-dodo-products.ts` (`npm run setup:dodo`) creates both Dodo
  Products + registers the webhook endpoint idempotently, prints the exact
  `.env.local` lines and the one `supabase secrets set` command needed.
- `npm run lint` / `tsc --noEmit` clean (only pre-existing `.next`-cache
  noise from before this session, confirmed unrelated).

## NOT yet done — blocks this actually working end to end

1. **No real Dodo account wired up yet** — `DODO_PAYMENTS_API_KEY` isn't set,
   so `npm run setup:dodo` hasn't been run, so `DODO_STARTER_PRODUCT_ID`/
   `DODO_PRO_PRODUCT_ID` don't exist yet → checkout will 500 until this runs.
2. **`DODO_PAYMENTS_WEBHOOK_KEY` isn't set on the Edge Function** — the one
   manual step that couldn't be done headlessly (see SETUP.md §8's
   reasoning). Until it's set, every webhook delivery 500s ("Not
   configured").
3. **No live payment has ever been tested** — the checkout→webhook→credit
   flow is code-reviewed and type-checked against the SDK's own `.d.ts`
   files (R-057), not empirically verified. In particular: whether
   checkout-session `metadata` actually round-trips onto the resulting
   Payment object is asserted by the SDK's doc comment, not confirmed by a
   real test payment — the `product_id`/`total_amount` fallbacks in
   `dodo-webhook` exist specifically in case it doesn't.
4. Nothing in this session was click-tested in a real browser.

## Next steps (max ~5)

1. Get a Dodo test-mode account, set `DODO_PAYMENTS_API_KEY`, run
   `npm run setup:dodo`, set the webhook secret it prints.
2. Run one real test-mode payment end to end; confirm `dodo-webhook` fires,
   credits reset correctly, and `plan_period_end`/`plan_grace_end` land on
   `profiles`. Watch `error_logs` for any `logUnresolved` rows (would mean
   the metadata-propagation assumption was wrong).
3. Manually trigger `expire-subscriptions` once (or backdate a test row's
   `plan_grace_end`) to confirm the downgrade sweep actually works.
4. Resolve hosting target (D-007) — Edge Functions don't need it, but the
   Next.js app (and thus `/api/billing/checkout`) still does.
