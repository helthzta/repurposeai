<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-10-25_

## Current phase

Pricing / subscriptions / admin overhaul (brief items 6, 7, 7.1, 10–14 + admin), on branch
`feat/subscriptions-pricing-admin`, uncommitted. Code-complete: 0 sign-up credits, DB-held pricing
(D-034), Dodo subscriptions monthly + yearly with cancel-at-period-end (D-032), in-DB billing sweep
(D-033), separate admin console with its own auth (D-035), Script page / 480p / 1:1 removed
(D-036), landing redesign with pricing toggle + 3 demo videos, real provider cost tracking,
`docs/generation-cost-note.md`.

Verified 2026-10-25: `tsc` clean (src + scripts), eslint 0 errors; `test:billing` 19/19;
`scripts/test-webhook.ts` 17/17 against the live DB; `scripts/test-credit-deduction.ts` 8/8 via
the real route on a MOCK_PROVIDERS dev server; admin login/lockout/CSRF/logout and all 10 admin
pages smoke-tested; landing screenshotted at 1440 and 500 px.

Applied live: migrations 0005–0008 (additive). Admin account `admin@adiy.ai` created.

## Blocked on a human

1. Deploy `dodo-webhook` (+ `supabase/functions/_shared/`) — refused to the agent (R-068).
   `supabase functions deploy dodo-webhook --no-verify-jwt --project-ref xvtkjkvxjxsbeispjlrh`.
2. `npm run setup:dodo` — creates the 4 subscription products, fills
   `billing_plans.dodo_product_id`, registers the webhook events, prints the secret to set.
   Checkout returns 503 until this runs.
3. Ship the app build (production builds from `helthzta/repurposeai`, see memory).
4. After 3: apply `0009` (drops `profiles.is_admin`, removes 1:1, revokes `spend_credits` from
   anon — the credit-granting hole is still open until then).
5. One Dodo test-mode purchase + cancel end to end (needs 1–3).

## Open questions

- Pro yearly 30s 720p margin is ~6% at the sheet's cost ($7.38 vs $6.94); Start yearly 15s 720p
  is a loss at the F10 cost ($1.07 vs $1.37). Re-price `credit_rates` once real costs accrue?
- Existing 6 users kept their 50 sign-up credits — zero them?
- Yearly toggle shows "Save 21%" (true saving after whole-dollar rounding); want it to say 20%?
- Demo captions are neutral guesses — client to supply real titles/brands.

## Next steps

1. Human items 1–4 above, then item 5.
2. Watch admin → Generations "Real cost" vs "Est. cost" for a week; adjust `credit_rates`.
