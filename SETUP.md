# Repurpose AI — Backend Setup

This covers everything needed to run the backend that was added on top of the existing Next.js frontend: database, auth, storage, AI (Gemini), the video-generation provider abstraction (Seedance), and billing (Dodo Payments).

Credits exist as a ledger (with a 100-credit signup bonus), topped up by the Starter/Pro plans — see §9.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-only, never expose to the browser**)

## 2. Run the database migrations

Apply the SQL files in `supabase/migrations/`, in order, using either:

- **Supabase CLI** (recommended):
  ```bash
  supabase link --project-ref <your-project-ref>
  supabase db push
  ```
- **SQL Editor** in the Supabase dashboard: open each file in `supabase/migrations/` in numeric order and run it.
- **Supabase MCP** (if connected): apply each file's contents in order via the migration tool.

New migration files land here as the product grows — always check `supabase/migrations/` for anything newer than what your project has applied (the CLI's `supabase migration list` compares local files against the project's tracked history; note that history can drift from the real schema if a migration was ever applied by hand instead of through the CLI/MCP — when in doubt, diff against the actual table/column list, not just the history table).

This creates every table (`profiles`, `projects`, `brand_profiles`, `source_videos`, `video_analyses`, `scripts`, `generations`, `credit_transactions`, `api_keys`, `error_logs`), the `spend_credits` function, the new-user trigger that grants a 100-credit signup bonus, RLS policies, and the three storage buckets (`source-videos`, `generated-videos`, `brand-logos`).

## 3. Enable Google sign-in (optional but wired up)

The login page's "Continue with Google" button uses Supabase Auth's OAuth flow:

1. In Supabase: **Authentication → Providers → Google**, enable it and fill in your Google OAuth client ID/secret (create one in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)).
2. In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and your production URL's equivalent) to the redirect allow-list.

Email/password auth works out of the box with no extra config — Sign In (`/login`) and Sign Up (`/signup`) are separate screens, both wired to Google OAuth too.

## 4. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and create an API key.
2. Set it as `GEMINI_API_KEY`.

This key powers video analysis (Step 2), script generation/editing (Steps 3–4), and the AI Insights scoring on the result page.

## 5. Seedance (video generation)

