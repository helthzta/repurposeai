<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-07-25_

## Current phase

Core pipeline (upload → analyze → script → generate → result), auth,
credits, API keys, and error logging are implemented per recent commits
(`b460195`, `338d32a`, `12d00d5`). Payment/billing is explicitly not built
(by design, per `SETUP.md`).

Seedance's video backend runs through OpenRouter (`src/lib/providers/seedance.ts`);
a live `OPENROUTER_API_KEY` is now set. Durations above the model's 15s
single-call cap (16–30s) render as two chained clips — clip1, then a
last-frame-seeded clip2 — stitched with `ffmpeg-static` into one delivered
video (`src/lib/generation.ts`, `src/lib/ffmpeg.ts`). DB migration
`0012_generation_chaining.sql` adds the columns this needs and has **not
yet been applied** to the live Supabase project.

## In progress

- Chained (>15s) generation path is implemented and typechecks but is
  **untested against the live API** — needs one real 20–30s generation run
  through the dashboard once migration `0012` is applied.

## Open questions

- Migration `0012_generation_chaining.sql` needs applying to the live
  Supabase project before any generation >15s will work (it'll error on
  the missing `chain_stage`/`chain_clip1_job_id` columns otherwise).
- Is Veo still a planned third video provider, or has the plan settled on
  Seedance + Higgsfield? (`project-overview.md`)
- Which package manager is canonical — npm (`package-lock.json`) or bun
  (`bunfig.toml`)? Both are present. (`code-standards.md`)
- Is there a deploy target/hosting provider yet? Matters now for
  `ffmpeg-static`'s binary — `next.config.ts` traces it in via
  `outputFileTracingIncludes`, unverified against a real deployment.
- Are tests planned? No test runner/config exists yet. (`code-standards.md`)

## Next steps (max ~5)

1. Apply migration `0012` to the live Supabase project.
2. Run one real 16–30s generation end-to-end to validate clip chaining +
   stitching against the live OpenRouter API.
3. Resolve hosting target — needed to confirm the ffmpeg binary actually
   ships in a deployed build, not just `next dev`.
4. Resolve remaining open questions above with the project owner.
