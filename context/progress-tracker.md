<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-07-25_

## Current phase

Core pipeline (upload → analyze → ideas → script → settings → generate →
result) is fully implemented, including: Seedance via OpenRouter, 10–30s
chained generation with ffmpeg stitching, fully-automatic tone/CTA (no
manual input), viral-framed video analysis, and a 3-idea → 1-master-script
flow. Payment/billing explicitly not built (by design, per `SETUP.md`).

**Nothing from the last two sessions has run against the live APIs yet** —
typechecked/linted/dev-server-smoke-tested only. See `session-handoff.md`
for the full file list.

## In progress

- Two DB migrations (`0012_generation_chaining.sql`,
  `0013_viral_analysis_fields.sql`) are written but **not applied** to the
  live Supabase project — this environment has no Supabase CLI or DB
  connection string, so they must be applied manually (SQL Editor or CLI
  with real credentials, per `SETUP.md` §2). Nothing analysis- or
  generation-related works until both are applied, in order.

## Open questions

- Migrations `0012` + `0013` need applying before any live test is possible.
- Is Veo still a planned third video provider, or has the plan settled on
  Seedance + Higgsfield? (`project-overview.md`)
- Which package manager is canonical — npm (`package-lock.json`) or bun
  (`bunfig.toml`)? Both are present. (`code-standards.md`)
- Is there a deploy target/hosting provider yet? Matters now for
  `ffmpeg-static`'s binary — `next.config.ts` traces it in via
  `outputFileTracingIncludes`, unverified against a real deployment.
- Are tests planned? No test runner/config exists yet. (`code-standards.md`)
- Is "Original" camera style's `visual_style` free-text description
  specific enough to actually steer Seedance well? Unverified until a live
  generation is run.

## Next steps (max ~5)

1. Apply migration `0012` then `0013` to the live Supabase project.
2. Run one full real flow end-to-end (upload → analyze → ideas → script →
   settings → generate → result) to validate everything from both sessions
   against the live Gemini/OpenRouter APIs at once.
3. Resolve hosting target — needed to confirm the ffmpeg binary actually
   ships in a deployed build, not just `next dev`.
4. Resolve remaining open questions above with the project owner.
