<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-08-11_

## Current phase

Same-session follow-up: `BrandProfileDialog.tsx`'s "Brand Colors" field
replaced the free-text comma-separated hex input with a swatch picker —
each color is a chip wrapping a native `<input type="color">` (OS color
picker/wheel, no new dependency), plus an "add" tile capped at 6 colors,
remove buttons per swatch, and a hex-code caption line. State is now
`string[]` (matches `brand_colors` 1:1) instead of a joined/split string.
Legacy non-hex values (e.g. old free-typed "Blue, White" rows) render as
a "?" chip defaulting the picker to a neutral blue rather than crashing —
self-heals to a real hex the next time that swatch is edited. Follow-up
in the same session: each swatch also got an inline editable hex text
field (`normalizeHex()` accepts "2563eb" or "#2563eb"), plus a
"type a hex code" input + Add button next to the picker tile for adding
a brand-new color without opening the OS picker — user asked for a hex
option alongside the wheel, not instead of it.

**Bug fix (same session, user-reported):** the "add a color" swatch
originally wired the native `<input type="color">`'s `onChange` straight
into `setBrandColors([...prev, hex])`. That event fires on *every*
intermediate tick while dragging across the OS color wheel, not once on
release — so one drag gesture silently appended colors repeatedly until
hitting the 6-color cap ("I just scroll it and it is selected 6
colors"). Fixed by staging the picked/typed value in a local `draftHex`
that only the wheel preview and hex text field touch; nothing writes to
`brandColors` until the user clicks the explicit **Add** button (or
presses Enter in the hex field) — `handleDraftColorSubmit`. Existing
saved swatches still update live while dragging (that's direct
in-place editing of one slot, not repeated appends, so it isn't the same
bug). `handleColorAdded` also switched to a functional `setBrandColors`
update with the cap check inside it, closing a latent stale-closure risk.
`npm run lint`/`tsc --noEmit` clean; payload shape to `/api/
brand-profiles` (`brandColors: string[]`) is unchanged and was already
covered by this session's earlier API-level smoke test, so no further
backend verification needed.

Prior session's three brand-context/video-fidelity changes (context images,
logo→Seedance, website-scan removal) are now committed to `main` (were
"code-complete, not click-tested" as of 2026-08-08 — see `39e3b11`,
`723c3d3`, `0375998`, `1071ed6`). This session (2026-08-11) closed that gap:
ran a full API-level smoke test (disposable Supabase user, no browser —
see `learned-rules.md` R-043) against the real `/api/brand-profiles` +
`/api/uploads/sign`+`confirm` routes, covering add, edit, logo upload,
logo replace, context-image append (x2), context-image removal via
full-array PATCH, and final-state persistence. All 21 checks passed;
`BrandProfileDialog.tsx` is shared verbatim between `/profile` and the
dashboard Upload step, so this covers both surfaces (R-039). Also
re-verified middleware auth gating on `/dashboard`, `/projects`,
`/history`, `/credits`, `/profile` — all correctly redirect to `/login`
now, resolving the D-008 open question (R-042). Test artifacts (user, DB
row, 4 storage files) fully cleaned up afterward, confirmed via
service-role listing.

## In progress

- None.

## Open questions

- Migration history bookkeeping drift (`0012`–`0017` untracked) — see
  `learned-rules.md` R-024, not yet reconciled.
- Is Veo still a planned third video provider? (`project-overview.md`)
- Is there a deploy target/hosting provider yet? (D-007)
- Are tests planned? No test runner/config exists yet.
- Once the Gemini daily quota (R-034) allows it, live-verify Hindi
  title/hook/header translation the same way Bengali was verified in the
  2026-08-04 session (R-033) — still outstanding.
- Still not visually confirmed in a real browser: the Add/Edit brand
  dialog's UI itself (this session verified the API contract it drives,
  not pixels/click targets) and a real Seedance generation's FINAL FRAME
  against a real logo (D-020's actual proof, code+API review only so far).

## Next steps (max ~5)

1. Click through Language/Subtitles controls in an actual browser tab
   (carried over from 2026-08-04, still unverified).
2. Resolve hosting target (D-007).
3. Run one real end-to-end generation for a brand with a logo set and
   check the completed video's FINAL FRAME against the real logo.
