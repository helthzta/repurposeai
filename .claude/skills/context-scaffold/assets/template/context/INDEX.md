# Context Index

One line per file: what it owns, when to read it, when it was last true.

| File | Owns | Read when | Last verified |
|---|---|---|---|
| `session-handoff.md` | current session snapshot | every session | {{DATE}} |
| `progress-tracker.md` | current phase, open questions, next steps | every session | {{DATE}} |
| `learned-rules.md` | distilled permanent constraints | every session | {{DATE}} |
| `project-overview.md` | product definition, goals, scope | scope/priority questions | {{DATE}} |
| `decision-log.md` | still-active decisions with rationale | when touching an area listed below | {{DATE}} |
| `architecture.md` | stack, boundaries, storage, invariants | touching system structure | {{DATE}} |
| `ui-context.md` | design tokens, component conventions | touching UI | {{DATE}} |
| `code-standards.md` | implementation conventions | writing/reviewing code | {{DATE}} |
| `security-context.md` | threat model, hardening rules | touching auth/data/edge functions | {{DATE}} |
| `ai-workflow-rules.md` | branching, scoping, delivery ritual | starting a new unit of work | {{DATE}} |

## Active decision areas (keeps decision-log.md from being read every session)

<!-- One line per open decision area, e.g.:
- Auth flow (D-003, D-007) — read decision-log.md if touching login/signup
-->
{{TODO: list active decision areas here, or leave empty if none yet}}

## Compaction thresholds

- `decision-log.md` soft cap: 100 lines
- `progress-tracker.md` soft cap: 50 lines
- Anything moved out goes to `archive/YYYY-MM.md`, most recent archive linked here:
  {{TODO: link once archive exists}}
