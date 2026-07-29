<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-07-29 (later session)_

## Status

Prior session (same day) shipped a large 7-part goal — logo upload, API
section removal, Projects/History split, username-based identity, rate
limiting, admin dashboard. See prior entries in `decision-log.md`
(D-005–D-008) and `learned-rules.md` (R-006–R-012); not re-summarized here.

This session added a smaller 3-part goal, all shipped:

1. **Video Link** — the Upload step's dropzone now has an "Upload File" /
   "Paste Link" toggle for the competitor ad (mutually exclusive — switching
   modes clears the other's state, per a follow-up instruction that moved
   this off the Brand Information card and made it a true either/or). New
   `/api/uploads/from-link` route fetches the video server-side and lands it
   in `source-videos` exactly like a file upload would (D-009).
2. **Website Link** — new optional field in Brand Information. Fetched
   once at project creation (`src/lib/website.ts` → `fetchWebsiteText`,
   best-effort, stripped/truncated HTML text, never blocks or fails project
   creation on a dead site) and stored as `brand_profiles.website_summary`.
   Fed into every script-writing prompt via `brandBrief()` in
   `src/lib/ai/prompts.ts` (D-010) — so ideas, master scripts, and the v1
   API's synchronous script generation all pick it up automatically.
3. **Regenerate on the Ideas step** — `IdeaStep.tsx` now has a "Don't like
   these? Regenerate" button that re-calls `/api/scripts/ideas` (that route
   was never doing its own caching — only the component's initial-mount
   effect was — so a fresh call always returns a fresh set of 3 concepts).

Migration `0017_brand_website.sql` (adds `brand_profiles.website_url` +
`website_summary`) is written, **not applied**, per the standing instruction
from the prior session not to run migrations. `npx tsc --noEmit` and
`npx eslint . --fix` are clean (same pre-existing warnings as before, none
new).

## Current branch

`main`. Nothing committed this session. New files:
`supabase/migrations/0017_brand_website.sql`, `src/lib/website.ts`,
`src/app/api/uploads/from-link/route.ts`. Edits: `src/lib/types.ts`
(`BrandProfile.website_url`/`website_summary`), `src/app/api/projects/route.ts`
(fetches + stores website text on create), `src/app/api/projects/[id]/duplicate/route.ts`
(copies the new fields), `src/lib/ai/prompts.ts` (`brandBrief` includes
website content), `src/components/workflow/UploadStep.tsx` (Video Link +
Website Link fields, link-based upload path), `src/components/workflow/IdeaStep.tsx`
(Regenerate button).

## Half-done / needs manual follow-up

- **Migrations `0012` through `0017` still need applying**, in order, to the
  live Supabase project — nothing analysis/generation/username/admin/
  website-related works until they are (see prior session's note on
  `0016`/admin too).
- None of this session's changes have been exercised against live Gemini or
  a real website — `fetchWebsiteText`'s HTML-stripping is best-effort
  (regex-based, no real HTML parser) and untested against a real page;
  worth a sanity check once `0017` is applied.
- The `middleware.ts` page-level auth-gating gap found last session (D-008)
  is still unresolved — not touched this session either.

## First action next session

1. Apply migrations `0012` through `0017` to the live Supabase project, in
   order.
2. Run one real flow that exercises both new inputs: start a project with a
   Video Link instead of a file upload, and a real Website Link, then check
   the generated ideas/script actually reference something from the site.
3. On the Ideas step, hit Regenerate and confirm a genuinely different set
   of 3 concepts comes back.

## Blockers

Migrations unapplied (by standing instruction), no live test run yet.
