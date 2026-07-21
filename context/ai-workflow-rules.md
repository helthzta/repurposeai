# AI Workflow Rules

## Approach

This project is built incrementally using a spec-driven workflow. The
files in `context/` define what to build, how to build it, where we are,
and what is non-negotiable. Implement against these specs — never infer
or invent behaviour. See `context/INDEX.md` for the reading order.

## Branch model

Only `main` exists today (no `staging`/`develop`, no feature-branch history
found in `git log`). The repo is Lovable-connected (see `AGENTS.md`) —
avoid rewriting published history (force-push, rebase/amend/squash of
pushed commits) since that breaks Lovable's sync.

{{TODO: confirm with a human — is there an intended feature-branch workflow,
or is direct-to-main the deliberate model while this stays Lovable-synced?}}

## Scoping rules

- One feature unit at a time — verifiable end to end in a single pass.
- Don't combine unrelated system boundaries in one step (UI change +
  new backend endpoint + migration = split into separate commits/PRs
  unless tightly coupled).
- If a change can't be verified end to end in one session, it's too big
  — split it.

## Handling missing requirements

- Don't invent product behaviour not defined in the context files.
- Ambiguous requirement → resolve by updating the relevant context file
  before implementing.
- Missing requirement → add as an open question in
  `progress-tracker.md` before continuing.

## Protected files

- `src/components/ui/*` — shadcn/ui generated primitives. Extend via
  props/variants, don't hand-edit behavior in place; regenerate via shadcn
  CLI instead if the primitive itself needs to change.
- `supabase/migrations/*.sql` — never edit an already-applied migration;
  add a new numbered migration instead (Postgres migration convention).

## Before moving to the next unit

1. Current unit works end to end within scope, including unhappy paths.
2. No invariant in `architecture.md` violated.
3. No regression against `security-context.md`.
4. `progress-tracker.md` reflects completed work and next step.
5. `npm run lint` passes (no test command exists yet — see `code-standards.md`).

## Definition of done — per unit type

| Unit type | Done when |
|---|---|
| New page/route | Renders/responds correctly, auth-gated per `architecture.md`'s auth model, errors logged via `logError()` |
| New service/endpoint | Delegates DB/provider calls to `src/lib/*` (not inline in the route), scoped by RLS or an explicit filter if using the admin client |
| Schema change | New migration file, RLS enabled + policy if it holds user data, `src/lib/types.ts` updated to match |
| Security fix | one finding per PR, verified manually, marked resolved |
