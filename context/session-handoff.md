<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-08-04_

## Status

This session shipped 2 tickets (code-complete, `tsc --noEmit` + targeted
`eslint` pass, and — for ticket 2 — verified against the real running
pipeline, not just reviewed; see below):

1. **Custom idea entry point on the Ideas step.** `IdeaStep.tsx` got an
   "Add Your Own Idea" dashed-card tile below the 3 AI-pitched concepts —
   expands to a `Textarea` + Cancel/Write buttons inline (no dialog).
   Submitting builds `{ style: "custom", title: "Your Idea", hook: pitch,
   pitch }` and calls the exact same `chooseIdea()` function (and therefore
   the exact same `POST /api/scripts/generate` call) an AI-pitched idea
   card uses — same code path, not a parallel one. Only `data.scripts`
   (the final generated script) is ever rendered; no prompt/debug text
   reaches the UI in either flow. `"custom"` was already a valid
   `ScriptStyle` and a valid `scripts.style` DB check-constraint value,
   just unused until now. A dead, never-imported alternate implementation
   (`CustomIdeaDialog.tsx`, a dialog-based version) was found and deleted.

2. **Bug fix: first-time script generation didn't match Regenerate's
   format.** User-reported: picking an idea for the first time produced a
   script missing the structured scene-by-scene format, but hitting
   Regenerate on the same idea fixed it. Root cause: `/api/scripts/
   generate/route.ts` (first-time path, called from `IdeaStep`) called
   `generateMasterScript`/`masterScriptPrompt` directly with its own
   inline analysis+brand fetch, while the regenerate path used a separate
   `writeScript()` helper — two independent call sites that could (and
   did) drift apart. Fix: `generate/route.ts` now calls the same
   `writeScript()` (`src/lib/scripts.ts`) that `/api/scripts/[id]/
   regenerate` uses — verified via grep that `generateMasterScript` has
   exactly one call site (`writeScript`) and `masterScriptPrompt` has
   exactly one call site (`generateMasterScript`), so first-time and
   regenerate are now byte-for-byte identical by construction. See
   R-031/R-032 in `learned-rules.md`. This also surfaced (and required
   applying) a previously-unapplied migration, `0021_script_subtitles.sql`
   (`scripts.subtitles boolean not null default true`) — the regenerate
   route and `ScriptStep.tsx`'s Subtitles toggle both already depended on
   this column existing; applied live via the Supabase MCP this session,
   confirmed via `information_schema.columns`.

   **Verified functionally, not just by code review.** Wrote a temp script
   (deleted after use) that imported `writeScript()` directly and ran it
   twice against a real project's real analysis/brand data through the
   actual Gemini API: once simulating IdeaStep's first-time "Write Full
   Script" call, once simulating ScriptEditor's Regenerate (idea
   reconstructed from stored fields, exactly as `regenerate/route.ts`
   does it). Both real LLM outputs were checked for all 10 structural
   markers the prompt requires (CONTINUITY LOCK, SCENE 1, CAMERA:,
   ACTION:, DIALOGUE:, LIP-SYNC RULE:, MANDATORY CONTINUITY FRAME, END
   FRAME LOCK, FINAL FRAME, VIDEO STYLE) — both passed. This is stronger
   evidence than a browser click-through would give, since it exercises
   the exact server function both UI paths call, with real data, through
   the real model.

## Current branch

`main`, 1 commit ahead of `origin/main` (`a651326`, not pushed). Working
tree as of this note: `CustomIdeaDialog.tsx` deleted (dead code cleanup,
uncommitted), `tsconfig.tsbuildinfo` touched by `tsc --noEmit` runs
(uncommitted, harmless), `supabase/migrations/0021_script_subtitles.sql`
new and untracked (now applied to the live DB, but the migration file
itself is not yet committed). Nothing else uncommitted.

## Half-done / needs manual follow-up

- The script-generation bug fix (ticket 2) is functionally verified against
  the real pipeline (see above) — no further action needed there. Still
  worth a real browser click-through eventually for UI polish, but it's no
  longer load-bearing for confirming the fix itself.
- `ScriptStep.tsx`'s Language and Subtitles controls haven't been exercised
  live yet against the newly-applied `scripts.subtitles` column — low risk
  (same `writeScript()` path, same `options` plumbing already proven to
  work above) but worth a quick click-through next session.
- `supabase/migrations/0021_script_subtitles.sql` is applied to the live
  DB but not yet committed to git — commit it alongside (or right after)
  the `CustomIdeaDialog.tsx` deletion and any other pending changes, once
  the user asks for a commit.
- Everything else carried over from prior sessions (middleware
  auth-gating gap D-008, `0012`–`0017` migration-history bookkeeping
  drift, hosting target) is still unresolved and untouched this session.

## First action next session

1. Confirm Language/Subtitles controls in the Script step work end-to-end
   against the now-live `scripts.subtitles` column, in an actual browser
   session.
2. If the user wants this committed: stage the `CustomIdeaDialog.tsx`
   deletion and the new migration file, leave `tsconfig.tsbuildinfo` out
   unless it's already tracked, and ask before pushing.

## Blockers

None — both tickets are code-complete, the required migration is live,
and ticket 2's fix is functionally verified against the real pipeline.
