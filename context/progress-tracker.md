<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-08-04_

## Current phase

Latest session (2026-08-04): two tickets.

1. **Custom idea entry point.** `IdeaStep.tsx` got an "Add Your Own Idea"
   inline form (dashed card below the 3 AI concepts) — submitting builds a
   `{ style: "custom", title: "Your Idea", hook: pitch, pitch }` `ScriptIdea`
   and calls the exact same `chooseIdea()` → `/api/scripts/generate` path an
   AI-pitched idea uses. Only `data.scripts` is ever rendered — no
   prompt/debug leakage. A dead orphaned `CustomIdeaDialog.tsx` (an unused
   alternate dialog-based implementation, never imported) was deleted.
2. **Bug fix: first-time script generation didn't match Regenerate's
   format.** Root cause: `/api/scripts/generate/route.ts` called
   `generateMasterScript`/`masterScriptPrompt` directly with its own
   inline analysis/brand fetch, while a separate regenerate path used a
   different helper — the two could drift. Fixed by consolidating both
   into one shared `writeScript()` (`src/lib/scripts.ts`), used by both
   `/api/scripts/generate` (first-time, called from `IdeaStep`) and the new
   `/api/scripts/[id]/regenerate` (plain "Regenerate" in `ScriptEditor.tsx`,
   and language/subtitle changes in `ScriptStep.tsx`) — see R-031. Added
   `scripts.language`/`scripts.subtitles` support end-to-end (migration
   `0021_script_subtitles.sql`, applied live via Supabase MCP this session).
3. **Language/Subtitles controls on the Script step** (this was built as
   part of ticket 2's plumbing, then explicitly re-requested and verified
   as its own ticket): `ScriptStep.tsx` shows a Language `Select`
   (English/Bengali/Hindi, `SCRIPT_LANGUAGE_LABELS`) and a Subtitles
   `Switch`, both directly under the length-picker, always visible once
   scripts exist. Either control calls `updateSettings()` →
   `POST /api/scripts/[id]/regenerate` → the same `writeScript()` used
   everywhere else — no separate translation path. Live-verified with a
   real `language: "bn", subtitles: false` call against the real Gemini
   API: response had all 10 structure markers, `generated.language ===
   "bn"`, the body actually contained Bengali-script characters, and zero
   `SUBTITLE:` lines (subtitles=false honored). Only `data.script.body`
   is ever rendered — no prompt/system-instruction leakage.

**All migrations `0001`–`0021` are applied to the live Supabase project**
(confirmed via `list_migrations` + a direct `information_schema.columns`
check on `scripts.subtitles`). Schema is fully current, nothing pending.

## In progress

- None. `npx tsc --noEmit` and `npx eslint` (targeted at every file touched
  this session) pass. `next build` is intentionally no longer run for
  verification (see R-028). **Functionally verified against the real
  pipeline** (not just code review): ran `writeScript()` twice against a
  real project (FastGrocery, `55865dbc-…`) through the actual Gemini API —
  once simulating first-time generation, once simulating a regenerate's
  reconstructed idea — and confirmed both outputs contain all 10
  structural markers (CONTINUITY LOCK, SCENE 1, CAMERA/ACTION/DIALOGUE,
  LIP-SYNC RULE, MANDATORY CONTINUITY FRAME, END FRAME LOCK, FINAL FRAME,
  VIDEO STYLE). Verification script was a temp file (`src/_verify-
  writescript.ts`), deleted after use, not committed. Still not clicked
  through in an actual browser tab — low-value at this point since the
  underlying server function is now proven correct and it's the one and
  only thing both UI paths call.

## Open questions

- `middleware.ts`'s page-level auth gate still appears not to fire for bare
  protected paths in local dev (D-008) — still unresolved, needs a decision.
- Migration history bookkeeping drift (`0012`–`0017` untracked) — see
  `learned-rules.md` R-024, not yet reconciled.
- Is Veo still a planned third video provider? (`project-overview.md`)
- Is there a deploy target/hosting provider yet? (D-007)
- Are tests planned? No test runner/config exists yet.
- Avatar is currently a raw URL field (D-018) — revisit if users actually
  need to upload a photo file instead of linking one.

## Next steps (max ~5)

1. Click through the Language/Subtitles controls in an actual browser tab
   at least once (functionally verified server-side already — see above —
   this is just UI polish confirmation, not load-bearing).
2. Decide on the middleware auth-gating finding (D-008).
3. Resolve hosting target.
