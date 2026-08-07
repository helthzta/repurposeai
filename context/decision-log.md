<!-- Soft cap ~100 lines. Only decisions that are still ACTIVE and
contestable belong here. Anything PROMOTED or SUPERSEDED gets deleted
once the promotion/supersession is itself stable — don't let this become
a permanent record, that's what git and archive/ are for. -->

_Last updated: 2026-07-29 (later session)_

## Format

`D-0XX · <date> · <one-line decision> · STATUS`
`  Why: <reason, ≤15 words>`
`  Rejected: <alternative considered and why not, if relevant>`

Status is one of: `ACTIVE` / `SUPERSEDED by D-0YY` / `PROMOTED to <file>`.
Anything not `ACTIVE` is deletable on sight — no need to re-read it first.

## Decisions

<!-- Example:
D-001 · {{DATE}} · Use X over Y for Z · ACTIVE
  Why: simpler, no query overhead
  Rejected: Y — overkill for this case
-->

D-001 thru D-004 (2026-07-25 session: auto tone/CTA, viral-framed analysis fields, Ideas step, Original camera style) — all shipped and stable; compacted to learned-rules.md R-006–R-009 and deleted here per the ritual.

D-007 · 2026-07-29 · Rate limiting is in-memory, per-process (`src/lib/rate-limit.ts`, keyed by user/IP + route scope) · ACTIVE
  Why: no Redis/DB-backed limiter infra exists yet, and the hosting target is still unresolved (architecture.md)
  Rejected: a Postgres-backed limiter table — more correct under multi-instance hosting, but adds a migration + DB round-trip per request for what's currently a single-instance app

