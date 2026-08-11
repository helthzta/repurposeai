<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-08-11_

## Current phase

2026-08-11 session, in order:

1. **Smoke-tested brand image add/edit** (API-level, disposable Supabase
   user, no browser — technique documented in `learned-rules.md` R-043)
   against `/api/brand-profiles` + `/api/uploads/sign`+`confirm`. All 21
   checks passed; `BrandProfileDialog.tsx` is shared verbatim between
   `/profile` and the dashboard Upload step so this covers both surfaces
   (R-039). Also re-verified middleware auth gating — resolved D-008.
2. **Brand Colors field redesigned**: free-text comma-separated hex input
   replaced with a swatch picker in `BrandProfileDialog.tsx` — native
   `<input type="color">` per chip (no new dependency) plus an editable
   hex text field per swatch, capped at 6, `brandColors` state is now
   `string[]` not a joined string. Legacy non-hex values render as a "?"
   chip instead of crashing.
3. **Bug fix**: the "add a color" control originally wrote every
   intermediate `onChange` tick (fires continuously while dragging the OS
   color wheel, not just on release) straight into `brandColors` — one
   drag silently added colors until hitting the cap ("scroll it and 6
   colors get selected"). Fixed by staging in local `draftHex`; nothing
   commits until the explicit **Add** button/Enter (`handleDraftColorSubmit`).
4. **Removed `MOCK_PROVIDERS` entirely** (explicit user request, "not
   needed") — `SeedanceProvider.mocked` getter and both `if (this.mocked)`
   short-circuits deleted from `src/lib/providers/seedance.ts`; env var
   dropped from `.env.example`, the user's own `.env`, and `SETUP.md`
   (both the step-5 prose and the env-var table, `MUAPI_API_KEY` now
   marked `yes`/required since nothing can stand in for it anymore).

All of the above: `npm run lint` + targeted `tsc --noEmit` clean. Payload
shape to `/api/brand-profiles` unchanged throughout, so #2/#3 needed no
further backend verification beyond #1's smoke test.

5. **Post-login redirect changed from `/dashboard` to `/profile`**
   (explicit request). Three sites, all same-session, user confirmed via
   `AskUserQuestion` that the shared OAuth callback should move too:
   `login-client.tsx`'s post-`signInWithPassword` `router.push`,
   `login/page.tsx`'s server-side "already signed in" `redirect()`, and
   `auth/callback/route.ts`'s post-OAuth-exchange `NextResponse.redirect`
   (shared by both Login's and Signup's "Continue with Google" — Supabase
   doesn't distinguish sign-in from sign-up for OAuth, so Google signups
   now also land on `/profile`). **Signup's own email/password flow
   (`signup-client.tsx`, `signup/page.tsx`) was deliberately left on
   `/dashboard`** — out of scope, request was specifically about logging
   in. Verified the server-side piece live (disposable test user +
   authenticated `GET /login` → confirmed `307` to `/profile`); the two
   client-side `router.push` calls aren't curl-observable, verified by
   code inspection only (trivial same-pattern string change).

## Open questions

- Migration history bookkeeping drift (`0012`–`0017` untracked, R-024).
- Is Veo still a planned third video provider? (`project-overview.md`)
- Is there a deploy target/hosting provider yet? (D-007)
- Are tests planned? No test runner/config exists yet.
- Hindi title/hook/header translation still not live-verified (blocked on
  Gemini daily quota, R-034).
- Still not visually confirmed in a real browser: the Add/Edit brand
  dialog's actual pixels/click targets (incl. today's color-picker
  redesign), and a real Seedance generation's FINAL FRAME against a real
  logo (D-020's original ask, code+API review only so far).

## Next steps (max ~5)

1. Click through Language/Subtitles controls in an actual browser tab
   (carried over from 2026-08-04, still unverified).
2. Resolve hosting target (D-007).
3. Run one real end-to-end generation for a brand with a logo set and
   check the completed video's FINAL FRAME against the real logo.
