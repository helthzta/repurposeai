<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-08-04_

## Status

This session hardened the script-generation pipeline across 4 related
tickets, all code-complete and each functionally verified against the
real Gemini API (not just code review) except where the daily API quota
ran out (see Blockers):

1. **Custom idea entry point.** `IdeaStep.tsx` got an "Add Your Own Idea"
   inline form — submits through the exact same `chooseIdea()` →
   `/api/scripts/generate` path an AI-pitched idea uses. Dead orphaned
   `CustomIdeaDialog.tsx` (unused alternate implementation) deleted.
2. **First-time generation now matches Regenerate's format.** Both
   `/api/scripts/generate` and `/api/scripts/[id]/regenerate` now call one
   shared `writeScript()` (`src/lib/scripts.ts`) — no more drift between
   two prompt call sites. See R-031.
3. **Language (English/Bengali/Hindi) + Subtitles controls** on
   `ScriptStep.tsx`, wired to `/api/scripts/[id]/regenerate` via the same
   `writeScript()`. Required a new `scripts.subtitles` column — migration
   `0021_script_subtitles.sql`, applied live via Supabase MCP.
4. **Fixed a real bug found during this session's own live verification:**
   `masterScriptPrompt`'s language instruction was vague ("write every
   spoken line... in X"), so `title`/`hook`/the body's header line stayed
   in English even when `cta`/`scene_descriptions`/dialogue correctly
   translated — because the body header line was a literal
   `${idea.title.toUpperCase()} – ${idea.hook.toUpperCase()}` string
   interpolation of the (English) original idea, not model-generated.
   Fixed in `src/lib/ai/prompts.ts`: the instruction now names every
   field that must translate (`title`, `hook`, `cta`,
   `scene_descriptions`, `emotional_direction`, body DIALOGUE/SUBTITLE
   lines) and explicitly carves out what stays English (structural
   labels, camera/blocking directions — director's notes, not
   viewer-facing text); the header line is now model-written instead of
   hardcoded. Live-verified for Bengali: `title`, `hook`, `cta`,
   `scene_descriptions`, and the body header line all came back correctly
   in Bengali script this time. See R-033.

**Also discovered (not a code bug, flagging for awareness):** the
project's Gemini API key is on the **free tier, hard-capped at 20
requests/day** for whichever model `GEMINI_MODEL` points to. Hit this
twice during this session's live-verification testing (429
`RESOURCE_EXHAUSTED`). From the app's perspective this looks like a
silently failed/stuck generate-or-regenerate, not an obvious quota
message — worth checking this first if a user reports generation "not
working" with no other symptom. See R-034. No code fix exists; needs a
paid tier or the daily reset.

## Current branch

`main`, 1 commit ahead of `origin/main` (`a651326`), not pushed. Working
tree: `src/lib/ai/prompts.ts` modified (ticket 4's fix, uncommitted),
`CustomIdeaDialog.tsx` deleted (uncommitted), `tsconfig.tsbuildinfo`
touched by repeated `tsc --noEmit` runs (harmless), `supabase/migrations/
0021_script_subtitles.sql` new and untracked (applied to the live DB, not
yet committed). All temp verification scripts (`src/_verify-*.ts`) were
deleted after use — none left in the tree.

## Half-done / needs manual follow-up

- Ticket 4's fix (R-033) is live-verified for **Bengali only** — a Hindi
  re-check got blocked by the Gemini daily quota (R-034) mid-session.
  Same code path already proven correct for Hindi's *structure* pre-fix
  and for Bengali's *field translation* post-fix, so risk is low, but do
  a live Hindi check once quota resets to be thorough.
- None of this session's UI (custom idea form, language/subtitle
  controls) has been clicked through in an actual browser yet — all
  verification was server-side, direct calls to the real pipeline/API.
  Low risk (the UI code is straightforward prop-drilling to fetch calls
  already proven correct) but still worth a real click-through.
- `supabase/migrations/0021_script_subtitles.sql` is live on the DB but
  not committed to git yet.

## First action next session

1. Check whether the Gemini daily quota has reset; if so, live-verify
   Hindi the same way Bengali was verified (title/hook/header translate
   correctly, structure markers intact).
2. Click through the full flow in an actual browser: pick/type an idea →
   confirm structured script → switch Language to Bengali or Hindi →
   confirm the editor shows a properly translated script, no English
   leftovers in title/hook/header → toggle Subtitles off → confirm no
   SUBTITLE lines.
3. If the user wants this committed: `src/lib/ai/prompts.ts`, the
   `CustomIdeaDialog.tsx` deletion, and the new migration file are all
   pending — ask before staging/pushing.

## Blockers

None code-side — all 4 tickets are code-complete. The only real blocker
is external: the Gemini free-tier daily quota (R-034), which prevented a
live Hindi re-check of ticket 4's fix this session.
