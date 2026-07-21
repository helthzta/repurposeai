# Repurpose AI — Project Overview

<!-- Source: project_overview.md (client scope doc, root of repo) reconciled
against the actual implementation in SETUP.md and src/. Where the scope doc
describes something not yet built, it's marked "planned, not implemented". -->

## Overview

Repurpose AI is a web-based SaaS that turns an existing advertisement video
into a new brand-specific commercial using AI. A user uploads a competitor/
product/brand ad, the app analyzes it with Gemini, generates alternative
scripts, lets the user edit them, then renders a new 15–30s commercial via a
pluggable video-generation provider (Seedance first). Confidential client
project — see the confidentiality notice at the top of `project_overview.md`.

## Goals

1. Generate a finished 15–30s cinematic commercial in one AI pass — no manual
   storyboarding.
2. Understand the uploaded ad well enough to extract brand, hook, audience,
   tone, etc. automatically (Gemini video analysis).
3. Offer 3 meaningfully different script directions per analysis (emotional,
   humorous, high-conversion) that the user can edit before generating.
4. Keep the video-provider integration swappable — Seedance today, other
   models (Higgsfield, Veo, ...) without touching the generation call sites.
5. Track usage via a credit ledger so generation cost is metered per user.

## Core user flow

(`project_overview.md` Steps 1–6; implemented in
`src/components/workflow/*` + `src/app/api/*`)

1. **Upload** — competitor ad + product ad + brand ad (MP4/MOV/WebM) plus
   brand profile fields (name, product/service, audience, tone, colors, CTA,
   logo).
2. **Analyze** — Gemini extracts company/brand, business category, video
   duration, hook, audience, pain point, context, emotional trigger, hero,
   marketing strategy, offer, CTA, narrative structure, tone of voice, and
   visual style (`src/lib/ai/gemini.ts`, matching `video_analyses` columns).
3. **Script generation** — 3 scripts (emotional / humorous / high-conversion),
   each with title, hook, dialogue, scene descriptions, emotional direction,
   CTA, estimated duration, detected language.
4. **Script editing** — user edits/rewrites, adds instructions, changes
   duration/tone/CTA; AI regenerates while preserving edits where possible
   (`src/app/api/scripts/[id]/assist/route.ts`).
5. **Video generation** — user picks 15s / 30s / custom duration, aspect
   ratio, quality; script becomes a provider prompt and is submitted
   (`src/lib/generation.ts`, credits spent up front, refunded on failure).
6. **Result** — generated video, download, prompt used, script used,
   regenerate option, AI insights scoring (marketing/creativity/brand-match/
   emotional-impact/predicted-conversion).

## Features

### Core pipeline
- Upload → Analyze → Script → Generate → Result, one `projects` row per run
  (`draft → analyzing → scripted → generating → completed/failed`).
- Multi-source upload (competitor/product/brand), brand profile capture.

### Account / admin
- Auth: Supabase Auth, email+password (auto-fallback to signup) and Google
  OAuth (`src/app/login`).
- Credits: signup bonus (100, via `handle_new_user` trigger) + atomic
  spend/refund ledger (`spend_credits` Postgres function).
- Project history (`src/app/history`, `src/app/projects`).
- API keys: create/revoke in dashboard, authenticate the public
  `POST/GET /api/v1/commercials` integration endpoints
  (`src/app/api/api-keys`, `src/app/api/v1/commercials`).
- Error logging: every route + client error boundary logs to `error_logs`
  (`src/lib/errors.ts`).
- Settings, help, credits pages.

### Not yet implemented (planned in scope doc only)
- Payment/billing — credits exist as a ledger with no purchase flow yet
  (explicitly out of scope per `SETUP.md`: "Not included (by design)").
- Additional video providers beyond Seedance/Higgsfield-stub — architecture
  supports it (`src/lib/providers/`), only Seedance has a real (non-mock)
  path being wired up; Higgsfield is a stub.

## Scope

### In scope
- Everything in the Core user flow above.
- Credit metering, API key access to the pipeline, error logging.
- Provider abstraction supporting multiple video-gen backends.

### Out of scope
- Payment/billing integration (explicit non-goal per `SETUP.md`).
- Manual storyboard/scene-by-scene editing UI — the product is one-shot
  generation from a script, not a video editor.

## Success criteria

1. A user can go from raw ad upload to a downloadable generated commercial
   without leaving the app, with credits deducted correctly and refunded on
   provider failure.
2. Swapping or adding a video provider requires only a new
   `VideoProvider` implementation + registry entry
   (`src/lib/providers/index.ts`) — no changes to routes or UI.
3. Every generation is attributable: prompt, script, and provider job ID are
   stored and viewable.

{{TODO: confirm with a human — is Veo still a planned provider, or has Seedance/Higgsfield superseded that plan?}}
