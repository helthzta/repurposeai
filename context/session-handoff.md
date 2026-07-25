<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-07-25_

## Status

Two pieces of work this session, both on Seedance/video generation:

1. Switched Seedance's video backend from Replicate to OpenRouter's video
   generation API (confirmed via web search that OpenRouter hosts
   `bytedance/seedance-2.0-fast` before writing code). User has since added
   a real `OPENROUTER_API_KEY` to `.env`.
2. Extended generation duration from a flat 15s cap to a 15–30s range, per
   explicit user spec: 16–30s requests render as two chained 15s-max clips
   (clip1, then clip2 seeded from clip1's last frame for continuity),
   stitched server-side into one video with ffmpeg. The intermediate clip1
   is never stored or exposed — only the final merged video is delivered.

Neither piece has been exercised against the live API yet — see Blockers.

## Current branch

`main`. Uncommitted changes (not committed — user hasn't asked for a commit):

**OpenRouter swap:** `src/lib/providers/seedance.ts`, `.env`/`.env.example`,
`SETUP.md`.

**Duration chaining (new this session):**
- `src/lib/ffmpeg.ts` (new) — `extractLastFrame`/`concatVideos` via
  `ffmpeg-static` (added as a dependency; binary confirmed present and
  working locally).
- `src/lib/providers/types.ts` — `VideoProvider.maxClipDurationSeconds`
  (Seedance: 15, Higgsfield stub: `Infinity`); `SubmitParams.seedImageUrl`.
- `src/lib/providers/seedance.ts` — sends `frame_images`/`first_frame` when
  `seedImageUrl` is set.
- `src/lib/storage.ts` — extracted `uploadToStorage` (raw bytes), reused by
  `mirrorToStorage`.
- `src/lib/generation.ts` — `createGeneration` splits >15s requests into
  clip1/clip2; `pollAndFinalize` gained `advanceChainToClip2` and
  `finalizeChain`, driven by a new `generations.chain_stage` column,
  advancing one step per client poll (same request-driven polling model as
  before, no new queue).
- `src/lib/types.ts` — `Generation.chain_stage`, `Generation.chain_clip1_job_id`.
- `supabase/migrations/0012_generation_chaining.sql` (new) — adds those two
  columns. **Not yet applied to the live Supabase project.**
- `src/components/workflow/GenerateStep.tsx` — 30s option enabled, duration
  cap raised to 30 for Seedance, cost/time estimate updated.
- `src/components/workflow/GenerationScreen.tsx` — "usually takes X
  minutes" copy now reflects chained vs single-clip duration.
- `next.config.ts` (new) — `outputFileTracingIncludes` for the ffmpeg
  binary, needed for a deployed build (not needed for `next dev`).
- `context/architecture.md` — new invariant #8 on why the intermediate
  clip is never mirrored into `generated-videos` (that bucket's RLS lets
  the owner read anything under their own path directly, not just what the
  app links to — so "never downloadable" means "never stored there," not
  "stored but unlinked").

`npx tsc --noEmit` and `npx eslint .` are both clean against these files
(only pre-existing, unrelated warnings/errors remain elsewhere).

## Half-done work

- Duration chaining is implemented and typechecks but has never run
  against the live OpenRouter API — no real 20s/30s generation has been
  fired yet (would spend the user's OpenRouter balance).
- Migration `0012` exists as a file only; this repo applies migrations
  manually (SQL Editor or CLI, per `SETUP.md` §2), so it needs to be run
  against the live Supabase project before any >15s generation will work —
  it'll error on the missing columns otherwise.
- `outputFileTracingIncludes` in `next.config.ts` is untested against an
  actual `next build`/deployment — hosting target is still an open
  question (see `progress-tracker.md`), so this is best-effort until one
  exists to verify against.

## First action next session

1. Apply `supabase/migrations/0012_generation_chaining.sql` to the live
   project.
2. Run one real generation >15s (e.g. 20s or 30s) through the dashboard to
   validate the full chain: clip1 submit/poll → last-frame extraction →
   clip2 submit with `frame_images` → poll → re-fetch clip1 → ffmpeg concat
   → upload → delivered video. This is the first time any of this touches
   the real API.
3. If that works, also verify a normal ≤15s generation still behaves
   exactly as before (chain_stage stays null) — regression check on the
   unchained path.

## Blockers

None structurally — key is in place. Just needs the migration applied and
a live test run, both deferred by design (real API costs money, user
wanted to test in the UI themselves rather than have it fired
automatically).
