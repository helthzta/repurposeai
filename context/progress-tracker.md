<!-- Soft cap ~50 lines. Completed work lives in git history, not here.
Compact at the end of every session per CLAUDE.md ritual. -->

_Last updated: 2026-08-12_

## Current phase

2026-08-12 session — implemented the 4-part feature update spec (video model
routing, payment plans, Help legal links, Hinglish script language), in
scope order:

1. **Video model routing**: `seedance.ts`'s `modelFor(durationSeconds)` now
   picks `bytedance/seedance-2.0-fast` for 15s, `bytedance/seedance-2.5` for
   30s (was one hardcoded constant for both). Paired with a credit-rate
   change (D-022, explicit user call): `costFor()` now uses a separate,
   ~0.4x-lower per-second rate for 15s, reflecting the real ~2.5x OpenRouter
   cost gap between the two models. Help FAQ's stale credit-cost copy fixed
   to match. Flagged, not changed (D-025): 2.0-fast supports
   `input_references` (real logo image grounding) unlike 2.5, but restoring
   that for 15s clips was left as an explicit open item, not bundled in.
2. **Hinglish script language**: added to `ScriptLanguage`/
   `SCRIPT_LANGUAGE_LABELS` (`types.ts`) — dropdown picks it up automatically,
   no `ScriptStep.tsx` change needed. `masterScriptPrompt` gained a dedicated
   `languageInstruction()` branch (Latin-script code-mixing rules, casual
   tone) instead of the generic "write in X" template, which would've just
   produced plain English or Hindi.
3. **Contact Us feature (D-023, scope-expanded per explicit user request)**:
   new `contact_submissions` table (migration `0026`, RLS enabled/no
   policies — service-role-only access, R-046), public `POST /api/contact`,
   admin `GET`/`PATCH /api/admin/contact-submissions[/[id]]`, a public
   `/contact` page (`?plan=` prefill), and a new admin-dashboard section
   (list + mark responded/new). Credits page's "Buy more" and Help's
   "Contact support" now link here instead of firing a toast.
4. **Payment plans**: Starter (350cr/$19), Pro (700cr/$39), Custom (no
   price/credits, "Contact Us" → `/contact?plan=Custom`, no checkout
   attempt) replace the old Starter/Pro/Enterprise in `credits-client.tsx`.
   `profiles.plan`'s DB check constraint and existing rows renamed
   `enterprise` → `custom` (migration `0027`, D-024) — confirmed via the
   live constraint definition, not assumed from the source migration file
   (R-045), since migration history has known drift (R-024).
5. **Help section**: added Terms of Condition / Privacy Policy / Copyright
   Policy links (real pages already existed from the 2026-08-11 legal-docs
   commit, not placeholders — nothing to flag there).

**Flagged, not built**: no Razorpay/payment-gateway integration exists
anywhere in this codebase (confirmed via `SETUP.md`, "not included by
design") — Starter/Pro "Choose" buttons are still informational only
(toast pointing to `/contact`), same as before this session. Real checkout
would be new infrastructure, not a config/logic update, and wasn't asked
for explicitly.

All migrations applied live via Supabase MCP against `xxitlqjgmfqxesqiuouk`.
`npm run lint` clean (0 errors from this session's files); `tsc --noEmit`
reproduces the same pre-existing stale-`.next`-cache errors as `main` before
this session (confirmed via `git stash` A/B) — nothing new introduced.

## Open questions

- Migration history bookkeeping drift (`0012`–`0017`, `0022`/`0023` under
  different names, `0025`, `0026`/`0027` — R-024/R-045; live schema is the
  source of truth, not `list_migrations`).
- Is Veo still a planned third video provider? (`project-overview.md`)
- Is there a deploy target/hosting provider yet? (D-007)
- Are tests planned? No test runner/config exists yet.
- Should Starter/Pro get a real checkout flow (Razorpay or otherwise)? No
  payment gateway exists in the codebase at all today.
- Should 15s generations regain real logo-image grounding via
  `input_references` now that they route to seedance-2.0-fast? (D-025)

## Next steps (max ~5)

1. Click through this session's new UI live in a browser: `/contact` (both
   the direct and `?plan=Custom` prefilled paths), the Help section's three
   legal links, the Credits page's three plan cards, and the admin
   dashboard's new Contact submissions table + mark-responded toggle.
2. Run one real 15s generation and confirm it actually calls
   seedance-2.0-fast (not just code review) — check OpenRouter's job
   response/logs for the model id.
3. Generate a script in Hinglish and eyeball the output for genuine
   code-mixing (not plain English/Hindi) — no live verification done yet,
   same Gemini-quota caution as R-034.
4. Resolve hosting target (D-007).
