# Context Index

One line per file: what it owns, when to read it, when it was last true.

| File | Owns | Read when | Last verified |
|---|---|---|---|
| `session-handoff.md` | current session snapshot | every session | 2026-07-21 |
| `progress-tracker.md` | current phase, open questions, next steps | every session | 2026-07-21 |
| `learned-rules.md` | distilled permanent constraints | every session | 2026-07-21 |
| `project-overview.md` | product definition, goals, scope | scope/priority questions | 2026-07-21 |
| `decision-log.md` | still-active decisions with rationale | when touching an area listed below | 2026-07-21 |
| `architecture.md` | stack, boundaries, storage, invariants | touching system structure | 2026-07-21 |
| `ui-context.md` | design tokens, component conventions | touching UI | 2026-07-21 |
| `code-standards.md` | implementation conventions | writing/reviewing code | 2026-07-21 |
| `security-context.md` | threat model, hardening rules | touching auth/data/edge functions | 2026-07-21 |
| `ai-workflow-rules.md` | branching, scoping, delivery ritual | starting a new unit of work | 2026-07-21 |

## Active decision areas (keeps decision-log.md from being read every session)

None yet — `decision-log.md` is empty at scaffold time.

## Compaction thresholds

- `decision-log.md` soft cap: 100 lines
- `progress-tracker.md` soft cap: 50 lines
- Anything moved out goes to `archive/YYYY-MM.md`, most recent archive linked here:
  {{TODO: link once archive exists}}