`src/lib/providers/seedance.ts` calls **bytedance/seedance-2.5 via OpenRouter** (https://openrouter.ai/bytedance/seedance-2.5), OpenRouter's unified video generation API:

- Set `OPENROUTER_API_KEY` from your [OpenRouter dashboard](https://openrouter.ai/settings/keys).
- Until then, leave `MOCK_PROVIDERS=true` — generation requests will "complete" instantly with no real video, so you can exercise the entire upload → analyze → script → generate → result flow today.
- **Model limits that shape the app's UI**: only 480p/720p resolution tiers (`standard` quality maps to 480p, `high`/`ultra` both map to 720p — there's no 1080p tier on this model).
- **No chaining**: Seedance 2.5 renders up to 30s natively in a single OpenRouter call (`SeedanceProvider.maxClipDurationSeconds = 30`), which covers both durations the app requests (15s/30s). There's no clip-stitching path in this codebase at all anymore (removed in migration `0018_remove_generation_chaining.sql`) — `generation.ts` just rejects a request outright if `durationSeconds` exceeds the provider's `maxClipDurationSeconds`, it doesn't split and stitch.
- To add a second real provider later, implement the `VideoProvider` interface (see `src/lib/providers/higgsfield.ts` for the current stub) and register it in `src/lib/providers/index.ts`. Set `maxClipDurationSeconds` accurately — that's the ceiling `generation.ts` enforces for it.

## 6. Environment variables

Copy `.env.example` to `.env.local` and fill in the values described above:

| Variable                                     | Required                   | Notes                                                                |
| -------------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                   | yes                        | Supabase project URL                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`              | yes                        | Supabase anon/public key                                             |
| `SUPABASE_SERVICE_ROLE_KEY`                  | yes                        | Server-only, used for credit RPCs, API-key auth, error logging       |
| `NEXT_PUBLIC_SITE_URL`                       | yes                        | Base URL used for the OAuth redirect                                 |
| `GEMINI_API_KEY`                             | yes                        | Google AI Studio key                                                 |
| `GEMINI_MODEL`                               | no                         | Defaults to `gemini-2.5-flash`                                       |
| `OPENROUTER_API_KEY`                         | no (until you have one)    | Real Seedance calls fail without this; use `MOCK_PROVIDERS` meanwhile |
| `MOCK_PROVIDERS`                             | no                         | `true` forces the mock video-provider result regardless of the above |
| `DODO_PAYMENTS_API_KEY`                      | no (until you have one)    | Needed for `/api/billing/checkout` to work — see §8            |
| `DODO_PAYMENTS_ENVIRONMENT`                  | no                         | `test_mode` or `live_mode`, defaults to `test_mode`             |
| `DODO_STARTER_PRODUCT_ID` / `DODO_PRO_PRODUCT_ID` | no (until you run setup:dodo) | Printed by `npm run setup:dodo`                            |
| `DODO_PAYMENTS_WEBHOOK_KEY`                  | —                           | **Not a Next.js env var** — an Edge Function secret, set via `supabase secrets set` (§8), never in `.env.local` |

## 7. Install and run

```bash
npm install
npm run dev
```

## 8. Dodo Payments (Starter/Pro billing)

Starter ($19) and Pro ($39) are **one-time payments, not Dodo subscriptions** — each 30-day period is its own fresh checkout, tracked entirely in Supabase (not Dodo's subscription lifecycle). See `supabase/functions/dodo-webhook/index.ts`'s own comment for the full reasoning.

1. Create a [Dodo Payments](https://app.dodopayments.com/) account (test mode is free, no real business verification needed to start).
2. Get your API key: **Developer → API**. Add it as `DODO_PAYMENTS_API_KEY` in `.env.local`, and set `DODO_PAYMENTS_ENVIRONMENT=test_mode`.
3. Run the setup script — it creates both Products and registers the webhook endpoint idempotently (safe to re-run):
   ```bash
   npm run setup:dodo
   ```
   It prints two things:
   - `DODO_STARTER_PRODUCT_ID` / `DODO_PRO_PRODUCT_ID` — add both to `.env.local`.
   - A `supabase secrets set DODO_PAYMENTS_WEBHOOK_KEY=... --project-ref ...` command — **run this yourself**, don't put the webhook secret in `.env.local`. It's an Edge Function secret (consumed by `supabase/functions/dodo-webhook`, a *separate* Deno deployment from the Next.js app, not a Next.js env var) and it's the one value in this whole setup that's genuinely sensitive — leaking it lets someone forge fake "payment succeeded" events and grant themselves free credits.
4. That's it — the Edge Functions (`dodo-webhook`, `expire-subscriptions`) and the `expire-subscriptions` cron schedule (migration `0029`, every 6 hours) are already deployed to the live Supabase project; they don't need redeploying unless you change their code (`supabase functions deploy dodo-webhook` / `expire-subscriptions`, or the Supabase MCP's `deploy_edge_function`).
5. To go live: create the same two Products for **live mode** in the Dodo dashboard (test/live are separate catalogs), flip `DODO_PAYMENTS_ENVIRONMENT=live_mode`, and re-run `npm run setup:dodo` against live mode (it'll create live-mode products/webhook the same way, test-mode ones are untouched).

Flow: `POST /api/billing/checkout` (session-authed, `src/app/api/billing/checkout/route.ts`) creates a Dodo Checkout Session and returns its hosted `checkout_url`, which the Credits page redirects the browser to. On `payment.succeeded`, `dodo-webhook` grants `PLAN_CONFIG[plan].credits` (resetting the balance to exactly that number, not topping up — see `src/lib/payments/plans.ts`), sets `profiles.plan`, and stamps `plan_period_end`/`plan_grace_end` (period + 30 days, grace + 3 more). `expire-subscriptions` runs on a schedule and downgrades anyone past `plan_grace_end` with no renewal back to `'free'`, leaving their existing credit balance untouched.

## What's included

- **Auth**: Supabase Auth (email/password + Google OAuth), session cookie refreshed by `middleware.ts`, protected routes: `/dashboard`, `/projects`, `/history`, `/credits`, `/settings`, `/api`.
- **Upload → Analyze → Script → Generate → Result**: full pipeline wired to Supabase Storage + Gemini + the provider abstraction, matching every field in the doc's Step 1–6 (including the previously-missing product/brand ad uploads and custom-duration input).
- **Credits**: signup bonus, atomic spend/refund via a Postgres function (`spend_credits`), full ledger.
- **API keys**: create/revoke in the dashboard, used to authenticate the public `POST /api/v1/commercials` / `GET /api/v1/commercials/:id` integration endpoints (the same ones shown in the API page's curl example).
- **Error logging**: every route handler and the client error boundary log to `error_logs`; the `dodo-webhook` Edge Function also logs anything it can't safely act on there.
- **Billing**: Dodo Payments, one-time payment per 30-day period for Starter/Pro (§8) — checkout via `/api/billing/checkout`, entitlement granted by the `dodo-webhook` Edge Function, grace-period downgrade by the scheduled `expire-subscriptions` Edge Function. Custom stays Contact-Us only, no checkout.