D-008 · 2026-07-29 · Found middleware.ts's page-level auth gate not firing in local dev (bare `/dashboard`, `/projects`, `/history`, `/credits`, `/settings` all return 200 for an unauthenticated request) — not fixed, only flagged · ACTIVE
  Why: predates this session (only `/admin`'s entry was added to `PROTECTED_PATHS`; the gating logic itself is untouched); out of scope for the feature work asked today, and no data actually leaks since every `/api/*` route independently calls `requireUser()`
  Rejected: fixing it inline — needs its own investigation (dev-server quirk vs. real gap, verify against a production build) rather than a quick patch bundled into this session's diff

D-010 · 2026-07-29 · Website content is fetched once at project creation and cached as `brand_profiles.website_summary` (raw truncated text), not re-scanned or summarized via a separate Gemini call · SUPERSEDED by D-014
  Why: keeps this a zero-extra-AI-cost feature — the existing script-writing prompts already synthesize it in context via `brandBrief()`
  Rejected: a dedicated "summarize this website" Gemini call — extra cost/latency for marginal gain over raw text within a 4000-char budget

D-011 · 2026-08-01 · 30s script generation is fully disabled (not just hidden in the UI) — `POST /api/scripts/generate` only ever writes the 15s master script now, instead of writing both and disabling one client-side · ACTIVE
  Why: the ticket's own stated motivation was cutting "unnecessary complexity/cost"; writing a 30s script nobody can select would burn a Gemini call for nothing
  Rejected: keep generating both, just disable the 30s button — technically closer to a literal "hide in UI" reading, but wastes an AI call every time

D-012 · 2026-08-01 · The public v1 API (`/api/v1/commercials`) creates a one-off, non-default `brand_profiles` row per call rather than reusing/upserting one of the caller's dashboard profiles · ACTIVE
  Why: v1's contract only ever took a bare `brand` string, no profile-selection concept — matches its existing "no human in the loop, one-shot" model (R-008) instead of redesigning the public contract
  Rejected: making v1 accept a `brandProfileId` too — bigger contract change than this ticket asked for; can be added later without breaking existing callers

D-013 · 2026-08-01 · Migration `0019`'s backfill keeps every pre-existing `brand_profiles` row as its own profile (labeled from `brand_name`, owner inherited from its project), marking only each user's most-recently-created one default — it does not consolidate a user's multiple old rows into one · ACTIVE
  Why: those rows were 1:1 with a project before this change; picking one to "win" during an automatic consolidation risks silently discarding another project's real brand data with no way for the user to notice or recover it
  Rejected: merging into a single default profile per user — reads closer to "a default brand profile" from the ticket's acceptance criteria, but destructive if any two of a user's old projects actually had different brand details

D-014 · 2026-08-01 · Website scanning (`fetchWebsiteText`) moved from project-creation time to brand-profile create/update time; supersedes D-010 · ACTIVE
  Why: brand details (including the website link) now live on the reusable brand profile, not the project — scanning has to happen wherever `website_url` is actually set/changed
  Rejected: scanning again at project-creation from the picked profile's stored `website_url` — would rescan on every project even though the profile's site hasn't changed since last scan

D-015 · 2026-08-01 · Brand logo uploads reuse the existing `/api/uploads/sign` + `/api/uploads/confirm` routes (widened to accept `brandProfileId` as an alternate scope id for `kind: "logo"`) instead of new dedicated brand-profile upload endpoints · ACTIVE
  Why: `brand-logos` bucket RLS only ever checked the first path segment (`auth.uid()`), never a project/profile relationship — the existing routes already didn't care what the second path segment meant, so widening them was a smaller, lower-risk diff than parallel new routes
  Rejected: new `/api/brand-profiles/[id]/logo` endpoints — would duplicate the sign+confirm logic that already exists and works

D-016 · 2026-08-01 · Split the unified sign-in/signup form (D-006) into two separate screens, `/login` and `/signup` · ACTIVE
  Why: explicit user request ("add a sign in and sign up screen") — overrides D-006's earlier "one form" rationale, which was itself only a default absent a stated preference
  Rejected: keeping one form with a mode toggle — closer to the old design, but the user asked for distinct screens

D-017 · 2026-08-02 · Settings page renamed to Profile with a route change (`/settings` → `/profile`, `src/app/settings` → `src/app/profile`), not just a label swap · ACTIVE
  Why: ticket said "update label, route path if needed, and any internal references" — a page now scoped to personal info + brand profiles reads as stale under a `/settings` URL
  Rejected: keeping the `/settings` URL and only renaming the nav label — smaller diff, but leaves a mismatched route for what's now a profile hub

D-018 · 2026-08-02 · Theme/Language/Notifications removed from Profile: `profiles.theme`/`locale`/`notify_on_completion` dropped via a real migration (`0020`, written but not yet applied), and `avatar_url` added to `/api/profile`'s `EDITABLE_FIELDS` as a plain URL input (no new upload endpoint) · ACTIVE
  Why: these were being actively removed as a feature (not deprioritized data), so the `0018` chaining-column-drop precedent applies, not R-005's "leave column unused" one (that was for data that might still be reused). Avatar reuses the existing plain-URL-field pattern (like `website_url`) instead of building dedicated avatar upload/storage infra for one field
  Rejected: leaving `theme`/`locale`/`notify_on_completion` as unused columns (R-005's usual pattern) — doesn't fit here since the feature itself, not just its usage, is gone; a dedicated avatar upload endpoint — more correct long-term but disproportionate for a field with no other consumer yet

D-019 · 2026-08-07 · Add/Edit brand profile dialog drops the Website Link input, replaced with multi-image "Brand Context Images" upload (`brand_profiles.context_image_paths text[]`, migration `0022`); backend `website_url`/`website_summary` columns and route logic (POST/PATCH `/api/brand-profiles*`) are left untouched, just no longer reachable from this UI · ACTIVE
  Why: explicit user request ("add images instead of the website link"); backend left live rather than deleted since existing profiles still carry real `website_summary` data that `brandBrief()` still reads (R-005 pattern), and it's a smaller, reversible diff
  Rejected: dropping `website_url`/`website_summary` entirely — destructive to existing rows for no functional gain, this was a UI-surface change not a "kill the feature" one (contrast D-018, where the feature itself was being removed)
  Implementation: uploads go through the existing `/api/uploads/sign`+`/api/uploads/confirm` pair widened with `kind: "context_image"` (reuses the public `brand-logos` bucket, same RLS reasoning as R-018); confirm appends to the array (read-modify-write, single-user low-concurrency), the dialog's own removal-before-save goes through `PATCH .../[id]` with a full-array replace. Gemini script-writing calls attach up to 5 context images as extra image Parts (`brandContextImageParts()` in `gemini.ts`, capped — see its ponytail comment), alongside the existing logo Part (R-038); `brandBrief()` in `prompts.ts` gained a matching text line, same "must stay in sync with what was actually attached" rule as the logo line.

D-020 · 2026-08-07 · The brand logo is now sent to Seedance (via OpenRouter) as an actual `input_references` reference image on `POST /videos`, not just described in the text prompt · ACTIVE
  Why: the FINAL FRAME's on-screen logo was previously grounded in the real logo only for the *script text* (R-038, via Gemini's image Part) — the video-generation call itself (`generation.ts` → `seedance.ts`) never received the image, so Seedance had nothing but Gemini's text description to work from; OpenRouter's video API supports exactly this via `input_references` (confirmed against its docs — bytedance/seedance-2.0-fast explicitly supports "multimodal reference-to-video")
  Rejected: `frame_images` (first/last-frame control) — that pins an exact frame, wrong shape for "use this logo somewhere in the video," `input_references` is the documented fit for style/content guidance
  Implementation: `VideoProvider.SubmitParams` gained `referenceImageUrls?: string[]`; `generation.ts` builds the logo's public URL via the new `publicStorageUrl()` helper (`storage.ts`, also now used by `gemini.ts`'s logo/context-image fetch, replacing its inline URL string) and passes it through only when `brand.logo_path` is set. `higgsfield.ts`'s stub is unaffected (throws regardless of params).
