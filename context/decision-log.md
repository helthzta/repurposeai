<!-- Soft cap ~100 lines. Only decisions that are still ACTIVE and
contestable belong here. Anything PROMOTED or SUPERSEDED gets deleted
once the promotion/supersession is itself stable — don't let this become
a permanent record, that's what git and archive/ are for. -->

_Last updated: 2026-08-12_

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

D-014 · 2026-08-01 · Website scanning (`fetchWebsiteText`) moved from project-creation time to brand-profile create/update time; supersedes D-010 · SUPERSEDED by D-021 (website scanning removed entirely 2026-08-08)

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

D-022 · 2026-08-12 · 15s generations now cost fewer credits than 30s at the same quality tier (`CREDIT_RATE_15S` in `src/lib/credits.ts`, ~0.4x the 30s per-second rate) instead of keeping one flat duration×quality rate · ACTIVE
  Why: explicit user call after being shown real numbers — seedance-2.0-fast (now the 15s model, D-023-adjacent model-routing change) runs ~$0.04/s on OpenRouter vs seedance-2.5's ~$0.10/s for 30s, user wanted the discount to actually reflect that
  Rejected: leaving the rate flat — simpler, and the app never passed through raw provider cost 1:1 anyway, but user explicitly asked for the split
D-023 · 2026-08-12 · Custom plan's "Contact Us" is a real feature — `contact_submissions` table, public `POST /api/contact`, `/contact` page, and an admin-dashboard section to view/mark-responded — not a mailto link or a toast · ACTIVE
  Why: explicit user request ("hook it into the database and also in the admin portal") after being told no contact page/support email existed yet
  Rejected: mailto: placeholder or keeping the existing toast-only pattern — both were offered and declined
D-024 · 2026-08-12 · "Enterprise" plan renamed to "Custom" all the way through, including `profiles.plan`'s DB check constraint and existing rows (migration `0027`), not just the UI label · ACTIVE
  Why: spec explicitly said "rename, don't just relabel if pricing/credit fields exist for it"; no code path was found that ever set `plan` to anything but the signup default, so this was low-risk
  Rejected: leaving `enterprise` as an allowed-but-unused DB value and only changing what's displayed — cheaper, but leaves a real rename half-done at the schema layer
D-025 · 2026-08-12 · 15s generations do NOT regain real image-conditioned logo grounding even though they now route to seedance-2.0-fast, which (per the existing code comment) supports `input_references` unlike 2.5 · ACTIVE
  Why: the video-model-routing spec was scoped to model selection only; restoring image conditioning is a real behavior change (visual output, another aspect-ratio-conflict risk to re-verify) that deserves its own decision, not a byproduct of a routing change — flagged inline in `seedance.ts` instead
  Rejected: wiring it up now since the capability is technically already there — rejected on scope-discipline grounds, not a technical blocker

