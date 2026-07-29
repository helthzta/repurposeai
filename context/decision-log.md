<!-- Soft cap ~100 lines. Only decisions that are still ACTIVE and
contestable belong here. Anything PROMOTED or SUPERSEDED gets deleted
once the promotion/supersession is itself stable — don't let this become
a permanent record, that's what git and archive/ are for. -->

_Last updated: 2026-07-29_

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

D-005 · 2026-07-29 · Removed the API-keys UI (nav item, `/api` page, Settings section) but left the backend `api_keys` table/routes and `/api/v1/commercials` untouched · ACTIVE
  Why: "not needed" read as no longer wanting the integration surface *exposed*, not deleting the public API outright
  Rejected: deleting the backend entirely — bigger/riskier change than asked; nothing in the UI depended on it anyway

D-006 · 2026-07-29 · Signup now requires a username, collected in the same unified sign-in/signup form rather than a separate signup screen · ACTIVE
  Why: matches the existing "one form, auto-fallback to signup" design instead of introducing a new UX pattern
  Rejected: splitting into distinct sign-in/sign-up forms — bigger scope than asked; returning users just ignore the extra field

D-007 · 2026-07-29 · Rate limiting is in-memory, per-process (`src/lib/rate-limit.ts`, keyed by user/IP + route scope) · ACTIVE
  Why: no Redis/DB-backed limiter infra exists yet, and the hosting target is still unresolved (architecture.md)
  Rejected: a Postgres-backed limiter table — more correct under multi-instance hosting, but adds a migration + DB round-trip per request for what's currently a single-instance app

D-008 · 2026-07-29 · Found middleware.ts's page-level auth gate not firing in local dev (bare `/dashboard`, `/projects`, `/history`, `/credits`, `/settings` all return 200 for an unauthenticated request) — not fixed, only flagged · ACTIVE
  Why: predates this session (only `/admin`'s entry was added to `PROTECTED_PATHS`; the gating logic itself is untouched); out of scope for the feature work asked today, and no data actually leaks since every `/api/*` route independently calls `requireUser()`
  Rejected: fixing it inline — needs its own investigation (dev-server quirk vs. real gap, verify against a production build) rather than a quick patch bundled into this session's diff
