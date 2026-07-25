# Repurpose AI — Backend Setup

This covers everything needed to run the backend that was added on top of the existing Next.js frontend: database, auth, storage, AI (Gemini), and the video-generation provider abstraction (Seedance).

No payment/billing is included in this pass — credits exist as a ledger (with a 100-credit signup bonus) but there's no way to buy more yet.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-only, never expose to the browser**)

## 2. Run the database migrations

The SQL files in `supabase/migrations/` were written but **not applied** (no Supabase MCP/CLI was used to run them against a live project). Apply them yourself, in order, using either:

- **Supabase CLI** (recommended):
  ```bash
  supabase link --project-ref <your-project-ref>
  supabase db push
  ```
- **SQL Editor** in the Supabase dashboard: open each file in `supabase/migrations/` in numeric order (`0001_...` through `0011_...`) and run it.

This creates every table (`profiles`, `projects`, `brand_profiles`, `source_videos`, `video_analyses`, `scripts`, `generations`, `credit_transactions`, `api_keys`, `error_logs`), the `spend_credits` function, the new-user trigger that grants a 100-credit signup bonus, RLS policies, and the three storage buckets (`source-videos`, `generated-videos`, `brand-logos`).

## 3. Enable Google sign-in (optional but wired up)

The login page's "Continue with Google" button uses Supabase Auth's OAuth flow:

1. In Supabase: **Authentication → Providers → Google**, enable it and fill in your Google OAuth client ID/secret (create one in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)).
2. In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and your production URL's equivalent) to the redirect allow-list.

Email/password sign-in works out of the box with no extra config — the login form falls back to `signUp` automatically if the email doesn't exist yet.

## 4. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and create an API key.
2. Set it as `GEMINI_API_KEY`.

This key powers video analysis (Step 2), script generation/editing (Steps 3–4), and the AI Insights scoring on the result page.

## 5. Seedance (video generation)

`src/lib/providers/seedance.ts` calls **bytedance/seedance-2.0-fast via OpenRouter** (https://openrouter.ai/bytedance/seedance-2.0-fast), OpenRouter's unified video generation API:

- Set `OPENROUTER_API_KEY` from your [OpenRouter dashboard](https://openrouter.ai/settings/keys).
- Until then, leave `MOCK_PROVIDERS=true` — generation requests will "complete" instantly with no real video, so you can exercise the entire upload → analyze → script → generate → result flow today.
- **Model limits that shape the app's UI**: only 480p/720p resolution tiers (`standard` quality maps to 480p, `high`/`ultra` both map to 720p — there's no 1080p tier on this model).
- **Durations above 15s are chained**: the model itself still caps a single call at 15s (`SeedanceProvider.maxClipDurationSeconds`), so a 16–30s request renders as an internal 15s clip1, a continuation clip2 seeded from clip1's last frame, and a server-side ffmpeg stitch into one delivered video (`src/lib/generation.ts`, `src/lib/ffmpeg.ts`). The intermediate clip1 is never stored or exposed — only the final merged video is. Requires `ffmpeg-static`'s binary to be present at runtime (bundled automatically by `outputFileTracingIncludes` in `next.config.ts` for a deployed build).
- To add a second real provider later, implement the `VideoProvider` interface (see `src/lib/providers/higgsfield.ts` for the current stub) and register it in `src/lib/providers/index.ts`. Set `maxClipDurationSeconds` accurately — that's what drives whether `generation.ts` chains requests for it.

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

## 7. Install and run

```bash
npm install
npm run dev
```

## What's included

- **Auth**: Supabase Auth (email/password + Google OAuth), session cookie refreshed by `middleware.ts`, protected routes: `/dashboard`, `/projects`, `/history`, `/credits`, `/settings`, `/api`.
- **Upload → Analyze → Script → Generate → Result**: full pipeline wired to Supabase Storage + Gemini + the provider abstraction, matching every field in the doc's Step 1–6 (including the previously-missing product/brand ad uploads and custom-duration input).
- **Credits**: signup bonus, atomic spend/refund via a Postgres function (`spend_credits`), full ledger.
- **API keys**: create/revoke in the dashboard, used to authenticate the public `POST /api/v1/commercials` / `GET /api/v1/commercials/:id` integration endpoints (the same ones shown in the API page's curl example).
- **Error logging**: every route handler and the client error boundary log to `error_logs`.
- **Not included (by design)**: any payment/billing integration.
