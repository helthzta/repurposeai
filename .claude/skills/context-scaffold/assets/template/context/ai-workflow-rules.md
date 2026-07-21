# AI Workflow Rules

## Approach

This project is built incrementally using a spec-driven workflow. The
files in `context/` define what to build, how to build it, where we are,
and what is non-negotiable. Implement against these specs — never infer
or invent behaviour. See `context/INDEX.md` for the reading order.

## Branch model

{{Fill in during bootstrap — e.g.:}}
- `main` — production, only updated via PR from `staging`.
- `staging` — integration.
- `{{dev/develop}}` — active development trunk.
- `feature/*`, `fix/*`, `update/*` — short-lived branches, one unit of
  work each, prefix signals intent.

Never commit directly to protected branches. Always PR from a feature
branch.

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

<!-- Fill in during bootstrap: generated code, vendor primitives,
anything that must never be hand-edited. -->
- {{path}} — {{why protected, what to do instead}}

## Before moving to the next unit

1. Current unit works end to end within scope, including unhappy paths.
2. No invariant in `architecture.md` violated.
3. No regression against `security-context.md`.
4. `progress-tracker.md` reflects completed work and next step.
5. `{{verification command}}` passes.

## Definition of done — per unit type

| Unit type | Done when |
|---|---|
| {{New page/route}} | {{criteria}} |
| {{New service/endpoint}} | {{criteria}} |
| {{Schema change}} | {{criteria}} |
| {{Security fix}} | one finding per PR, verified manually, marked resolved |
