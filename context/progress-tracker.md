<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-08-02_

## Current phase

Core pipeline fully implemented. This session shipped 3 UI/UX tickets plus
follow-ups found while live-testing them: polished the Add/Edit Brand modal
(inline validation), renamed Settings → Profile (removed Theme/Language/
Notifications end to end, incl. DB columns), fixed Download buttons to
actually download instead of opening the CDN link, added real captured-
frame video thumbnails (`VideoThumbnail.tsx`), found and fixed a real bug
where `generations.output_url` was never signed server-side (so every
project/video list showed no thumbnail and a disabled Download — see
R-027), and — per explicit follow-up requests — replaced the "View Result"
popup with an always-visible inline result panel (video, Download,
Prompt Used, Script Used, AI Insights) on `/projects/[id]`, then fixed that
panel's Download button (was stretching to the video's full height).

**All migrations `0001`–`0020` are applied to the live Supabase project**
(`0020` applied this session via the Supabase MCP once it became
available — confirmed via `list_migrations`/`list_tables`). Schema is fully
current, nothing pending.

## In progress

- None. `npx tsc --noEmit` and `npm run lint` pass. `next build` is
  intentionally no longer run for verification (see R-028) — the user's
  live dev server should pick up all changes via hot reload; not yet
  visually re-confirmed in the browser this session past the last
  screenshot (which was the Download-button layout bug, now fixed).

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

1. Live-confirm in the browser: `/projects` thumbnails render and Download
   works; `/projects/[id]`'s inline result panel looks right (Download
   button no longer oversized) and shows correct prompt/script/AI Insights.
2. Load `/profile`: confirm nav says "Profile", personal info saves, brand
   profile add/edit still works pre-filled.
3. Decide on the middleware auth-gating finding (D-008).
4. Resolve hosting target.
