<!-- Overwrite this entire file at the end of every session. Do not append —
replace. One current snapshot of where work stands right now. -->

_Last updated: 2026-08-11_

## Status

User asked to smoke-test brand image handling on add/update, and confirm
brand edit works from both the dashboard and the Profile section. This
was the standing "not yet click-tested" item from the 2026-08-08 session
(whose three changes — brand context images, logo→Seedance, website-scan
removal — are now committed on `main`: `1071ed6`, `0375998`, `723c3d3`,
`39e3b11`).

**Approach taken:** user explicitly declined browser automation
("no playwright, pure smoke testing"), so this was an API-level smoke
test instead of a click-through. Confirmed `BrandProfileDialog.tsx` is
literally the same component used by both `/profile`
(`profile-client.tsx`) and the dashboard Upload step
(`UploadStep.tsx:250`) — no surface-specific logic exists in either
call site beyond how they refetch their own local list — so exercising
the API contract once covers both.

Built a disposable-user smoke test (`learned-rules.md` R-043 documents
the technique for reuse): service-role-created throwaway Supabase user,
signed in for a real session, hand-built the `sb-<ref>-auth-token`
cookie `@supabase/ssr` expects, then drove the real routes with `fetch`
exactly as `BrandProfileDialog.tsx` does — create, logo upload, two
context-image uploads (confirmed append not replace), PATCH edit
(label/brand name + drop one context image via full-array replace),
logo replace (confirmed overwrite not append), then a final GET
confirming persisted state, plus a live fetch of the public logo URL.
**All 21 checks passed.** Test user, its `brand_profiles` row, and all 4
uploaded storage files were deleted afterward and verified gone via a
service-role storage listing (a first cleanup pass missed the storage
files — DB row/user delete alone doesn't remove them, see R-043).

Also re-checked middleware auth gating (`/dashboard`, `/projects`,
`/history`, `/credits`, `/profile`) while doing this — all now correctly
redirect an unauthenticated request to `/login`. This resolves D-008
(open since 2026-07-29), likely fixed incidentally by the `src/`
middleware relocation (R-036). Decision log/learned-rules updated
accordingly (D-008, D-019, D-020, D-021 compacted/removed; R-039–R-042
added).

## Current branch

`main`, working tree clean (`git status` confirmed) — this session made
no source changes, only ran a temporary script from a scratch path (never
committed, deleted after use) and updated `context/` files.

## Half-done / needs manual follow-up

- **Still not visually verified**: the dialog's actual pixels/click
  targets in a real browser (this session proved the API/data layer
  works, not the UI rendering itself), and a real Seedance generation's
  FINAL FRAME against a real logo (D-020's original ask, still only
  code+API verified).
- Carried over, still unverified: Language/Subtitles controls in the
  Script step (from 2026-08-04).

## First action next session

1. If a visual/pixel-level check of the Add/Edit dialog is still wanted,
   that needs actual browser driving (chromium-cli or similar) — this
   session's user explicitly opted for API-level testing instead.
2. Run one real generation for a brand with a logo set; check the
   completed video's FINAL FRAME uses the real logo, not an invented one.
3. Click through Language/Subtitles controls (2026-08-04 carryover).
4. Resolve hosting target (D-007) — still open.

## Blockers

None.
