<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-08-07_

## Current phase

Latest session (2026-08-07): two brand-context/video-fidelity fixes —
1. Add/Edit brand profile dialog now uploads "Brand Context Images"
   (product/packaging/mood shots, up to 5) instead of a Website Link field
   — new `brand_profiles.context_image_paths text[]` (migration `0022`,
   applied live). Uploads through the existing sign/confirm routes
   (`kind: "context_image"`, appends to the array) and get attached as
   extra Gemini image Parts in every script-writing call, alongside the
   existing logo Part. See D-019.
2. The brand logo is now passed to Seedance as an actual `input_references`
   reference image on submit (`generation.ts` → `seedance.ts`), not just
   described in the text prompt — previously only the *script text* was
   grounded in the real logo (via Gemini, R-038), the video-gen call itself
   never received the image. See D-020.

Both code-complete, `npx tsc --noEmit` + targeted `eslint` clean.
**Not yet click-tested in a real browser.**

## In progress

- None.

## Open questions

- `middleware.ts`'s page-level auth gate still appears not to fire for bare
  protected paths in local dev (D-008) — still unresolved, needs a decision.
- Migration history bookkeeping drift (`0012`–`0017` untracked) — see
  `learned-rules.md` R-024, not yet reconciled.
- Is Veo still a planned third video provider? (`project-overview.md`)
- Is there a deploy target/hosting provider yet? (D-007)
- Are tests planned? No test runner/config exists yet.
- Once the Gemini daily quota (R-034) allows it, live-verify Hindi
  title/hook/header translation the same way Bengali was verified in the
  2026-08-04 session (R-033) — still outstanding.

## Next steps (max ~5)

1. Click-test this session's two changes: add a brand with context images
   (save, edit, remove one), and run a real generation with a logo set —
   confirm the output video's FINAL FRAME actually uses the real logo.
2. Click through Language/Subtitles controls in an actual browser tab
   (carried over from 2026-08-04, still unverified).
3. Decide on the middleware auth-gating finding (D-008).
4. Resolve hosting target.
