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

`src/lib/providers/seedance.ts` calls **Seedance 2.5 via [MuAPI](https://muapi.ai/docs/introduction)**, a submit-then-poll REST API (`POST /api/v1/{model-slug}`, `GET /api/v1/predictions/{id}/result`):

- Set `MUAPI_API_KEY` from your [MuAPI dashboard](https://muapi.ai) (a sandbox key returns mock data for free if you want to smoke-test the real HTTP calls without spending credits).
- **Model limits that shape the app's UI**: resolution is chosen via endpoint slug, not a body param — `standard` quality calls the `-480p` slug, `high`/`ultra` both call the base (720p) slug. MuAPI's 1080p tier is listed as "planned for a future update" and isn't callable yet.
- **No chaining needed**: Seedance 2.5 natively renders up to 30s in a single call (`SeedanceProvider.maxClipDurationSeconds = 30`), which covers both durations the app requests (15s/30s), so the ffmpeg clip-stitching path in `src/lib/generation.ts`/`src/lib/ffmpeg.ts` is dormant unless a future provider needs it again.
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
| `MUAPI_API_KEY`                              | yes                        | Real Seedance calls fail without this                                |

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
