<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-07-25_

## Status

Prior session (still uncommitted): OpenRouter/Seedance swap + 15–30s clip
chaining. See `git diff` / `learned-rules.md` R-001–R-003 for that work —
not re-summarized here.

This session: a large product-note dump asking for changes across brand
input, video analysis, script generation flow, and video-gen settings.
Split into "build now" (concrete) vs "ask first" (ambiguous, schema-touching)
— see `decision-log.md` D-001–D-004 for what was asked and decided. All
four were resolved via AskUserQuestion before writing code, then fully
implemented:

1. **CTA/Tone fully automatic** — removed from Upload step; script
   generation now derives tone from the analyzed video's `tone_of_voice`
   and picks its own CTA.
2. **Analysis fields fully replaced** — viral-framing fields
   (`viral_factor`, `relief`, `language`, `video_metrics`) added;
   `business_category`→`company_does` renamed; `marketing_strategy`,
   `offer`, `cta`, `narrative_structure` dropped. `tone_of_voice` and
   `visual_style` were kept despite not being in the user's field list —
   both are load-bearing for items 1 and 4 here.
3. **New "mini ideas → master script" flow** — a new Ideas step generates 3
   short concepts; picking one writes the one full script. Replaces the old
   "3 full scripts, pick one" flow in the dashboard UI only.
4. **Video Generation Settings** — provider picker removed (Seedance only),
   duration floor raised 5→10 (range now 10–30s), new "Original" camera
   style that pulls the analyzed `visual_style` into the video prompt.

`npx tsc --noEmit` and `npx eslint .` clean (only pre-existing unrelated
warnings/errors elsewhere). Dev server smoke-tested — `/` and `/dashboard`
both compile and return 200 with no console errors.

## Current branch

`main`. Uncommitted (not committed — user hasn't asked for a commit). New
files this session: `src/components/workflow/IdeaStep.tsx`,
`src/app/api/scripts/ideas/route.ts`,
`supabase/migrations/0013_viral_analysis_fields.sql`. Everything else is
edits — see `git diff` for the full list; touches `types.ts`, `gemini.ts`,
`prompts.ts`, `ScriptStep.tsx`, `dashboard-client.tsx`, `StepProgress.tsx`,
`UploadStep.tsx`, `AnalysisStep.tsx`, `GenerateStep.tsx`, `generation.ts`,
the regenerate route, and `/api/scripts/generate`.

## Half-done work

- **Migrations `0012` and `0013` are both unapplied** to the live Supabase
  project (manual application only — no CLI/DB credentials available in
  this environment; `SETUP.md` §2 has the steps). Nothing analysis- or
  generation-related will work until both are run, in order.
- None of this session's changes have been exercised against the live
  Gemini/OpenRouter APIs — schema and prompt changes are correct by
  reading, not yet confirmed by an actual analysis→ideas→script→generate
  run.
- `brand_profiles.tone` and `brand_profiles.cta` columns were deliberately
  left in the DB schema (nullable, now unwritten) rather than dropped —
  lower-risk than a destructive migration on a table that might hold real
  rows. `src/app/api/projects/[id]/duplicate/route.ts` still copies them
  from any pre-existing row; harmless, no code path writes them anymore.
- The idea→master-script flow only changed the dashboard UI/route
  (`/api/scripts/generate`). The public `/api/v1/commercials` endpoint
  still uses the old `generateScripts` (3-full-scripts, auto-select
  `high_conversion`) — unaffected by the ideas step, since there's no
  human in the loop there. It does now benefit from auto-tone/CTA though,
  since that lives in the shared prompt function.

## First action next session

1. Apply `0012_generation_chaining.sql` then `0013_viral_analysis_fields.sql`
   to the live Supabase project, in that order.
2. Run one full real flow end-to-end: upload → analyze (confirm new fields
   populate) → ideas (confirm 3 short concepts) → pick one → master script
   → settings (confirm Seedance-only, 10–30s, "Original" camera style
   default) → generate → result. First live test of everything from both
   this session and the prior one.
3. If "Original" camera style produces weak results, revisit whether
   `visual_style`'s free-text description is specific enough to steer
   Seedance, or needs a more structured prompt.

## Blockers

Same as before — migrations unapplied, no live test run yet. Both
deferred by design (real API cost, no DB CLI access in this environment).
