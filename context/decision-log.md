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
