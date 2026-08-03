<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-08-04_

## Current phase

Latest session (2026-08-04): script-generation pipeline hardening — custom
ideas, first-time/regenerate format consistency, and Language/Subtitles
controls, all funneled through one shared `writeScript()` (`src/lib/
scripts.ts`, see R-031). Full narrative in git history / prior session
notes; what's still load-bearing:

- `masterScriptPrompt` (`src/lib/ai/prompts.ts`) had a real bug: its
  language instruction didn't name which JSON fields to translate, so
  `title`/`hook`/the body's header line stayed in English even when
  `cta`/`scene_descriptions`/dialogue correctly translated. Fixed by
  naming every field explicitly and making the body's header
  model-written instead of a literal `${idea.title}` interpolation — see
  R-033. Live-verified for Bengali: `title`, `hook`, `cta`,
  `scene_descriptions`, and the body header line all came back correctly
  in Bengali script.
- **Gemini API key is free-tier, hard-capped at 20 requests/day** for
  `GEMINI_MODEL` — hit this twice during this session's live testing
  (429 `RESOURCE_EXHAUSTED`). See R-034. If script generation/regenerate
  ever appears to silently fail or hang for the user, check this before
  assuming a prompt/code bug — it looks like a stuck/failed generation,
  not an obvious quota error, from the UI side.
- All migrations `0001`–`0021` are applied live (confirmed via
  `list_migrations` + `information_schema.columns` on `scripts.subtitles`).

## In progress

- None. `npx tsc --noEmit` + targeted `eslint` pass. `next build`
  intentionally not run (R-028). The language-field fix (R-033) is
  live-verified for Bengali only — Hindi verification hit the daily
  Gemini quota (R-034) before it could run; structurally it's the same
  code path already proven for Bengali and for Hindi pre-fix (structure
  markers), so risk is low, but worth a live Hindi check once quota
  resets.

## Open questions

- `middleware.ts`'s page-level auth gate still appears not to fire for bare
  protected paths in local dev (D-008) — still unresolved, needs a decision.
- Migration history bookkeeping drift (`0012`–`0017` untracked) — see
  `learned-rules.md` R-024, not yet reconciled.
- Is Veo still a planned third video provider? (`project-overview.md`)
- Is there a deploy target/hosting provider yet? (D-007)
- Are tests planned? No test runner/config exists yet.

## Next steps (max ~5)

1. Once the Gemini daily quota resets, live-verify Hindi title/hook/header
   translation the same way Bengali was verified this session (R-033).
2. Click through Language/Subtitles controls in an actual browser tab.
3. Decide on the middleware auth-gating finding (D-008).
4. Resolve hosting target.
